'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, Zap, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard } from '@/components/ui/card'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')

  // Fetch CSRF token on mount
  useEffect(() => {
    fetch('/api/auth/csrf')
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken))
      .catch(console.error)
  }, [])

  // Map error codes to user-friendly messages
  const getErrorMessage = () => {
    switch (error) {
      case 'OAuthAccountNotLinked':
        return 'Este email ya está registrado con otro método. Usa el método original o contacta soporte.'
      case 'AccessDenied':
        return 'Acceso denegado. Verifica tus permisos.'
      case 'Configuration':
        return 'Error de configuración del servidor.'
      case 'MissingCSRF':
        return 'Error de sesión. Por favor intenta de nuevo.'
      default:
        return error ? 'Error al iniciar sesión' : null
    }
  }

  const errorMessage = getErrorMessage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-brand-500/20 to-transparent opacity-50" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-brand-600/10 to-transparent opacity-50" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <GlassCard className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 mb-4 shadow-lg shadow-brand-500/30"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-dark-text">ProspectoSAS</h1>
            <p className="text-dark-muted mt-2">
              CRM & Prospección Inteligente
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-sm text-danger">{errorMessage}</p>
            </div>
          )}

          {/* Login forms using native form submission */}
          <div className="space-y-4">
            {/* Google login - native form */}
            <form action="/api/auth/signin/google" method="POST">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="callbackUrl" value="/dashboard" />
              <Button
                type="submit"
                variant="secondary"
                className="w-full justify-center h-12"
                disabled={!csrfToken}
                leftIcon={
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                }
              >
                Continuar con Google
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-dark-card text-dark-muted">
                  o ingresa con email
                </span>
              </div>
            </div>

            {/* Credentials login - native form */}
            <form 
              action="/api/auth/callback/credentials" 
              method="POST"
              onSubmit={() => setIsLoading(true)}
            >
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="callbackUrl" value="/dashboard" />
              <div className="space-y-4">
                <Input
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <input type="hidden" name="password" value="demo" />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center h-12"
                  isLoading={isLoading}
                  disabled={!csrfToken}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {email ? 'Ingresar' : 'Ingresar como Demo'}
                </Button>
              </div>
            </form>
          </div>

          {/* Demo mode notice */}
          <div className="mt-6 p-4 rounded-lg bg-brand-500/10 border border-brand-500/20">
            <p className="text-sm text-brand-400 text-center">
              🚀 Modo Demo activo - Podés explorar todas las funcionalidades sin configurar APIs
            </p>
          </div>
        </GlassCard>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-3 gap-4 text-center"
        >
          {[
            { icon: '🗺️', label: 'Google Maps' },
            { icon: '💬', label: 'WhatsApp' },
            { icon: '📧', label: 'Email' },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-dark-card/50 border border-dark-border/50"
            >
              <span className="text-2xl">{feature.icon}</span>
              <p className="text-xs text-dark-muted mt-1">{feature.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-dark-muted">Cargando...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
