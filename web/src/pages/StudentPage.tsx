import { Link, useParams } from 'react-router'
import { api } from '../api'
import { Card } from '../components/Layout'
import { EarlyWarningBadge, RiskBadge } from '../components/RiskBadge'
import { ShapChart } from '../components/ShapChart'
import { WhatIfPanel } from '../components/WhatIfPanel'
import { featureLabel } from '../features'
import { useLoad } from '../useLoad'

export function StudentPage() {
  const studentId = Number(useParams().id)
  const { data: student, error } = useLoad(() => api.getStudent(studentId), studentId)

  if (error) {
    return <p role="alert" className="text-red-700 dark:text-red-400">{error}</p>
  }
  if (!student) {
    return <p className="text-stone-600 dark:text-stone-300">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/classes/${student.classroomId}`} className="text-sm underline underline-offset-2">
          ← Back to class
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{student.name}</h1>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <div className="text-sm text-stone-600 dark:text-stone-300">Risk score (0–100)</div>
            <div className="text-5xl font-semibold">{student.riskScore.toFixed(1)}</div>
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            <RiskBadge level={student.riskLevel} />
            {student.anomaly && <EarlyWarningBadge />}
          </div>
        </div>
        <p className="mt-4">
          <span className="text-sm text-stone-600 dark:text-stone-300">Recommended action: </span>
          <span className="font-medium">{student.intervention}</span>
        </p>
        {student.anomaly && (
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Early warning: this student's overall pattern is unusual compared with the rest of the dataset, even if
            their grades look fine. Worth a closer look.
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Why this score?">
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
            The factors that pushed this prediction the most (SHAP values). Longer bars had a bigger effect.
          </p>
          <ShapChart factors={student.topFactors} />
        </Card>

        <Card title="What if…?">
          {/* key: start fresh when moving to another student */}
          <WhatIfPanel key={student.id} student={student} />
        </Card>
      </div>

      <Card title="All student data">
        <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(student.features).map(([name, value]) => (
            <div key={name} className="flex justify-between gap-4 border-b border-stone-100 py-1 dark:border-stone-700/60">
              <dt className="text-stone-600 dark:text-stone-300">{featureLabel(name)}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
