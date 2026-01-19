import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  
  // If no DATABASE_URL, create a basic client (for build time)
  // It won't connect but allows type checking to pass
  if (!databaseUrl) {
    return new PrismaClient()
  }
  
  // With DATABASE_URL, use Accelerate
  return new PrismaClient({
    accelerateUrl: databaseUrl,
  }).$extends(withAccelerate()) as unknown as PrismaClient
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
