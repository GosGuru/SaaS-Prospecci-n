/**
 * Get the base URL for the application
 * Works both in development and production
 */
export function getBaseUrl(): string {
  // First check for explicit environment variables
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  // Vercel automatically sets VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Fallback for local development
  return 'http://localhost:3000'
}
