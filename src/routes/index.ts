import { Router } from 'express'

import { sessionsRoutes } from './sessions-routes'
import { tasksRoutes } from './tasks-routes'
import { teamsRoutes } from './teams-routes'
import { usersRoutes } from './users-routes'

const routes = Router()

routes.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

routes.use('/users', usersRoutes)
routes.use('/sessions', sessionsRoutes)
routes.use('/teams', teamsRoutes)
routes.use('/tasks', tasksRoutes)

export { routes }
