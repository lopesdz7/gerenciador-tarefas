import type { Request, Response } from 'express'
import { z } from 'zod'

import { usersService } from '../services/users-service'
import { idParamSchema } from '../utils/schemas'

export class UsersController {
  async create(req: Request, res: Response) {
    const bodySchema = z.object({
      name: z.string().trim().min(2, 'O nome precisa ter pelo menos 2 caracteres.').max(100),
      email: z.email('Informe um e-mail válido.').trim().toLowerCase().max(150),
      password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.').max(100),
    })

    const data = bodySchema.parse(req.body)
    const user = await usersService.create(data)

    res.status(201).json(user)
  }

  async index(_req: Request, res: Response) {
    res.json(await usersService.list())
  }

  async updateRole(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    const { role } = z.object({ role: z.enum(['admin', 'member']) }).parse(req.body)

    res.json(await usersService.updateRole(id, role))
  }
}
