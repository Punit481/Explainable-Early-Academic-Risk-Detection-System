import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { api, type StudentRow } from '../api'
import { CsvUpload } from '../components/CsvUpload'
import { Card } from '../components/Layout'
import { EarlyWarningBadge, RiskBadge } from '../components/RiskBadge'
import { useLoad } from '../useLoad'

const FILTERS = ['All', 'High', 'Medium', 'Low', 'Early warning'] as const
type Filter = (typeof FILTERS)[number]

function matches(student: StudentRow, filter: Filter) {
  if (filter === 'All') return true
  if (filter === 'Early warning') return student.anomaly
  return student.riskLevel === filter
}

export function ClassPage() {
  const classId = Number(useParams().id)
  const { data: classroom, error, reload } = useLoad(() => api.getClass(classId), classId)
  const [filter, setFilter] = useState<Filter>('All')

  if (error) {
    return <p role="alert" className="text-red-700 dark:text-red-400">{error}</p>
  }
  if (!classroom) {
    return <p className="text-stone-600 dark:text-stone-300">Loading…</p>
  }

  // Already sorted highest risk first by the api
  const students = classroom.students.filter((s) => matches(s, filter))

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm underline underline-offset-2">
          ← My classes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{classroom.name}</h1>
      </div>

      <Card title="Add students">
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
          CSV with a <code>name</code> column plus the dataset columns (school, sex, age, …, absences, G1, G2).
          Separated by <code>;</code> or <code>,</code>.
        </p>
        <CsvUpload classId={classId} onUploaded={reload} />
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter students">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-3 py-1 text-sm ${
                filter === f
                  ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                  : 'border-stone-300 dark:border-stone-600'
              }`}
            >
              {f} ({classroom.students.filter((s) => matches(s, f)).length})
            </button>
          ))}
        </div>

        {classroom.students.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-300">No students yet. Upload a CSV above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-600 dark:border-stone-700 dark:text-stone-300">
                  <th className="py-2 pr-4 font-medium">Student</th>
                  <th className="py-2 pr-4 text-right font-medium">Risk score</th>
                  <th className="py-2 pr-4 font-medium">Risk level</th>
                  <th className="py-2 pr-4 font-medium">Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0 dark:border-stone-700/60">
                    <td className="py-2 pr-4">
                      <Link to={`/students/${s.id}`} className="font-medium underline-offset-2 hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{s.riskScore.toFixed(1)}</td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        <RiskBadge level={s.riskLevel} />
                        {s.anomaly && <EarlyWarningBadge />}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-stone-700 dark:text-stone-200">{s.intervention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
