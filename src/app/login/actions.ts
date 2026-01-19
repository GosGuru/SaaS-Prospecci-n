'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function loginWithCredentials(formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Credenciales inválidas' }
        default:
          return { error: 'Error al iniciar sesión' }
      }
    }
    throw error
  }
}

export async function loginWithGoogle() {
  await signIn('google', { redirectTo: '/dashboard' })
}

export async function logout() {
  await signOut({ redirectTo: '/login' })
}
