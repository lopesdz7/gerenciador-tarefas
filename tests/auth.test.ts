import { api, createUserAndLogin, prisma, resetDatabase } from './helpers'

describe('Autenticação e usuários', () => {
  beforeAll(resetDatabase)
  afterAll(() => prisma.$disconnect())

  describe('POST /users (cadastro)', () => {
    it('cria um usuário como "member" e não retorna a senha', async () => {
      const response = await api
        .post('/users')
        .send({ name: 'Maria', email: 'MARIA@email.com', password: '123456' })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        name: 'Maria',
        email: 'maria@email.com',
        role: 'member',
      })
      expect(response.body).not.toHaveProperty('password')

      const saved = await prisma.user.findUnique({ where: { email: 'maria@email.com' } })
      expect(saved?.password).not.toBe('123456') // senha criptografada
    })

    it('ignora a tentativa de se cadastrar como admin', async () => {
      const response = await api
        .post('/users')
        .send({ name: 'Hacker', email: 'hacker@email.com', password: '123456', role: 'admin' })

      expect(response.status).toBe(201)
      expect(response.body.role).toBe('member')
    })

    it('não permite e-mail repetido', async () => {
      const response = await api
        .post('/users')
        .send({ name: 'Maria 2', email: 'maria@email.com', password: '123456' })

      expect(response.status).toBe(409)
    })

    it('valida os dados com Zod', async () => {
      const response = await api
        .post('/users')
        .send({ name: 'A', email: 'invalido', password: '1' })

      expect(response.status).toBe(400)
      expect(response.body.issues).toHaveProperty('email')
      expect(response.body.issues).toHaveProperty('password')
    })
  })

  describe('POST /sessions (login)', () => {
    it('retorna um token JWT com credenciais válidas', async () => {
      const response = await api
        .post('/sessions')
        .send({ email: 'maria@email.com', password: '123456' })

      expect(response.status).toBe(200)
      expect(response.body.token).toEqual(expect.any(String))
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('recusa senha errada', async () => {
      const response = await api
        .post('/sessions')
        .send({ email: 'maria@email.com', password: 'errada' })

      expect(response.status).toBe(401)
    })

    it('recusa e-mail inexistente com a mesma mensagem', async () => {
      const response = await api
        .post('/sessions')
        .send({ email: 'ninguem@email.com', password: '123456' })

      expect(response.status).toBe(401)
      expect(response.body.message).toBe('E-mail ou senha inválidos.')
    })
  })

  describe('Rotas protegidas', () => {
    it('exige token', async () => {
      const response = await api.get('/tasks')
      expect(response.status).toBe(401)
    })

    it('recusa token inválido', async () => {
      const response = await api.get('/tasks').set('Authorization', 'Bearer token-falso')
      expect(response.status).toBe(401)
    })

    it('member não acessa rota de admin', async () => {
      const member = await createUserAndLogin('member')
      const response = await api.get('/users').set('Authorization', member.auth)

      expect(response.status).toBe(403)
    })

    it('admin lista usuários e promove um member a admin', async () => {
      const admin = await createUserAndLogin('admin')
      const member = await createUserAndLogin('member')

      const list = await api.get('/users').set('Authorization', admin.auth)
      expect(list.status).toBe(200)
      expect(list.body.length).toBeGreaterThan(0)
      expect(list.body[0]).not.toHaveProperty('password')

      const promote = await api
        .patch(`/users/${member.user.id}/role`)
        .set('Authorization', admin.auth)
        .send({ role: 'admin' })

      expect(promote.status).toBe(200)
      expect(promote.body.role).toBe('admin')
    })
  })
})
