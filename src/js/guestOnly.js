import { getSession } from './auth.js'

export async function redirectIfAuthed(to = '/dashboard.html') {
  const session = await getSession()
  if (session) {
    window.location.replace(to)
  }
}