import path from 'node:path'
import { defineConfig } from 'prisma/config'
import 'dotenv/config'

// Load from .env.local if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  const dotenv = require('dotenv')
  dotenv.config({ path: '.env.local' })
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
