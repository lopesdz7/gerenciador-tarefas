import { hash } from 'bcryptjs'

import { prisma } from '../database/prisma'
import { AppError } from '../utils/app-error'

// Nunca devolvemos a senha nas respostas
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

interface CreateUserInput {
  name: string
  email: string
  password: string
}

export const usersService = {
  async create({ name, email, password }: CreateUserInput) {
    const userWithSameEmail = await prisma.user.findUnique({ where: { email } })

    if (userWithSameEmail) {
      throw new AppError('Já existe um usuário com este e-mail.', 409)
    }

    const hashedPassword = await hash(password, 8)

    // Todo cadastro público nasce como "member". Admins são promovidos por outro admin.
    return prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: publicUserSelect,
    })
  },

  list() {
    return prisma.user.findMany({ select: publicUserSelect, orderBy: { id: 'asc' } })
  },

  async updateRole(id: number, role: 'admin' | 'member') {
    const user = await prisma.user.findUnique({ where: { id } })

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404)
    }

    return prisma.user.update({ where: { id }, data: { role }, select: publicUserSelect })
  },
}
