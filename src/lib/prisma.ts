import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  
  // For build time without DATABASE_URL, use a dummy accelerate URL
  // This allows the build to pass - actual connections require real URL at runtime
  const accelerateUrl = databaseUrl || 'prisma://accelerate.prisma-data.net/?api_key=dummy_build_key'
  
  return new PrismaClient({
    accelerateUrl,
  }).$extends(withAccelerate()) as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
