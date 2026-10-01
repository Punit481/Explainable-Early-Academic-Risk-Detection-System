import type { RiskLevel } from '../api'
import { RISK_LEVELS } from '../riskLevels'

function Badge({ color, icon, iconColor, label }: { color: string; icon: string; iconColor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-stone-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100">
      <span
        aria-hidden
        className="flex size-4 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: color, color: iconColor }}
      >
        {icon}
      </span>
      {label}
    </span>
  )
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { color, icon, iconColor } = RISK_LEVELS[level]
  return <Badge color={color} icon={icon} iconColor={iconColor} label={`${level} risk`} />
}

/** Shown when the Isolation Forest flags the student as unusual (an early warning sign). */
export function EarlyWarningBadge() {
  return <Badge color="var(--status-warning)" icon="⚠" iconColor="#1c1917" label="Early warning" />
}
