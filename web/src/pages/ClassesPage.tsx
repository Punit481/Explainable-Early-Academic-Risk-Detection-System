import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api, type ClassSummary, type RiskLevel } from '../api'
import { Card } from '../components/Layout'
import { RISK_LEVELS } from '../riskLevels'
import { useLoad } from '../useLoad'

const LEVELS: RiskLevel[] = ['High', 'Medium', 'Low']

export function ClassesPage() {
  const { data: classes, error, reload } = useLoad(api.getClasses, 'classes')
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string>()

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreateError(undefined)
    try {
      await api.createClass(newName)
      setNewName('')
      reload()
    } catch (e) {
      setCreateError((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My classes</h1>

      {error && <p role="alert" className="text-red-700 dark:text-red-400">{error}</p>}
      {!classes && !error && <p className="text-stone-600 dark:text-stone-300">Loading…</p>}
      {classes?.length === 0 && (
        <p className="text-stone-600 dark:text-stone-300">No classes yet. Create one below, then upload a CSV.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes?.map((c) => <ClassCard key={c.id} classSummary={c} />)}
      </div>

      <Card title="New class">
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Math 10-A"
            aria-label="Class name"
            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
          />
          <button
            type="submit"
            className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Create class
          </button>
        </form>
        {createError && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">{createError}</p>}
      </Card>
    </div>
  )
}

/** One class with a High / Medium / Low bar, sized by how many students are in each level. */
function ClassCard({ classSummary }: { classSummary: ClassSummary }) {
  const { id, name, riskCounts } = classSummary
  const total = riskCounts.Low + riskCounts.Medium + riskCounts.High

  return (
    <Link
      to={`/classes/${id}`}
      className="block rounded-lg border border-stone-200 bg-white p-5 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-stone-500"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{name}</h2>
        <span className="text-sm text-stone-600 dark:text-stone-300">
          {total} {total === 1 ? 'student' : 'students'}
        </span>
      </div>

      {total > 0 ? (
        <>
          {/* gap-0.5 = the 2px space between segments */}
          <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {LEVELS.filter((level) => riskCounts[level] > 0).map((level) => (
              <div
                key={level}
                title={`${level} risk: ${riskCounts[level]}`}
                style={{ flexGrow: riskCounts[level], background: RISK_LEVELS[level].color }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
            {LEVELS.map((level) => (
              <span key={level} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-full" style={{ background: RISK_LEVELS[level].color }} />
                {level} {riskCounts[level]}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-stone-600 dark:text-stone-300">No students yet. Open to upload a CSV.</p>
      )}
    </Link>
  )
}
