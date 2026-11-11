import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'

import { authConfig } from '../configs/auth'
import { prisma } from '../database/prisma'
import { AppError } from '../utils/app-error'

export const sessionsService = {
  async create(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } })

    // Mesma mensagem para e-mail e senha errados, para não revelar quais e-mails existem
    if (!user || !(await compare(password, user.password))) {
      throw new AppError('E-mail ou senha inválidos.', 401)
    }

    const token = sign({ role: user.role }, authConfig.jwt.secret, {
      subject: String(user.id),
      expiresIn: authConfig.jwt.expiresIn,
    })

    const { password: _password, ...userWithoutPassword } = user

    return { token, user: userWithoutPassword }
  },
}
