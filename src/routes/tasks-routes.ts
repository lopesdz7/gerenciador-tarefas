import { Router } from 'express'

import { TasksController } from '../controllers/tasks-controller'
import { ensureAuthenticated } from '../middlewares/ensure-authenticated'
import { verifyUserAuthorization } from '../middlewares/verify-user-authorization'

const tasksRoutes = Router()
const tasksController = new TasksController()

tasksRoutes.use(ensureAuthenticated)

tasksRoutes.post('/', tasksController.create)
tasksRoutes.get('/', tasksController.index)
tasksRoutes.get('/:id', tasksController.show)
tasksRoutes.put('/:id', tasksController.update)
tasksRoutes.patch('/:id/status', tasksController.updateStatus)
tasksRoutes.patch('/:id/assign', verifyUserAuthorization(['admin']), tasksController.assign)
tasksRoutes.delete('/:id', tasksController.remove)
tasksRoutes.get('/:id/history', tasksController.history)

export { tasksRoutes }
