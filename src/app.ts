import express from 'express'

import { errorHandling } from './middlewares/error-handling'
import { routes } from './routes'

const app = express()

app.use(express.json())
app.use(routes)

app.use((_req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' })
})

app.use(errorHandling)

export { app }
