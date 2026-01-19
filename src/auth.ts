import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          // Request Gmail send scope for email sending
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    // Demo credentials provider for testing
    Credentials({
      name: 'Demo',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Demo mode - accept any credentials
        if (process.env.DEMO_MODE === 'true') {
          const email = (credentials?.email as string) || 'demo@prospectosas.com'
          
          // Find or create demo user
          let user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: 'Usuario Demo',
              },
            })
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Save OAuth tokens for Gmail integration
      if (account?.provider === 'google' && account.access_token) {
        try {
          // Get user's workspace
          const membership = await prisma.workspaceMember.findFirst({
            where: { userId: user.id! },
            include: { workspace: true },
          })

          if (membership) {
            // Upsert OAuth token for the workspace
            await prisma.oAuthToken.upsert({
              where: {
                workspaceId_provider: {
                  workspaceId: membership.workspaceId,
                  provider: 'google',
                },
              },
              update: {
                accessToken: account.access_token,
                refreshToken: account.refresh_token || undefined,
                expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
                scope: account.scope,
              },
              create: {
                workspaceId: membership.workspaceId,
                provider: 'google',
                accessToken: account.access_token,
                refreshToken: account.refresh_token || undefined,
                expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
                scope: account.scope,
              },
            })
          }
        } catch (error) {
          console.error('Error saving OAuth token:', error)
        }
      }
      return true
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  events: {
    async createUser({ user }) {
      // Create default workspace for new users
      if (user.email) {
        const workspaceSlug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
        
        const workspace = await prisma.workspace.create({
          data: {
            name: `${user.name || 'Mi'} Workspace`,
            slug: `${workspaceSlug}-${Date.now()}`,
            members: {
              create: {
                userId: user.id!,
                role: 'ADMIN',
              },
            },
          },
        })

        // Create default pipeline stages
        await prisma.pipelineStage.createMany({
          data: [
            { name: 'Nuevo', color: '#6366F1', order: 0, workspaceId: workspace.id },
            { name: 'Contactado', color: '#F59E0B', order: 1, workspaceId: workspace.id },
            { name: 'En Negociación', color: '#3B82F6', order: 2, workspaceId: workspace.id },
            { name: 'Propuesta Enviada', color: '#8B5CF6', order: 3, workspaceId: workspace.id },
            { name: 'Ganado', color: '#10B981', order: 4, isWon: true, workspaceId: workspace.id },
            { name: 'Perdido', color: '#EF4444', order: 5, isLost: true, workspaceId: workspace.id },
          ],
        })
      }
    },
  },
})

// Compatibility export for gradual migration
export { auth as getServerSession }
