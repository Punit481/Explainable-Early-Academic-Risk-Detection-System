import { useState, type ChangeEvent } from 'react'
import { api, type UploadResult } from '../api'

/** Upload button for a class CSV. Shows how many students were imported and which rows failed. */
export function CsvUpload({ classId, onUploaded }: { classId: number; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult>()
  const [error, setError] = useState<string>()

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still triggers an upload
    if (!file) return

    setUploading(true)
    setResult(undefined)
    setError(undefined)
    try {
      const uploaded = await api.uploadCsv(classId, file)
      setResult(uploaded)
      onUploaded()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
        {uploading ? 'Uploading…' : 'Upload CSV'}
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} disabled={uploading} />
      </label>

      {result && (
        <div role="status" className="mt-2 text-sm">
          <p>
            {result.imported} {result.imported === 1 ? 'student' : 'students'} imported
            {result.errors.length > 0 && `, ${result.errors.length} skipped`}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-stone-600 dark:text-stone-300">
              {result.errors.map((e) => (
                <li key={e.line}>
                  Line {e.line}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
