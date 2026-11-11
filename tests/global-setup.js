// Antes de todos os testes: aplica as migrações no banco de testes (.env.test).
// Cada arquivo de teste limpa as tabelas com resetDatabase() (tests/helpers.ts).
const { execSync } = require('node:child_process')
const { config } = require('dotenv')

module.exports = async () => {
  const { parsed } = config({ path: '.env.test', quiet: true })

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, ...parsed },
    stdio: 'pipe',
  })
}
