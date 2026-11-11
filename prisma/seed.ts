import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// Cria (ou atualiza) o usuário administrador inicial.
// Configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD no .env
const prisma = new PrismaClient()

async function main() {
  const name = process.env.ADMIN_NAME ?? 'Admin'
  const email = (process.env.ADMIN_EMAIL ?? 'admin@email.com').toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    throw new Error('Defina ADMIN_PASSWORD no .env para criar o admin.')
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'admin' },
    create: { name, email, password: await hash(password, 8), role: 'admin' },
  })

  console.log(`✔ Admin pronto: ${admin.email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
