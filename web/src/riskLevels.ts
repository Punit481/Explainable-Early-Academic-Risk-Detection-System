import type { RiskLevel } from './api'

// Each level has a color AND an icon AND its name, so it never relies on color alone.
// The colors are defined in index.css. iconColor keeps the icon readable on its circle
// (dark on the light yellow, white on the darker colors).
export const RISK_LEVELS: Record<RiskLevel, { color: string; icon: string; iconColor: string }> = {
  Low: { color: 'var(--status-low)', icon: '✓', iconColor: '#ffffff' },
  Medium: { color: 'var(--status-medium)', icon: '!', iconColor: '#1c1917' },
  High: { color: 'var(--status-high)', icon: '▲', iconColor: '#ffffff' },
}
