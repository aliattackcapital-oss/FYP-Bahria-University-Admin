const AUTH_KEY = 'vad_auth'
const VALID_EMAIL = 'admin@company.com'
const VALID_PASSWORD = 'password123'

export function login(email: string, password: string): boolean {
  const ok =
    email.trim().toLowerCase() === VALID_EMAIL && password === VALID_PASSWORD
  if (ok) {
    localStorage.setItem(AUTH_KEY, '1')
  }
  return ok
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === '1'
}
