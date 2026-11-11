import type { NextFunction, Request, Response } from 'express'
import { verify } from 'jsonwebtoken'

import { authConfig } from '../configs/auth'
import { AppError } from '../utils/app-error'

interface TokenPayload {
  role: 'admin' | 'member'
  sub: string
}

export function ensureAuthenticated(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Token JWT não informado.', 401)
  }

  const token = authHeader.slice('Bearer '.length)

  try {
    const { role, sub } = verify(token, authConfig.jwt.secret) as TokenPayload
    req.user = { id: Number(sub), role }
  } catch {
    throw new AppError('Token JWT inválido ou expirado.', 401)
  }

  next()
}
