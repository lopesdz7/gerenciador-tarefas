import { Router } from 'express'

import { UsersController } from '../controllers/users-controller'
import { ensureAuthenticated } from '../middlewares/ensure-authenticated'
import { verifyUserAuthorization } from '../middlewares/verify-user-authorization'

const usersRoutes = Router()
const usersController = new UsersController()

usersRoutes.post('/', usersController.create)

usersRoutes.use(ensureAuthenticated, verifyUserAuthorization(['admin']))
usersRoutes.get('/', usersController.index)
usersRoutes.patch('/:id/role', usersController.updateRole)

export { usersRoutes }
