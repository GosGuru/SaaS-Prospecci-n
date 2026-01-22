'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  MapPin,
  MessageSquare,
  Mail,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Zap,
  Target,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Buscar en Maps', href: '/dashboard/search', icon: MapPin },
  { name: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare },
  { name: 'Campañas', href: '/dashboard/campaigns', icon: Target },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({ children }: LayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Command palette shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setCommandOpen(true)
        }
      }
      if (e.key === 'Escape') {
        setCommandOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 260 }}
        className="fixed left-0 top-0 h-full bg-dark-card border-r border-dark-border z-40 flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-dark-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-bold text-lg text-dark-text"
                >
                  ProspectoSAS
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'group relative',
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-dark-muted hover:text-dark-text hover:bg-dark-hover'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-500 rounded-r-full"
                  />
                )}
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-brand-400')} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-medium"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-dark-card border border-dark-border flex items-center justify-center text-dark-muted hover:text-dark-text transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* User section */}
        <div className="p-4 border-t border-dark-border">
          <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-medium">
              {session.user.name?.[0] || session.user.email?.[0] || 'U'}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-dark-text truncate">
                    {session.user.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-dark-muted truncate">{session.user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!sidebarCollapsed && (
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 rounded-lg text-dark-muted hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-[260px]'
        )}
      >
        {/* Top bar */}
        <header className="h-16 border-b border-dark-border bg-dark-card/50 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-hover text-dark-muted hover:text-dark-text transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Buscar...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-dark-border rounded">
                /
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsDropdown />
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>

      {/* Command Palette */}
      <AnimatePresence>
        {commandOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setCommandOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
            >
              <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 border-b border-dark-border">
                  <Search className="w-5 h-5 text-dark-muted" />
                  <input
                    type="text"
                    placeholder="Buscar leads, campañas, acciones..."
                    className="flex-1 bg-transparent py-4 text-dark-text placeholder:text-dark-muted focus:outline-none"
                    autoFocus
                  />
                  <kbd className="px-2 py-1 text-xs text-dark-muted bg-dark-hover rounded">
                    ESC
                  </kbd>
                </div>
                <div className="p-2 max-h-[300px] overflow-y-auto">
                  {navigation.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href)
                        setCommandOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-dark-text hover:bg-dark-hover transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-dark-muted" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
