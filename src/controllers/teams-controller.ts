import type { Request, Response } from 'express'
import { z } from 'zod'

import { teamsService } from '../services/teams-service'
import { idParamSchema } from '../utils/schemas'

const teamBodySchema = z.object({
  name: z.string().trim().min(2, 'O nome do time precisa ter pelo menos 2 caracteres.').max(100),
  description: z.string().trim().max(1000).nullish(),
})

export class TeamsController {
  async create(req: Request, res: Response) {
    const data = teamBodySchema.parse(req.body)
    res.status(201).json(await teamsService.create(data))
  }

  async index(_req: Request, res: Response) {
    res.json(await teamsService.list())
  }

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    const data = teamBodySchema
      .partial()
      .refine((body) => Object.keys(body).length > 0, {
        message: 'Envie "name" e/ou "description" para atualizar.',
      })
      .parse(req.body)

    res.json(await teamsService.update(id, data))
  }

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    await teamsService.delete(id)
    res.status(204).send()
  }
}
