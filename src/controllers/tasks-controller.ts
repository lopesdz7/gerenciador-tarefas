import type { Request, Response } from 'express'
import { z } from 'zod'

import { tasksService } from '../services/tasks-service'
import { idParamSchema, taskPrioritySchema, taskStatusSchema } from '../utils/schemas'

const positiveInt = z.coerce.number().int().positive()

export class TasksController {
  async create(req: Request, res: Response) {
    const bodySchema = z.object({
      title: z.string().trim().min(1, 'O título é obrigatório.').max(200),
      description: z.string().trim().max(5000).nullish(),
      status: taskStatusSchema.optional(),
      priority: taskPrioritySchema.optional(),
      teamId: positiveInt,
      assignedTo: positiveInt.nullish(),
    })

    const data = bodySchema.parse(req.body)
    res.status(201).json(await tasksService.create(data, req.user!))
  }

  // GET /tasks?status=pending&priority=high&teamId=1&assignedTo=2
  async index(req: Request, res: Response) {
    const querySchema = z.object({
      status: taskStatusSchema.optional(),
      priority: taskPrioritySchema.optional(),
      teamId: positiveInt.optional(),
      assignedTo: positiveInt.optional(),
    })

    const filters = querySchema.parse(req.query)
    res.json(await tasksService.list(filters, req.user!))
  }

  async show(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    res.json(await tasksService.show(id, req.user!))
  }

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    const bodySchema = z
      .object({
        title: z.string().trim().min(1, 'O título não pode ser vazio.').max(200),
        description: z.string().trim().max(5000).nullable(),
        status: taskStatusSchema,
        priority: taskPrioritySchema,
      })
      .partial()
      .refine((body) => Object.keys(body).length > 0, {
        message: 'Envie ao menos um campo: title, description, status ou priority.',
      })

    const data = bodySchema.parse(req.body)
    res.json(await tasksService.update(id, data, req.user!))
  }

  async updateStatus(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    const { status } = z.object({ status: taskStatusSchema }).parse(req.body)

    res.json(await tasksService.updateStatus(id, status, req.user!))
  }

  async assign(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    const { assignedTo } = z.object({ assignedTo: positiveInt.nullable() }).parse(req.body)

    res.json(await tasksService.assign(id, assignedTo))
  }

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    await tasksService.delete(id, req.user!)
    res.status(204).send()
  }

  async history(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params)
    res.json(await tasksService.history(id, req.user!))
  }
}
