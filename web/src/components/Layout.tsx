import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router'
import { useAuth } from '../auth'

/** Header with the teacher's name and log out, around every logged-in page. */
export function Layout() {
  const { session, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-semibold">
            Academic Risk Dashboard
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-stone-600 sm:inline dark:text-stone-300">
              Signed in as {session?.teacher.name}
            </span>
            <button type="button" onClick={logout} className="underline underline-offset-2">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

/** Shared box style for page sections. */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      {title && <h2 className="mb-4 font-semibold">{title}</h2>}
      {children}
    </section>
  )
}
