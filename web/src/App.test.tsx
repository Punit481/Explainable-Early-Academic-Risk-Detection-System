import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, saveSession } from './api'
import { AppRoutes } from './App'
import { AuthProvider } from './auth'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends a logged-out teacher to the login page', () => {
    renderAt('/classes/2')

    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows the class list to a logged-in teacher', async () => {
    saveSession({ accessToken: 'token', teacher: { name: 'Teacher A', email: 'a@school.test' } })
    vi.spyOn(api, 'getClasses').mockResolvedValue([
      { id: 2, name: 'Math 10-A', riskCounts: { Low: 23, Medium: 0, High: 7 } },
    ])

    renderAt('/')

    expect(await screen.findByText('Math 10-A')).toBeInTheDocument()
    expect(screen.getByText('30 students')).toBeInTheDocument()
    expect(screen.getByText('Signed in as Teacher A')).toBeInTheDocument()
  })
})
