import type { NextFunction, Request, Response } from 'express'

import { AppError } from '../utils/app-error'

type Role = 'admin' | 'member'

// Uso: verifyUserAuthorization(['admin'])
export function verifyUserAuthorization(roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Não autenticado.', 401)
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Você não tem permissão para acessar este recurso.', 403)
    }

    next()
  }
}
