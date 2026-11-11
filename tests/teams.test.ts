import { api, createUserAndLogin, prisma, resetDatabase } from './helpers'

describe('Times', () => {
  let admin: Awaited<ReturnType<typeof createUserAndLogin>>
  let member: Awaited<ReturnType<typeof createUserAndLogin>>
  let outsider: Awaited<ReturnType<typeof createUserAndLogin>>
  let teamId: number

  beforeAll(async () => {
    await resetDatabase()
    admin = await createUserAndLogin('admin')
    member = await createUserAndLogin('member')
    outsider = await createUserAndLogin('member')
  })
  afterAll(() => prisma.$disconnect())

  it('admin cria um time', async () => {
    const response = await api
      .post('/teams')
      .set('Authorization', admin.auth)
      .send({ name: 'Backend', description: 'Time de API' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ name: 'Backend', description: 'Time de API' })
    teamId = response.body.id
  })

  it('member não cria, não lista, não edita e não exclui times', async () => {
    const create = await api.post('/teams').set('Authorization', member.auth).send({ name: 'X' })
    const list = await api.get('/teams').set('Authorization', member.auth)
    const update = await api
      .put(`/teams/${teamId}`)
      .set('Authorization', member.auth)
      .send({ name: 'Y' })
    const remove = await api.delete(`/teams/${teamId}`).set('Authorization', member.auth)

    expect([create.status, list.status, update.status, remove.status]).toEqual([403, 403, 403, 403])
  })

  it('valida o nome do time', async () => {
    const response = await api.post('/teams').set('Authorization', admin.auth).send({ name: '' })
    expect(response.status).toBe(400)
  })

  it('admin lista os times', async () => {
    const response = await api.get('/teams').set('Authorization', admin.auth)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0]._count).toEqual({ members: 0, tasks: 0 })
  })

  it('admin edita um time', async () => {
    const response = await api
      .put(`/teams/${teamId}`)
      .set('Authorization', admin.auth)
      .send({ name: 'Backend Node' })

    expect(response.status).toBe(200)
    expect(response.body.name).toBe('Backend Node')
    expect(response.body.description).toBe('Time de API')
  })

  it('retorna 404 para time inexistente', async () => {
    const response = await api
      .put('/teams/9999')
      .set('Authorization', admin.auth)
      .send({ name: 'Nada' })

    expect(response.status).toBe(404)
  })

  describe('Membros', () => {
    it('admin adiciona um membro ao time', async () => {
      const response = await api
        .post(`/teams/${teamId}/members`)
        .set('Authorization', admin.auth)
        .send({ userId: member.user.id })

      expect(response.status).toBe(201)
      expect(response.body.user).toMatchObject({ id: member.user.id })
    })

    it('não adiciona o mesmo membro duas vezes', async () => {
      const response = await api
        .post(`/teams/${teamId}/members`)
        .set('Authorization', admin.auth)
        .send({ userId: member.user.id })

      expect(response.status).toBe(409)
    })

    it('member não adiciona membros', async () => {
      const response = await api
        .post(`/teams/${teamId}/members`)
        .set('Authorization', member.auth)
        .send({ userId: outsider.user.id })

      expect(response.status).toBe(403)
    })

    it('admin e membros do time listam os membros; quem é de fora não', async () => {
      const asAdmin = await api.get(`/teams/${teamId}/members`).set('Authorization', admin.auth)
      const asMember = await api.get(`/teams/${teamId}/members`).set('Authorization', member.auth)
      const asOutsider = await api
        .get(`/teams/${teamId}/members`)
        .set('Authorization', outsider.auth)

      expect(asAdmin.status).toBe(200)
      expect(asAdmin.body).toHaveLength(1)
      expect(asAdmin.body[0]).not.toHaveProperty('password')
      expect(asMember.status).toBe(200)
      expect(asOutsider.status).toBe(403)
    })

    it('admin remove um membro do time', async () => {
      const response = await api
        .delete(`/teams/${teamId}/members/${member.user.id}`)
        .set('Authorization', admin.auth)

      expect(response.status).toBe(204)

      const again = await api
        .delete(`/teams/${teamId}/members/${member.user.id}`)
        .set('Authorization', admin.auth)
      expect(again.status).toBe(404)
    })
  })

  it('admin exclui um time', async () => {
    const response = await api.delete(`/teams/${teamId}`).set('Authorization', admin.auth)
    expect(response.status).toBe(204)

    const list = await api.get('/teams').set('Authorization', admin.auth)
    expect(list.body).toHaveLength(0)
  })
})
