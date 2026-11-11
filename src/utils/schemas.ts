import { z } from 'zod'

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'O id precisa ser um número inteiro positivo.' }),
})

export const taskStatusSchema = z.enum(['pending', 'in_progress', 'completed'], {
  message: 'Status deve ser "pending", "in_progress" ou "completed".',
})

export const taskPrioritySchema = z.enum(['high', 'medium', 'low'], {
  message: 'Prioridade deve ser "high", "medium" ou "low".',
})
