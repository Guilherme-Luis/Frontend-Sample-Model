import { useCallback, useEffect, useMemo, useState } from 'react'

export function useAsyncData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await loader()
      setData(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [loader])

  useEffect(() => {
    void reload()
  }, [reload])

  return useMemo(
    () => ({ data, error, loading, reload }),
    [data, error, loading, reload],
  )
}

