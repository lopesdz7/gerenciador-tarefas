import type { ErrorRequestHandler } from 'express'
import { ZodError, z } from 'zod'

import { AppError } from '../utils/app-error'

export const errorHandling: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Erro de validação.',
      issues: z.flattenError(error).fieldErrors,
    })
    return
  }

  // JSON mal formado no corpo da requisição
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ message: 'O corpo da requisição precisa ser um JSON válido.' })
    return
  }

  console.error(error)
  res.status(500).json({ message: 'Erro interno do servidor.' })
}
