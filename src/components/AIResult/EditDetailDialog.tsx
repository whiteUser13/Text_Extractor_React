import React, { useEffect, useMemo, useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { updateDetail } from "@/api/aiResult"
import { useToast } from "@/hooks/use-toast"

// pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export type ExtractedFieldItem = {
  field_name: string
  field_value: string
  page_num: number // 后端原始页码：-1=未定位，0=PDF第一页
}

export type JudgedFiledItem = {
  judged_name: string
  judged_value: string
}

export type PageNumFieldItem = {
  field_name: string
  page_num: number
}

// export type PDFDetailInfo = {
//   file_name: string
//   pdf_url: string
//   extracted_fields?: ExtractedFieldItem[]
//   judged_fields?: JudgedFiledItem[]
// }
export type AIExtractedFieldItem = {
  extract_name: string
  extract_value: string
}
export type PDFDetailInfo = {
  file_name: string
  pdf_url: string
  extracted_fields?: ExtractedFieldItem[]
  ai_extracted_fields?: AIExtractedFieldItem[]
  judged_fields?: JudgedFiledItem[]
  ai_judged_fields?: JudgedFiledItem[]
  is_correct?: string // "yes" | "no" | "unknown"
}
interface SubmitPayload {
  task_id: string
  file_name: string
  extraction_result: Record<string, string>
  judge_result: Record<string, string>
  page_idx: Record<string, number>
  is_correct?: string // "yes" | "no" | "unknown"
}

interface FileDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading?: boolean
  detail: PDFDetailInfo | null
  taskId: string
  onSubmitEdit?: (payload: SubmitPayload) => Promise<void> | void
}

const PdfViewer = React.memo(
  ({ file, options, numPages, setNumPages, pageRefs, currentPage }: any) => {
    return (
      <Document
        file={file}
        options={options}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={<div className="p-4">PDF 加载中.............</div>}>
        {Array.from({ length: numPages }, (_, i) => {
          const page = i + 1

          return (
            <div
              key={page}
              ref={(el) => {
                pageRefs.current[page] = el
              }}
              className={`flex justify-center py-3 ${
                currentPage === page ? "bg-blue-50" : ""
              }`}>
              <Page pageNumber={page} width={700} />
            </div>
          )
        })}
      </Document>
    )
  },
  (prev, next) => {
    // 👉 关键：只要 url 不变就不重新渲染 PDF
    console.log(prev)
    console.log(next)

    return prev.file?.url === next.file?.url && prev.numPages === next.numPages
  },
)

const EditDetailDialog: React.FC<FileDetailDialogProps> = ({
  open,
  onOpenChange,
  loading = false,
  detail,
  taskId,
  onSubmitEdit,
}) => {
  const { toast } = useToast()
  const [currentPdfPage, setCurrentPdfPage] = useState(1) // react-pdf 使用 1-based 页码
  const [numPages, setNumPages] = useState(0)
  const [editableFields, setEditableFields] = useState<ExtractedFieldItem[]>([])
  const [editableJudgedFields, setEditableJudgedFields] = useState<
    JudgedFiledItem[]
  >([])
  const [submitting, setSubmitting] = useState(false)

  const token = localStorage.getItem("token") || ""

  // 0324修改：后端页码(raw) -> PDF预览页码(viewer)
  const rawPageToViewerPage = (rawPage: number | null | undefined) => {
    if (rawPage === null || rawPage === undefined || rawPage < 0) return null
    return rawPage + 1
  }

  // 0324修改：PDF显示页码(viewer) -> 后端存储页码(raw)
  const viewerPageToRawPage = (viewerPage: number | null | undefined) => {
    if (viewerPage === null || viewerPage === undefined || viewerPage <= 0)
      return -1
    return viewerPage - 1
  }

  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pdfFile = useMemo(() => {
    return detail?.pdf_url ? { url: detail.pdf_url } : null
  }, [detail?.pdf_url])

  const [isCorrect, setIsCorrect] = useState<string>("")

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop

      let closestPage = 1
      let minDiff = Infinity

      Object.entries(pageRefs.current).forEach(([page, el]) => {
        if (!el) return
        const diff = Math.abs(el.offsetTop - scrollTop)
        if (diff < minDiff) {
          minDiff = diff
          closestPage = Number(page)
        }
      })

      setCurrentPdfPage(closestPage)
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (open) {
      setCurrentPdfPage(1)
      setNumPages(0)
      setEditableFields(detail?.extracted_fields ?? [])
      setEditableJudgedFields(detail?.judged_fields ?? [])
      setIsCorrect(detail?.is_correct ?? "")
    }
  }, [open, detail])

  const hasExtractedFields = useMemo(
    () => editableFields.length > 0,
    [editableFields],
  )

  const hasJudgedFields = useMemo(
    () => editableJudgedFields.length > 0,
    [editableJudgedFields],
  )

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCurrentPdfPage(1)
      setNumPages(0)
      setEditableFields([])
      setEditableJudgedFields([])
      setSubmitting(false)
    }
    onOpenChange(nextOpen)
  }
  const handleLocateFieldPage = (rawPageNum: number) => {
    const viewerPage = rawPageToViewerPage(rawPageNum)
    if (!viewerPage) return

    const el = pageRefs.current[viewerPage]
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      setCurrentPdfPage(viewerPage)
    }
  }

  // const handleLocateFieldPage = (rawPageNum: number) => {
  //   const viewerPage = rawPageToViewerPage(rawPageNum)
  //   if (viewerPage === null) return
  //   setCurrentPdfPage(viewerPage)
  // }

  const handleFieldValueChange = (index: number, value: string) => {
    setEditableFields((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              field_value: value,
            }
          : item,
      ),
    )
  }
  // const handleFieldValueChange = useCallback((index: number, value: string) => {
  //   setEditableFields((prev) => {
  //     const next = [...prev]

  //     // ✅ 只改目标项（避免 map 生成新结构）
  //     next[index] = {
  //       ...next[index],
  //       field_value: value,
  //     }

  //     return next
  //   })
  // }, [])

  // 0324修改：输入框显示给用户的是 1-based 页码，存回后端时减 1
  const handlePageNumChange = (index: number, value: string) => {
    const parsedViewerPage = Number(value)

    setEditableFields((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              page_num: Number.isNaN(parsedViewerPage)
                ? -1
                : viewerPageToRawPage(Math.max(1, parsedViewerPage)),
            }
          : item,
      ),
    )
  }

  const handleJudgedValueChange = (index: number, value: string) => {
    setEditableJudgedFields((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              judged_value: value,
            }
          : item,
      ),
    )
  }

  const buildExtractionResult = (fields: ExtractedFieldItem[]) => {
    return fields.reduce<Record<string, string>>((acc, item) => {
      acc[item.field_name] = item.field_value || ""
      return acc
    }, {})
  }

  const buildJudgeResult = (fields: JudgedFiledItem[]) => {
    return fields.reduce<Record<string, string>>((acc, item) => {
      acc[item.judged_name] = item.judged_value || ""
      return acc
    }, {})
  }

  // 0324修改：提交给后端时仍然传原始 raw page_idx
  const buildPageNumResult = (fields: ExtractedFieldItem[]) => {
    return fields.reduce<Record<string, number>>((acc, item) => {
      acc[item.field_name] = item.page_num
      return acc
    }, {})
  }

  const handleSubmit = async () => {
    if (!detail?.file_name || !taskId) return

    try {
      setSubmitting(true)

      const payload: SubmitPayload = {
        task_id: taskId,
        file_name: detail.file_name,
        extraction_result: buildExtractionResult(editableFields),
        judge_result: buildJudgeResult(editableJudgedFields),
        page_idx: buildPageNumResult(editableFields),
        is_correct: isCorrect || "unknown",
      }

      const updateResult = await updateDetail(
        payload.file_name,
        payload.task_id,
        payload.extraction_result,
        payload.judge_result,
        payload.page_idx,
        payload.is_correct,
      )

      if (updateResult.success) {
        toast({
          title: updateResult.msg,
        })
        // 调用提交成功回调
        if (onSubmitEdit) {
          await onSubmitEdit(payload)
        }
      } else {
        toast({
          title: updateResult.msg,
          variant: "destructive",
        })
      }

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "提交修改失败",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCorrectChange = (value: string) => {
    setIsCorrect(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full min-h-0">
          <div className="w-[58%] border-r bg-slate-50 flex flex-col min-h-0">
            <DialogHeader className="px-6 py-4 border-b bg-white">
              <DialogTitle className="flex items-center justify-between">
                <span>PDF 预览</span>
                {detail && (
                  <span className="text-sm font-normal text-slate-500">
                    {detail.file_name}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
              <div className="text-sm text-slate-600">
                第 {currentPdfPage} 页 / 共 {numPages || "-"} 页
              </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-auto">
              <PdfViewer
                file={pdfFile}
                options={{
                  httpHeaders: {
                    Authorization: `Bearer ${token}`,
                  },
                  withCredentials: true,
                }}
                numPages={numPages}
                setNumPages={setNumPages}
                pageRefs={pageRefs}
                currentPage={currentPdfPage}
              />
            </div>
          </div>

          <div className="w-[42%] flex flex-col bg-white min-h-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>提取内容信息</DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 min-h-0 px-6 py-4">
              {loading ? (
                <div className="text-sm text-slate-500">内容加载中...</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 text-sm font-semibold text-slate-800">
                      提取字段
                    </div>

                    {hasExtractedFields ? (
                      <div className="space-y-4">
                        {editableFields.map((item, index) => {
                          const viewerPage = rawPageToViewerPage(item.page_num)
                          const isActive =
                            viewerPage !== null && currentPdfPage === viewerPage
                          const matchedAIField =
                            detail?.ai_extracted_fields?.find(
                              (el) => el.extract_name === item.field_name,
                            )
                          const hasDifference =
                            matchedAIField &&
                            matchedAIField.extract_value !== item.field_value
                          return (
                            <div
                              key={`${item.field_name}-${index}`}
                              onClick={() =>
                                handleLocateFieldPage(item.page_num)
                              }
                              className={`cursor-pointer rounded-xl border p-4 transition-all duration-200
                                ${
                                  isActive
                                    ? "border-blue-500 bg-blue-50 shadow-sm"
                                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm active:scale-[0.99]"
                                }`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-left text-sm font-semibold text-blue-600">
                                  {item.field_name}
                                </div>

                                <div
                                  className="flex items-center gap-2"
                                  onClick={(e) => e.stopPropagation()}>
                                  <span className="text-xs text-slate-500">
                                    页码
                                  </span>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={viewerPage ?? ""}
                                    onChange={(e) =>
                                      handlePageNumChange(index, e.target.value)
                                    }
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    className="h-8 w-20"
                                  />
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-[80px_1fr] gap-2 text-sm">
                                <div>
                                  <span className="pt-2 text-slate-500">
                                    提取结果
                                  </span>
                                  <span>
                                    {hasDifference ? (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs">
                                        已复核
                                      </Badge>
                                    ) : null}
                                  </span>
                                </div>
                                <textarea
                                  value={item.field_value || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    handleFieldValueChange(
                                      index,
                                      e.target.value,
                                    )
                                  }
                                  className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-blue-100 p-3 text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                                  placeholder="请输入提取结果"
                                />
                              </div>
                              {hasDifference && (
                                <div className="mt-5 grid grid-cols-[80px_1fr] gap-2 text-sm">
                                  <div className="text-slate-500">
                                    <span>AI提取结果</span>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-3 text-slate-700 overflow-wrap-break-word whitespace-normal border border-blue-100">
                                    {matchedAIField?.extract_value ||
                                      "暂无AI提取结果"}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">暂无提取内容</div>
                    )}
                  </div>

                  <div>
                    <div className="mb-3 text-sm font-semibold text-slate-800">
                      判别结果
                    </div>

                    {hasJudgedFields ? (
                      <div className="space-y-4">
                        {editableJudgedFields.map((item, index) => {
                          const matchedAIField = detail?.ai_judged_fields?.find(
                            (el) => el.judged_name === item.judged_name,
                          )
                          const hasDifference =
                            matchedAIField &&
                            matchedAIField.judged_value !== item.judged_value
                          return (
                            <div
                              key={`${item.judged_name}-${index}`}
                              className={`rounded-xl p-4 transition hover:shadow-sm ${
                                item.judged_name.startsWith("最终违规判定")
                                  ? "border-2 border-blue-500 bg-blue-50"
                                  : "border border-slate-200"
                              }`}>
                              <div className="text-sm font-semibold text-slate-700">
                                {item.judged_name}
                              </div>
                              {item.judged_name.startsWith("最终违规判定") && (
                                <div className="mt-1 flex items-center gap-4 flex-wrap">
                                  <span className="px-2 py-0.5 text-xs rounded-md bg-blue-500 text-white whitespace-nowrap">
                                    最终结果
                                  </span>

                                  <div className="text-sm font-semibold text-blue-700 whitespace-nowrap">
                                    ✅ 请确认：AI最终判定结果是否正确
                                  </div>

                                  <div className="flex items-center gap-6 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                      <input
                                        type="radio"
                                        name={`correct-${index}`}
                                        value="yes"
                                        checked={isCorrect === "yes"}
                                        onChange={() =>
                                          handleCorrectChange("yes")
                                        }
                                      />
                                      <span>正确</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                                      <input
                                        type="radio"
                                        name={`correct-${index}`}
                                        value="no"
                                        checked={isCorrect === "no"}
                                        onChange={() =>
                                          handleCorrectChange("no")
                                        }
                                      />
                                      <span>有误</span>
                                    </label>
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 grid grid-cols-[80px_1fr] gap-2 text-sm">
                                <div>
                                  <span>
                                    <span className="text-slate-500">
                                      判别结果
                                    </span>
                                    {hasDifference ? (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs">
                                        已复核
                                      </Badge>
                                    ) : null}
                                  </span>
                                </div>
                                <textarea
                                  value={item.judged_value || ""}
                                  onChange={(e) =>
                                    handleJudgedValueChange(
                                      index,
                                      e.target.value,
                                    )
                                  }
                                  className="min-h-[72px] w-full rounded-lg border border-slate-200 bg-blue-100 p-3 text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                                  placeholder="请输入判别结果"
                                />
                              </div>
                              {hasDifference && (
                                <div className="mt-5 grid grid-cols-[80px_1fr] gap-2 text-sm">
                                  <div className="text-slate-500">
                                    <span>AI提取结果</span>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-3 text-slate-700 overflow-wrap-break-word whitespace-normal border border-blue-100">
                                    {matchedAIField?.judged_value ||
                                      "暂无AI判别结果"}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">暂无判别结果</div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || submitting || !detail || !taskId}>
                {submitting ? "提交中..." : "提交修改"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditDetailDialog
