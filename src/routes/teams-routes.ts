import { Router } from 'express'

import { TeamMembersController } from '../controllers/team-members-controller'
import { TeamsController } from '../controllers/teams-controller'
import { ensureAuthenticated } from '../middlewares/ensure-authenticated'
import { verifyUserAuthorization } from '../middlewares/verify-user-authorization'

const teamsRoutes = Router()
const teamsController = new TeamsController()
const teamMembersController = new TeamMembersController()

const onlyAdmin = verifyUserAuthorization(['admin'])

teamsRoutes.use(ensureAuthenticated)

// Membros do time: admin ou quem faz parte do time
teamsRoutes.get('/:id/members', teamMembersController.index)

// Somente admin
teamsRoutes.post('/', onlyAdmin, teamsController.create)
teamsRoutes.get('/', onlyAdmin, teamsController.index)
teamsRoutes.put('/:id', onlyAdmin, teamsController.update)
teamsRoutes.delete('/:id', onlyAdmin, teamsController.remove)
teamsRoutes.post('/:id/members', onlyAdmin, teamMembersController.create)
teamsRoutes.delete('/:id/members/:userId', onlyAdmin, teamMembersController.remove)

export { teamsRoutes }
