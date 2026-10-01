import { useEffect, useState } from 'react'

/**
 * Loads data when the page opens (and again when `key` changes or reload() is called).
 * Ignores answers that arrive after the page has moved on, so old data never overwrites new.
 */
export function useLoad<T>(load: () => Promise<T>, key: unknown) {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<string>()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let current = true
    setError(undefined)
    load()
      .then((result) => current && setData(result))
      .catch((e: Error) => current && setError(e.message))
    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` decides when to reload
  }, [key, version])

  return { data, error, reload: () => setVersion((v) => v + 1) }
}
