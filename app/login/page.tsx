import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { LoginForm } from './login-form'

export const metadata = {
  title: 'Login',
}

export default async function LoginPage() {
  const session = await getSession()

  if (session) {
    redirect('/admin')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-muted/30 p-4">
      {/* Subtle grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.15]"
      />

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <LoginForm />
      </div>
    </div>
  )
}