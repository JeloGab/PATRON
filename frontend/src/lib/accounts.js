export const ACCOUNTS = [
  {
    email: 'priest@parish.org',
    password: 'parish',
    name: 'Rev. Fr. Domingo R. Florida',
    role: 'priest',
    label: 'Parish priest',
  },
  {
    email: 'office@parish.org',
    password: 'parish',
    name: 'Parish office',
    role: 'manager',
    label: 'Parish manager',
  },
]

export function findAccount(email, password) {
  const normalized = email.trim().toLowerCase()
  return ACCOUNTS.find((account) => account.email === normalized && account.password === password) || null
}
