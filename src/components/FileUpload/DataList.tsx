import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { useState } from "react"
import { usePagination } from "./pagination"

type DataListProps = {
  data: any[]
  columns: Column[] // 现在 columns 是对象数组
}

type Column = {
  key: string
  label: string
  tdClassName?: string
  render?: (value: any, row: any) => React.ReactNode // ⬅ 关键
}
export default function DataList({ data, columns }: DataListProps) {
  const [jumpPage, setJumpPage] = useState("")
  const { page, totalPages, pageData, next, prev, goTo } = usePagination(
    data,
    10
  )

  const handleJumpPage = () => {
    const targetPage = Number(jumpPage)

    if (!Number.isInteger(targetPage) || targetPage < 1 || totalPages < 1) {
      return
    }

    goTo(targetPage)
    setJumpPage("")
  }

  return (
    <div className="space-y-4">
      {/* 渲染本页的数据 */}

      <div className="border rounded p-4 space-y-2">
        <table className="min-w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left border-b">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, index) => (
              <tr key={index} className="border-b">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="border-l-0 border-r-0 border border-gray-300 py-2 text-sm text-gray-800">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页组件 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            {/* 上一页 */}
            <PaginationItem>
              <PaginationPrevious onClick={prev} />
            </PaginationItem>

          {/* 页码 */}
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1

            // 长分页加 “...”
            if (totalPages > 7) {
              if (pageNum === 1 || pageNum === totalPages) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => goTo(pageNum)}
                      isActive={page === pageNum}>
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              }
              if (
                pageNum === page - 1 ||
                pageNum === page ||
                pageNum === page + 1
              ) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => goTo(pageNum)}
                      isActive={page === pageNum}>
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              }
              if (pageNum === page - 2 || pageNum === page + 2) {
                return (
                  <PaginationItem key={`ellipsis-${pageNum}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              }
              return null
            }

            // 短分页直接展示所有
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => goTo(pageNum)}
                  isActive={page === pageNum}>
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}

          {/* 下一页 */}
          <PaginationItem>
            <PaginationNext onClick={next} />
          </PaginationItem>
          </PaginationContent>
        </Pagination>
        <div className="flex items-center justify-end gap-2 text-sm text-gray-600">
          <span>跳转到</span>
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            value={jumpPage}
            onChange={(event) => setJumpPage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleJumpPage()
              }
            }}
            className="h-8 w-16 rounded border border-gray-300 px-2 text-center outline-none focus:border-[#1890ff] focus:ring-2 focus:ring-[#1890ff]/15"
          />
          <span>页</span>
          <button
            type="button"
            onClick={handleJumpPage}
            disabled={totalPages < 1}
            className="h-8 rounded border border-[#1890ff] px-3 text-[#1890ff] transition hover:bg-[#e6f7ff] disabled:cursor-not-allowed disabled:opacity-50">
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
