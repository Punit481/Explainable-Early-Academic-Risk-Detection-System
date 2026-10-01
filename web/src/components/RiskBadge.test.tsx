import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EarlyWarningBadge, RiskBadge } from './RiskBadge'

describe('RiskBadge', () => {
  it.each([
    ['Low', '✓', 'var(--status-low)'],
    ['Medium', '!', 'var(--status-medium)'],
    ['High', '▲', 'var(--status-high)'],
  ] as const)('shows %s risk with its own icon and color', (level, icon, color) => {
    render(<RiskBadge level={level} />)

    const badge = screen.getByText(`${level} risk`)
    const iconElement = badge.querySelector('[aria-hidden]') as HTMLElement
    expect(iconElement).toHaveTextContent(icon)
    expect(iconElement.style.background).toBe(color)
  })

  it('shows the early warning badge with a label, not just a color', () => {
    render(<EarlyWarningBadge />)

    expect(screen.getByText('Early warning')).toBeInTheDocument()
  })
})
