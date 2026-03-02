import { getSession } from './auth.js'

export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    // replace е по-сигурно при guard redirect
    window.location.replace('login.html')
    return false
  }

  return true
}