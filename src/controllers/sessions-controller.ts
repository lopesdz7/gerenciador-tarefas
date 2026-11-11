import type { Request, Response } from 'express'
import { z } from 'zod'

import { sessionsService } from '../services/sessions-service'

export class SessionsController {
  async create(req: Request, res: Response) {
    const bodySchema = z.object({
      email: z.email('Informe um e-mail válido.').trim().toLowerCase(),
      password: z.string().min(1, 'Informe a senha.'),
    })

    const { email, password } = bodySchema.parse(req.body)

    res.json(await sessionsService.create(email, password))
  }
}
