import { api, createUserAndLogin, prisma, resetDatabase } from './helpers'

type Session = Awaited<ReturnType<typeof createUserAndLogin>>

describe('Tarefas', () => {
  let admin: Session
  let ana: Session // membro do time A
  let bruno: Session // membro do time A
  let carla: Session // membro só do time B
  let teamA: number
  let teamB: number
  let anaTaskId: number
  let brunoTaskId: number

  beforeAll(async () => {
    await resetDatabase()
    admin = await createUserAndLogin('admin')
    ana = await createUserAndLogin('member')
    bruno = await createUserAndLogin('member')
    carla = await createUserAndLogin('member')

    teamA = (await prisma.team.create({ data: { name: 'Time A' } })).id
    teamB = (await prisma.team.create({ data: { name: 'Time B' } })).id

    await prisma.teamMember.createMany({
      data: [
        { teamId: teamA, userId: ana.user.id },
        { teamId: teamA, userId: bruno.user.id },
        { teamId: teamB, userId: carla.user.id },
      ],
    })
  })
  afterAll(() => prisma.$disconnect())

  describe('Criação', () => {
    it('admin cria tarefa atribuída a um membro do time', async () => {
      const response = await api.post('/tasks').set('Authorization', admin.auth).send({
        title: 'Criar rota de login',
        description: 'Usar JWT',
        priority: 'high',
        teamId: teamA,
        assignedTo: ana.user.id,
      })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        title: 'Criar rota de login',
        status: 'pending',
        priority: 'high',
        teamId: teamA,
        assignedTo: ana.user.id,
      })
      anaTaskId = response.body.id
    })

    it('não atribui tarefa a quem não é do time', async () => {
      const response = await api
        .post('/tasks')
        .set('Authorization', admin.auth)
        .send({ title: 'X', teamId: teamA, assignedTo: carla.user.id })

      expect(response.status).toBe(400)
    })

    it('member cria tarefa no próprio time e ela fica atribuída a ele', async () => {
      const response = await api
        .post('/tasks')
        .set('Authorization', bruno.auth)
        .send({ title: 'Escrever testes', priority: 'low', teamId: teamA })

      expect(response.status).toBe(201)
      expect(response.body.assignedTo).toBe(bruno.user.id)
      brunoTaskId = response.body.id
    })

    it('member não cria tarefa em time do qual não participa', async () => {
      const response = await api
        .post('/tasks')
        .set('Authorization', carla.auth)
        .send({ title: 'Invasão', teamId: teamA })

      expect(response.status).toBe(403)
    })

    it('member não cria tarefa atribuída a outra pessoa', async () => {
      const response = await api
        .post('/tasks')
        .set('Authorization', bruno.auth)
        .send({ title: 'Para a Ana', teamId: teamA, assignedTo: ana.user.id })

      expect(response.status).toBe(403)
    })

    it('valida status, prioridade e campos obrigatórios', async () => {
      const response = await api
        .post('/tasks')
        .set('Authorization', admin.auth)
        .send({ title: '', status: 'feito', priority: 'urgente' })

      expect(response.status).toBe(400)
      expect(Object.keys(response.body.issues)).toEqual(
        expect.arrayContaining(['title', 'status', 'priority', 'teamId']),
      )
    })
  })

  describe('Listagem e filtros', () => {
    beforeAll(async () => {
      await prisma.task.create({ data: { title: 'Tarefa do time B', teamId: teamB } })
    })

    it('admin vê todas as tarefas', async () => {
      const response = await api.get('/tasks').set('Authorization', admin.auth)

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(3)
    })

    it('member vê apenas as tarefas dos seus times', async () => {
      const response = await api.get('/tasks').set('Authorization', ana.auth)

      expect(response.body).toHaveLength(2)
      expect(response.body.every((task: { teamId: number }) => task.teamId === teamA)).toBe(true)
    })

    it('member não vê tarefas de outro time nem pedindo pelo teamId', async () => {
      const response = await api.get(`/tasks?teamId=${teamB}`).set('Authorization', ana.auth)
      expect(response.body).toHaveLength(0)

      const single = await api.get(`/tasks/${anaTaskId}`).set('Authorization', carla.auth)
      expect(single.status).toBe(403)
    })

    it('filtra por prioridade', async () => {
      const response = await api.get('/tasks?priority=high').set('Authorization', admin.auth)

      expect(response.body).toHaveLength(1)
      expect(response.body[0].id).toBe(anaTaskId)
    })

    it('filtra por status', async () => {
      const response = await api.get('/tasks?status=completed').set('Authorization', admin.auth)
      expect(response.body).toHaveLength(0)
    })

    it('recusa filtro inválido', async () => {
      const response = await api.get('/tasks?status=qualquer').set('Authorization', admin.auth)
      expect(response.status).toBe(400)
    })
  })

  describe('Edição, status e histórico', () => {
    it('member edita a própria tarefa', async () => {
      const response = await api
        .put(`/tasks/${anaTaskId}`)
        .set('Authorization', ana.auth)
        .send({ title: 'Criar rota de login com JWT', status: 'in_progress' })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        title: 'Criar rota de login com JWT',
        status: 'in_progress',
      })
    })

    it('member não edita tarefa de outra pessoa, mesmo sendo do time', async () => {
      const response = await api
        .put(`/tasks/${anaTaskId}`)
        .set('Authorization', bruno.auth)
        .send({ title: 'Mudei' })

      expect(response.status).toBe(403)
    })

    it('altera o status pela rota PATCH /tasks/:id/status', async () => {
      const response = await api
        .patch(`/tasks/${anaTaskId}/status`)
        .set('Authorization', ana.auth)
        .send({ status: 'completed' })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('completed')
    })

    it('registra cada mudança de status no histórico', async () => {
      // Mesmo status de novo: não deve gerar histórico
      await api
        .patch(`/tasks/${anaTaskId}/status`)
        .set('Authorization', ana.auth)
        .send({ status: 'completed' })

      const response = await api.get(`/tasks/${anaTaskId}/history`).set('Authorization', bruno.auth)

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(response.body[0]).toMatchObject({
        oldStatus: 'pending',
        newStatus: 'in_progress',
        changedBy: ana.user.id,
      })
      expect(response.body[1]).toMatchObject({ oldStatus: 'in_progress', newStatus: 'completed' })
    })

    it('admin altera qualquer tarefa', async () => {
      const response = await api
        .put(`/tasks/${brunoTaskId}`)
        .set('Authorization', admin.auth)
        .send({ priority: 'medium' })

      expect(response.status).toBe(200)
      expect(response.body.priority).toBe('medium')
    })

    it('exige ao menos um campo para editar', async () => {
      const response = await api
        .put(`/tasks/${anaTaskId}`)
        .set('Authorization', admin.auth)
        .send({})
      expect(response.status).toBe(400)
    })
  })

  describe('Atribuição', () => {
    it('admin atribui a tarefa a outro membro do time', async () => {
      const response = await api
        .patch(`/tasks/${brunoTaskId}/assign`)
        .set('Authorization', admin.auth)
        .send({ assignedTo: ana.user.id })

      expect(response.status).toBe(200)
      expect(response.body.assignee).toMatchObject({ id: ana.user.id })
    })

    it('member não pode atribuir tarefas', async () => {
      const response = await api
        .patch(`/tasks/${brunoTaskId}/assign`)
        .set('Authorization', ana.auth)
        .send({ assignedTo: ana.user.id })

      expect(response.status).toBe(403)
    })
  })

  describe('Exclusão', () => {
    it('member não exclui tarefa de outra pessoa', async () => {
      const response = await api.delete(`/tasks/${anaTaskId}`).set('Authorization', bruno.auth)
      expect(response.status).toBe(403)
    })

    it('admin exclui uma tarefa e o histórico vai junto', async () => {
      const response = await api.delete(`/tasks/${anaTaskId}`).set('Authorization', admin.auth)
      expect(response.status).toBe(204)

      const history = await prisma.taskHistory.count({ where: { taskId: anaTaskId } })
      expect(history).toBe(0)
    })

    it('retorna 404 para tarefa inexistente', async () => {
      const response = await api.get(`/tasks/${anaTaskId}`).set('Authorization', admin.auth)
      expect(response.status).toBe(404)
    })

    it('recusa id inválido', async () => {
      const response = await api.get('/tasks/abc').set('Authorization', admin.auth)
      expect(response.status).toBe(400)
    })
  })
})
