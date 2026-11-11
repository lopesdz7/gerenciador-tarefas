import { prisma } from '../database/prisma'
import { AppError } from '../utils/app-error'
import { publicUserSelect } from './users-service'

interface TeamInput {
  name: string
  description?: string | null
}

async function findTeamOrFail(id: number) {
  const team = await prisma.team.findUnique({ where: { id } })

  if (!team) {
    throw new AppError('Time não encontrado.', 404)
  }

  return team
}

export const teamsService = {
  create(data: TeamInput) {
    return prisma.team.create({ data })
  },

  list() {
    return prisma.team.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { members: true, tasks: true } } },
    })
  },

  async update(id: number, data: Partial<TeamInput>) {
    await findTeamOrFail(id)
    return prisma.team.update({ where: { id }, data })
  },

  async delete(id: number) {
    await findTeamOrFail(id)
    await prisma.team.delete({ where: { id } })
  },

  async addMember(teamId: number, userId: number) {
    await findTeamOrFail(teamId)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError('Usuário não encontrado.', 404)
    }

    const alreadyMember = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    })
    if (alreadyMember) {
      throw new AppError('Este usuário já faz parte do time.', 409)
    }

    return prisma.teamMember.create({
      data: { teamId, userId },
      include: { user: { select: publicUserSelect } },
    })
  },

  async removeMember(teamId: number, userId: number) {
    await findTeamOrFail(teamId)

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    })
    if (!membership) {
      throw new AppError('Este usuário não faz parte do time.', 404)
    }

    await prisma.teamMember.delete({ where: { id: membership.id } })
  },

  // Admin vê qualquer time; member só vê os membros dos times em que está
  async listMembers(teamId: number, requester: { id: number; role: string }) {
    await findTeamOrFail(teamId)

    if (requester.role !== 'admin') {
      const isMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: requester.id, teamId } },
      })
      if (!isMember) {
        throw new AppError('Você não faz parte deste time.', 403)
      }
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: publicUserSelect } },
    })

    return members.map(({ user, createdAt }) => ({ ...user, joinedAt: createdAt }))
  },
}
