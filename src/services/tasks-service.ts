import type { Prisma, TaskPriority, TaskStatus } from '@prisma/client'

import { prisma } from '../database/prisma'
import { AppError } from '../utils/app-error'

interface Requester {
  id: number
  role: 'admin' | 'member'
}

interface CreateTaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  teamId: number
  assignedTo?: number | null
}

interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
}

interface ListFilters {
  status?: TaskStatus
  priority?: TaskPriority
  teamId?: number
  assignedTo?: number
}

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  team: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude

// ---------------------------------------------------------
// Helpers de permissão
// ---------------------------------------------------------
async function isTeamMember(userId: number, teamId: number) {
  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  })
  return Boolean(membership)
}

async function findTaskOrFail(id: number) {
  const task = await prisma.task.findUnique({ where: { id } })

  if (!task) {
    throw new AppError('Tarefa não encontrada.', 404)
  }

  return task
}

// Member: só enxerga tarefas dos times em que está
async function ensureCanView(task: { teamId: number }, requester: Requester) {
  if (requester.role === 'admin') return

  if (!(await isTeamMember(requester.id, task.teamId))) {
    throw new AppError('Você não tem acesso a esta tarefa.', 403)
  }
}

// Member: só altera tarefas atribuídas a ele
function ensureCanManage(task: { assignedTo: number | null }, requester: Requester) {
  if (requester.role === 'admin') return

  if (task.assignedTo !== requester.id) {
    throw new AppError('Você só pode gerenciar tarefas atribuídas a você.', 403)
  }
}

async function ensureAssigneeIsTeamMember(assignedTo: number, teamId: number) {
  const user = await prisma.user.findUnique({ where: { id: assignedTo } })
  if (!user) {
    throw new AppError('Usuário responsável não encontrado.', 404)
  }

  if (!(await isTeamMember(assignedTo, teamId))) {
    throw new AppError('O usuário responsável precisa fazer parte do time da tarefa.', 400)
  }
}

// ---------------------------------------------------------
// Service
// ---------------------------------------------------------
export const tasksService = {
  async create(input: CreateTaskInput, requester: Requester) {
    const team = await prisma.team.findUnique({ where: { id: input.teamId } })
    if (!team) {
      throw new AppError('Time não encontrado.', 404)
    }

    let assignedTo = input.assignedTo ?? null

    if (requester.role === 'member') {
      if (!(await isTeamMember(requester.id, input.teamId))) {
        throw new AppError('Você só pode criar tarefas nos times em que participa.', 403)
      }
      if (assignedTo !== null && assignedTo !== requester.id) {
        throw new AppError('Membros só podem criar tarefas atribuídas a si mesmos.', 403)
      }
      assignedTo = requester.id
    }

    if (assignedTo !== null) {
      await ensureAssigneeIsTeamMember(assignedTo, input.teamId)
    }

    return prisma.task.create({
      data: { ...input, assignedTo },
      include: taskInclude,
    })
  },

  async list(filters: ListFilters, requester: Requester) {
    const where: Prisma.TaskWhereInput = { ...filters }

    if (requester.role === 'member') {
      const memberships = await prisma.teamMember.findMany({
        where: { userId: requester.id },
        select: { teamId: true },
      })
      const teamIds = memberships.map(({ teamId }) => teamId)

      // Se pediu um time específico, ele precisa estar entre os times do membro
      where.teamId = filters.teamId
        ? teamIds.includes(filters.teamId)
          ? filters.teamId
          : -1
        : { in: teamIds }
    }

    return prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
  },

  async show(id: number, requester: Requester) {
    const task = await prisma.task.findUnique({ where: { id }, include: taskInclude })

    if (!task) {
      throw new AppError('Tarefa não encontrada.', 404)
    }

    await ensureCanView(task, requester)
    return task
  },

  async update(id: number, data: UpdateTaskInput, requester: Requester) {
    const task = await findTaskOrFail(id)
    await ensureCanView(task, requester)
    ensureCanManage(task, requester)

    const statusChanged = data.status !== undefined && data.status !== task.status

    // Atualiza a tarefa e registra o histórico na mesma transação
    const [updated] = await prisma.$transaction([
      prisma.task.update({ where: { id }, data, include: taskInclude }),
      ...(statusChanged
        ? [
            prisma.taskHistory.create({
              data: {
                taskId: id,
                changedBy: requester.id,
                oldStatus: task.status,
                newStatus: data.status as TaskStatus,
              },
            }),
          ]
        : []),
    ])

    return updated
  },

  updateStatus(id: number, status: TaskStatus, requester: Requester) {
    return this.update(id, { status }, requester)
  },

  async assign(id: number, assignedTo: number | null) {
    const task = await findTaskOrFail(id)

    if (assignedTo !== null) {
      await ensureAssigneeIsTeamMember(assignedTo, task.teamId)
    }

    return prisma.task.update({ where: { id }, data: { assignedTo }, include: taskInclude })
  },

  async delete(id: number, requester: Requester) {
    const task = await findTaskOrFail(id)
    await ensureCanView(task, requester)
    ensureCanManage(task, requester)

    await prisma.task.delete({ where: { id } })
  },

  async history(id: number, requester: Requester) {
    const task = await findTaskOrFail(id)
    await ensureCanView(task, requester)

    return prisma.taskHistory.findMany({
      where: { taskId: id },
      orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
      include: { user: { select: { id: true, name: true, email: true } } },
    })
  },
}
