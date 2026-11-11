import { hash } from 'bcryptjs'
import request from 'supertest'

import { app } from '../src/app'
import { prisma } from '../src/database/prisma'

export const api = request(app)

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE tasks_history, tasks, team_members, teams, users RESTART IDENTITY CASCADE',
  )
}

let counter = 0

// Cria um usuário direto no banco e faz login para obter o token
export async function createUserAndLogin(role: 'admin' | 'member' = 'member') {
  counter++
  const email = `${role}${counter}@test.com`
  const password = '123456'

  const user = await prisma.user.create({
    data: { name: `${role} ${counter}`, email, password: await hash(password, 4), role },
  })

  const response = await api.post('/sessions').send({ email, password })

  return { user, token: response.body.token as string, auth: `Bearer ${response.body.token}` }
}

export { prisma }
