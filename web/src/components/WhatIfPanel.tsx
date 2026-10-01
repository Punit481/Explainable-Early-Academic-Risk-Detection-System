import { useEffect, useState } from 'react'
import { api, type Prediction, type Student, type StudentFeatures } from '../api'
import { featureLabel, shortFeatureLabel, STAGE_LABELS, WHAT_IF_FIELDS } from '../features'
import { RiskBadge } from './RiskBadge'
import { ShapChart } from './ShapChart'

/**
 * "What if this student's grades improved / absences dropped?"
 * Each change asks the model again (nothing is saved) and shows the new risk next to the current one.
 */
export function WhatIfPanel({ student }: { student: Student }) {
  const [changes, setChanges] = useState<StudentFeatures>({})
  const [result, setResult] = useState<Prediction>()
  const [error, setError] = useState<string>()

  const hasChanges = Object.keys(changes).length > 0

  useEffect(() => {
    if (!hasChanges) return
    let current = true
    // Wait until the slider stops moving for 300 ms, instead of a request per pixel
    const timer = setTimeout(() => {
      api
        .whatIf(student.id, changes)
        .then((prediction) => {
          if (current) {
            setResult(prediction)
            setError(undefined)
          }
        })
        .catch((e: Error) => current && setError(e.message))
    }, 300)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [changes, hasChanges, student.id])

  function setField(name: string, value: string | number) {
    const next = { ...changes }
    if (value === student.features[name]) {
      delete next[name] // back to the real value: no longer a change
    } else {
      next[name] = value
    }
    // The models that use G1 also need absences: assume 0 (shown as a change the teacher can adjust)
    if (name === 'G1' && valueOf('absences') === undefined) {
      next.absences = 0
    }
    updateChanges(next)
  }

  function updateChanges(next: StudentFeatures) {
    setChanges(next)
    if (Object.keys(next).length === 0) {
      setResult(undefined) // so an old result never flashes up on the next change
    }
  }

  // undefined = not known yet (e.g. no grades early in the term)
  const valueOf = (name: string): string | number | undefined => changes[name] ?? student.features[name]

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {WHAT_IF_FIELDS.map((field) => {
          const value = valueOf(field.name)
          const needs = field.kind === 'range' ? field.needs : undefined
          const blocked = needs !== undefined && valueOf(needs) === undefined
          return (
            <label key={field.name} className={`block text-sm ${blocked ? 'opacity-50' : ''}`}>
              <span className="flex justify-between gap-2">
                <span>{featureLabel(field.name)}</span>
                {value === undefined ? (
                  <span className="shrink-0 text-xs whitespace-nowrap text-stone-500 dark:text-stone-400">
                    not known yet
                  </span>
                ) : (
                  <span className={`shrink-0 tabular-nums ${field.name in changes ? 'font-semibold' : ''}`}>
                    {value}
                  </span>
                )}
              </span>
              {field.kind === 'range' ? (
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={value ?? field.start ?? field.min}
                  disabled={blocked}
                  onChange={(e) => setField(field.name, Number(e.target.value))}
                  className="mt-1 w-full accent-stone-700 dark:accent-stone-300"
                />
              ) : (
                <select
                  value={valueOf(field.name)}
                  onChange={(e) => setField(field.name, e.target.value)}
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1 dark:border-stone-600 dark:bg-stone-800"
                >
                  <option value="yes">yes</option>
                  <option value="no">no</option>
                </select>
              )}
              {blocked ? (
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {`Set the ${shortFeatureLabel(needs).toLowerCase()} first`}
                </span>
              ) : (
                field.kind === 'range' &&
                field.hint && <span className="text-xs text-stone-500 dark:text-stone-400">{field.hint}</span>
              )}
            </label>
          )
        })}
      </div>

      <div className="mt-5 border-t border-stone-200 pt-4 dark:border-stone-700">
        {!hasChanges && (
          <p className="text-sm text-stone-600 dark:text-stone-300">Move a slider to see how the risk would change.</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        {hasChanges && result && (
          <div>
            <div className="flex flex-wrap items-center gap-3" data-testid="what-if-result">
              <span className="text-sm text-stone-600 dark:text-stone-300">Risk score</span>
              <span className="text-lg tabular-nums">{student.riskScore.toFixed(1)}</span>
              <span aria-hidden>→</span>
              <span className="text-2xl font-semibold tabular-nums">{result.riskScore.toFixed(1)}</span>
              <RiskBadge level={result.riskLevel} />
              <span className="text-sm text-stone-600 dark:text-stone-300">
                ({result.riskScore - student.riskScore > 0 ? '+' : ''}
                {(result.riskScore - student.riskScore).toFixed(1)})
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{result.intervention}</p>
            {result.stage !== student.stage && (
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                Now predicted from: {STAGE_LABELS[result.stage]}
              </p>
            )}
            <div className="mt-4">
              <ShapChart factors={result.topFactors} />
            </div>
          </div>
        )}
        {hasChanges && (
          <button type="button" onClick={() => updateChanges({})} className="mt-3 text-sm underline underline-offset-2">
            Reset to real values
          </button>
        )}
      </div>
    </div>
  )
}
