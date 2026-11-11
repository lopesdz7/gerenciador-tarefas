import type { Request, Response } from 'express'
import { z } from 'zod'

import { teamsService } from '../services/teams-service'
import { idParamSchema } from '../utils/schemas'

export class TeamMembersController {
  async index(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    res.json(await teamsService.listMembers(id, req.user!))
  }

  async create(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    const { userId } = z
      .object({ userId: z.coerce.number().int().positive('Informe o id do usuário (userId).') })
      .parse(req.body)

    res.status(201).json(await teamsService.addMember(id, userId))
  }

  async remove(req: Request, res: Response) {
    const { id, userId } = idParamSchema
      .extend({ userId: z.coerce.number().int().positive() })
      .parse(req.params)

    await teamsService.removeMember(id, userId)
    res.status(204).send()
  }
}
