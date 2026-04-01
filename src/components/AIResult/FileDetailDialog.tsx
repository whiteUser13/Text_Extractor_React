import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "/pdf.worker.min.mjs",
  import.meta.url,
).toString()

export type ExtractedFieldItem = {
  field_name: string
  field_value: string
  page_num: number // 后端原始页码：-1=未定位，0=PDF第一页
}
export type AIExtractedFieldItem = {
  extract_name: string
  extract_value: string
}
export type JudgedFiledItem = {
  judged_name: string
  judged_value: string
}

export type PDFDetailInfo = {
  file_name: string
  pdf_url: string
  extracted_fields?: ExtractedFieldItem[]
  ai_extracted_fields?: AIExtractedFieldItem[]
  judged_fields?: JudgedFiledItem[]
  ai_judged_fields?: JudgedFiledItem[]
}

interface FileDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading?: boolean
  detail: PDFDetailInfo | null
}

const FileDetailDialog: React.FC<FileDetailDialogProps> = ({
  open,
  onOpenChange,
  loading = false,
  detail,
}) => {
  const [currentPdfPage, setCurrentPdfPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [rightTab, setRightTab] = useState<"extract" | "judge">("extract")

  const token = localStorage.getItem("token") || ""

  // 0324修改：后端原始页码 -> PDF预览页码
  const rawPageToViewerPage = (rawPage: number | null | undefined) => {
    if (rawPage === null || rawPage === undefined || rawPage < 0) return null
    return rawPage + 1
  }

  const handleLocateFieldPage = (rawPageNum: number) => {
    const viewerPage = rawPageToViewerPage(rawPageNum)
    if (viewerPage === null) return
    setCurrentPdfPage(viewerPage)
  }

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCurrentPdfPage(1)
      setNumPages(0)
    }
    onOpenChange(nextOpen)
  }

  const formatValue = (v: any) => {
    if (v === null || v === undefined) return ""
    if (typeof v === "string") return v
    try {
      return JSON.stringify(v, null, 2)
    } catch {
      return String(v)
    }
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

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPdfPage <= 1}
                  onClick={() =>
                    setCurrentPdfPage((prev) => Math.max(prev - 1, 1))
                  }>
                  上一页
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={numPages === 0 || currentPdfPage >= numPages}
                  onClick={() =>
                    setCurrentPdfPage((prev) =>
                      numPages ? Math.min(prev + 1, numPages) : prev,
                    )
                  }>
                  下一页
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="flex justify-center">
                {loading ? (
                  <div className="text-sm text-slate-500">详情加载中...</div>
                ) : detail?.pdf_url ? (
                  <Document
                    file={{
                      url: detail.pdf_url,
                    }}
                    options={{
                      httpHeaders: {
                        Authorization: `Bearer ${token}`,
                      },
                      withCredentials: true,
                    }}
                    onLoadSuccess={({ numPages }) => {
                      setNumPages(numPages)
                      if (currentPdfPage > numPages) {
                        setCurrentPdfPage(1)
                      }
                    }}
                    loading={
                      <div className="text-sm text-slate-500">
                        PDF 加载中...
                      </div>
                    }
                    error={
                      <div className="text-sm text-red-500">PDF 加载失败</div>
                    }>
                    <Page
                      pageNumber={currentPdfPage}
                      width={700}
                      renderTextLayer
                      renderAnnotationLayer
                    />
                  </Document>
                ) : (
                  <div className="text-sm text-slate-500">暂无 PDF</div>
                )}
              </div>
            </div>
          </div>

          <div className="w-[42%] flex flex-col bg-white min-h-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="flex items-center justify-between">
                <span>内容信息</span>
                <Tabs
                  value={rightTab}
                  onValueChange={(v) => setRightTab(v as any)}
                  className="w-[220px]">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="extract">提取信息</TabsTrigger>
                    <TabsTrigger value="judge">判别信息</TabsTrigger>
                  </TabsList>
                </Tabs>
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 min-h-0 px-6 py-4">
              {rightTab === "extract" ? (
                loading ? (
                  <div className="text-sm text-slate-500">
                    提取内容加载中...
                  </div>
                ) : detail?.extracted_fields?.length ? (
                  <div className="space-y-4">
                    {detail.extracted_fields.map((item, index) => {
                      const viewerPage = rawPageToViewerPage(item.page_num)
                      const matchedAIField = detail.ai_extracted_fields?.find(
                        (el) => el.extract_name === item.field_name,
                      )
                      const hasDifference =
                        matchedAIField &&
                        matchedAIField.extract_value !== item.field_value
                      return (
                        <div
                          key={`${item.field_name}-${index}`}
                          onClick={() => handleLocateFieldPage(item.page_num)}
                          className="rounded-xl border border-slate-200 p-4 hover:shadow-sm transition cursor-pointer">
                          <div className="flex items-start justify-between gap-3">
                            <button className="text-left text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                              {item.field_name}
                            </button>

                            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600">
                              {viewerPage !== null
                                ? `第 ${viewerPage} 页`
                                : "未定位"}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-[80px_1fr] gap-2 text-sm">
                            <div>
                              <span className="text-slate-500">提取结果</span>
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
                            <div className="rounded-lg bg-blue-100 p-3 text-slate-700 break-words whitespace-pre-wrap">
                              {item.field_value || "暂无提取结果"}
                            </div>
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
                )
              ) : loading ? (
                <div className="text-sm text-slate-500">判别信息加载中...</div>
              ) : detail?.judged_fields?.length ? (
                <div className="space-y-4">
                  {detail.judged_fields.map((item, index) => {
                    const matchedAIField = detail.ai_judged_fields?.find(
                      (el) => el.judged_name === item.judged_name,
                    )
                    const hasDifference =
                      matchedAIField &&
                      matchedAIField.judged_value !== item.judged_value
                    return (
                      <div
                        key={`${item.judged_name}-${index}`}
                        className="rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-left text-sm font-semibold text-slate-800">
                            {item.judged_name}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-[80px_1fr] gap-2 text-sm">
                          <div>
                            <span>
                              <span className="text-slate-500">判别结果</span>
                              {hasDifference ? (
                                <Badge
                                  variant="destructive"
                                  className="text-xs">
                                  已复核
                                </Badge>
                              ) : null}
                            </span>
                          </div>

                          <div className="rounded-lg bg-blue-100 p-3 text-slate-700 break-words whitespace-pre-wrap max-h-[220px] overflow-auto">
                            {formatValue(item.judged_value) || "暂无判别结果"}
                          </div>
                        </div>
                        {hasDifference && (
                          <div className="mt-5 grid grid-cols-[80px_1fr] gap-2 text-sm">
                            <div className="text-slate-500">
                              <span>AI提取结果</span>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3 text-slate-700 overflow-wrap-break-word whitespace-normal border border-blue-100">
                              {matchedAIField?.judged_value || "暂无AI判别结果"}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  暂无判别信息（未判别或判别失败未返回字段）
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FileDetailDialog
