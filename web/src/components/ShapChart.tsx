import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ShapFactor } from '../api'
import { shortFeatureLabel } from '../features'

interface Row {
  label: string
  contribution: number
}

/**
 * Horizontal bars, one per factor: red bars (right) pushed this student's risk up,
 * blue bars (left) pushed it down. Longer bar = bigger effect.
 */
export function ShapChart({ factors }: { factors: ShapFactor[] }) {
  const rows: Row[] = factors.map((f) => ({
    // Short label for the axis, e.g. "Second-period grade = 5" (no "(0–20)" hint)
    label: `${shortFeatureLabel(f.feature)} = ${f.value}`,
    contribution: f.contribution,
  }))
  const { max, ticks } = symmetricTicks(Math.max(...rows.map((r) => Math.abs(r.contribution))))

  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
        <LegendItem color="var(--shap-up)" label="Raises risk" />
        <LegendItem color="var(--shap-down)" label="Lowers risk" />
      </figcaption>

      <div style={{ height: rows.length * 40 + 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <XAxis
              type="number"
              domain={[-max, max]}
              ticks={ticks}
              tick={{ fill: 'var(--chart-text)', fontSize: 11 }}
              stroke="var(--chart-grid)"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={215}
              tick={{ fill: 'var(--chart-text)', fontSize: 12 }}
              stroke="var(--chart-grid)"
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="var(--chart-text)" />
            <Tooltip
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0].payload as Row
                return (
                  <div className="rounded-md border border-stone-200 bg-[var(--chart-tooltip-bg)] px-3 py-2 text-xs shadow-sm dark:border-stone-700">
                    <div className="font-medium">{row.label}</div>
                    <div className="text-stone-600 dark:text-stone-300">
                      {row.contribution > 0 ? 'Raises' : 'Lowers'} risk by {Math.abs(row.contribution).toFixed(2)}
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="contribution" barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell key={row.label} fill={row.contribution > 0 ? 'var(--shap-up)' : 'var(--shap-down)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="mt-2 text-xs text-stone-600 dark:text-stone-300">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left">
              <th className="py-1 font-medium">Factor</th>
              <th className="py-1 text-right font-medium">Effect on risk (log-odds)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-stone-200 dark:border-stone-700">
                <td className="py-1">{row.label}</td>
                <td className="py-1 text-right tabular-nums">
                  {row.contribution > 0 ? '+' : ''}
                  {row.contribution.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** Same round-number scale on both sides of zero (e.g. -4, -2, 0, 2, 4), so left and right bars compare fairly. */
function symmetricTicks(largest: number) {
  const step = largest <= 1 ? 0.5 : largest <= 2 ? 1 : 2
  const max = Math.max(step, Math.ceil(largest / step) * step)
  const ticks: number[] = []
  for (let t = -max; t <= max; t += step) {
    ticks.push(t)
  }
  return { max, ticks }
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}
