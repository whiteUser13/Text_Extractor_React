import { useState, useMemo } from "react"

export function usePagination(data: any[], pageSize = 10) {
  const [page, setPage] = useState(1)

  const total = data.length
  const totalPages = Math.ceil(total / pageSize)

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [page, pageSize, data])

  const next = () => setPage((p) => Math.min(p + 1, totalPages))
  const prev = () => setPage((p) => Math.max(p - 1, 1))
  const goTo = (p: number) => setPage(Math.min(Math.max(p, 1), totalPages))

  return {
    page,
    totalPages,
    pageData,
    next,
    prev,
    goTo,
  }
}
