import React, { useEffect, useState, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { createPortal } from "react-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Ban,
  FileText,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { getTaskStatusReport, exportFailures } from "@/api/processStatus"
import {
  StatusReportData,
  ProcessStageKey,
  StatusState,
} from "@/types/processStatus"
import { useTaskStore } from "@/context/TaskContext"

// 定义显示的阶段和顺序，必须与 JSON key 对应
const STAGE_CONFIG: { key: ProcessStageKey; label: string }[] = [
  { key: "upload", label: "上传" },
  { key: "download", label: "下载" },
  { key: "decompress", label: "解压" },
  { key: "convert", label: "转换" },
  { key: "organize", label: "裁剪" },
  { key: "parse", label: "解析" },
  { key: "chunk", label: "分块" },
  { key: "extract", label: "提取" },
  { key: "judge", label: "判别" },
  { key: "generate", label: "生成" },
]

// 状态图标组件
const StatusIcon = ({
  status,
  // time,
  tooltipContent, // 0109新增
}: {
  status: StatusState | undefined
  tooltipContent?: string
}) => {
  const currentStatus = status || "pending"
  const [showTooltip, setShowTooltip] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const iconRef = useRef<HTMLDivElement>(null)

  const iconMap = {
    // 成功：绿色勾选圆，语义明确，色彩积极
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,

    // 处理中：蓝色旋转Loading，视觉焦点，代表"正在发生"
    processing: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,

    // 失败：红色叉号圆，警示色
    failed: <XCircle className="h-5 w-5 text-red-500" />,

    // 跳过：浅灰色禁用符，表示"非异常的未执行"，降低关注度
    skipped: <Ban className="h-4 w-4 text-slate-300" />,

    // 等待：极简的浅灰空心圆，仅作为占位符，极度弱化
    pending: <Circle className="h-3.5 w-3.5 text-orange-200" />,
  }

  // 计算位置逻辑
  const handleMouseEnter = () => {
    if (!tooltipContent || !iconRef.current) return
    const rect = iconRef.current.getBoundingClientRect()
    setCoords({
      // 图标顶部位置，减去8px作为间距
      top: rect.top - 8,
      // 图标中心位置
      left: rect.left + rect.width / 2,
    })
    setShowTooltip(true)
  }

  return (
    <>
      <div
        ref={iconRef}
        className="flex flex-col items-center justify-center cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}>
        {iconMap[currentStatus]}
      </div>

      {/* 
         使用 Portal 将悬浮层渲染到 body 节点，彻底解决表格 overflow 遮挡问题 
         transform: translate(-50%, -100%) 实现了基于内容的自动宽高定位（始终居中并位于上方）
      */}
      {showTooltip &&
        tooltipContent &&
        createPortal(
          <div
            className="fixed z-[99999] pointer-events-none"
            style={{
              top: coords.top,
              left: coords.left,
              transform: "translate(-50%, -100%)", // 核心：让其自动向上、居中位移
            }}>
            {/* 内容框：最大宽度300px，内容过长自动换行，高度自适应 */}
            <div className="bg-slate-800/95 backdrop-blur-sm text-white text-[10px] leading-tight p-2 rounded shadow-xl max-w-[300px] min-w-[120px] whitespace-normal break-words text-center border border-slate-700">
              {tooltipContent}
            </div>
            {/* 小三角装饰 */}
            <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700 relative z-10"></div>
          </div>,
          document.body,
        )}
    </>
  )
}

const ProcessStatusPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  // 使用正确的 Hook 获取全局选中的任务ID
  const { selectedTaskId } = useTaskStore()
  // 优先使用 URL 参数，如果没有则使用全局选中的任务 ID
  const taskId = searchParams.get("taskId") || selectedTaskId
  const [data, setData] = useState<StatusReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [jumpPage, setJumpPage] = useState("")
  //1227修改
  const pageSize = 20 // 每页显示 20 条
  //修改结束
  const fetchData = async () => {
    if (!taskId) return
    // 首次加载显示 loading，后续轮询不显示全屏 loading
    if (!data) setLoading(true)
    //1227修改
    const res = await getTaskStatusReport(taskId, 1, 10000) // 获取所有数据以便分页
    //修改结束
    if (res.success && res.data) {
      setData(res.data)
      setError(null)
    } else {
      setError(res.msg)
    }
    setLoading(false)
  }

  const handleExportFailures = async () => {
    if (!taskId) return
    await exportFailures(taskId)
  }

  useEffect(() => {
    fetchData()
    // 设置轮询，每3秒刷新一次数据
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [taskId])

  // 当任务ID变化时，重置页码
  useEffect(() => {
    setCurrentPage(1)
  }, [taskId])

  // 此时 data.files.list 包含了成千上万条数据
  const allFiles = data?.files?.list || []
  const totalItems = allFiles.length // 真实的全部数量
  const totalPages = Math.ceil(totalItems / pageSize)

  // 确保当前页码有效
  const safeCurrentPage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, totalPages),
  )

  const startIndex = (safeCurrentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentFiles = allFiles.slice(startIndex, endIndex)

  // 分页处理函数
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1)
  }

  const handleJumpPage = () => {
    const targetPage = Number(jumpPage)

    if (!Number.isInteger(targetPage) || targetPage < 1 || totalPages < 1) {
      return
    }

    setCurrentPage(Math.min(Math.max(targetPage, 1), totalPages))
    setJumpPage("")
  }

  // 将 files 对象转换为数组以便渲染
  // const fileList = data?.files?.list || [];

  return (
    <>
      <div className="p-6 space-y-6 h-full flex flex-col bg-slate-50/50 min-h-screen">
        {/* 如果没有选择任务，显示提示 */}
        {!taskId && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">未选择任务</AlertTitle>
            <AlertDescription className="text-yellow-700">
              当前未选择任务，请在在文件上传与下载界面选择一个任务以查看处理日志。
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>获取数据失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 主体容器：包含 Header 和 Table */}
        <Card className="flex-1 shadow-sm border overflow-hidden flex flex-col">
          {/* 1. 顶部区域 Header */}
          <div className="flex flex-col lg:flex-row border-b bg-white">
            {/* Header Left: 标题 + 导出 */}
            <div className="p-4 lg:w-[580px] flex items-center justify-between border-b lg:border-b-0 lg:border-r shrink-0 bg-slate-50/30">
              <div className="flex items-center gap-2 font-semibold text-lg text-slate-800">
                <FileText className="h-5 w-5 text-primary" />
                文件处理详情
                <span className="text-xs font-normal text-muted-foreground ml-2 bg-slate-100 px-2 py-0.5 rounded-full">
                  {/* 显示实际加载到的总数 */}共 {totalItems} 个
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportFailures}
                disabled={!taskId}
                className="h-8">
                <Download className="mr-2 h-3.5 w-3.5" />
                导出日志
              </Button>
            </div>

            {/* Header Right: 阶段统计卡片 */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex min-w-max py-3 pr-4">
                {data || !taskId
                  ? STAGE_CONFIG.map((stage) => {
                      const stats = data?.summary?.[stage.key] || {
                        total: 0,
                        success: 0,
                        failed: 0,
                        skipped: 0,
                      }
                      return (
                        // 这里的宽度 w-[100px] 与下方表格列宽保持视觉一致
                        <div
                          key={stage.key}
                          className="w-[100px] flex-none px-1.5">
                          <div className="flex flex-col items-center justify-center py-2 bg-slate-50/80 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors h-full">
                            <span className="text-[11px] font-medium text-slate-500 mb-1">
                              {stage.label}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-base font-bold text-slate-900">
                                {stats.total}
                              </span>
                              <span className="text-[10px] text-slate-300">
                                /
                              </span>
                              <span className="text-sm font-bold text-green-600">
                                {stats.success}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  : // 骨架屏
                    Array(10)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className="w-[100px] h-12 bg-slate-50 animate-pulse mx-1 rounded"
                        />
                      ))}
              </div>
            </div>
          </div>

          {/* 2. 底部文件列表 */}
          <div className="flex-1 overflow-auto bg-gray-100">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  {/* 1225[修改] 增加地块编码列，调整宽度 */}
                  <TableHead className="w-[180px] pl-6">地块编码</TableHead>
                  <TableHead className="w-[550px]">文件名</TableHead>

                  <TableHead className="w-[100px]">整体状态</TableHead>
                  <TableHead className="w-[180px]">更新时间</TableHead>
                  {/* 这里的列宽 w-[100px] 与上方统计卡片宽度一致 */}
                  {STAGE_CONFIG.map((stage) => (
                    <TableHead
                      key={stage.key}
                      className="text-center w-[100px]">
                      {stage.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentFiles.map((file) => (
                  <TableRow
                    key={file.primary_key || file.file_name}
                    className="hover:bg-slate-50/50">
                    {/* 1225[新增] 第一列：地块编码 */}
                    <TableCell className="font-medium pl-6 text-slate-700">
                      <span
                        className="block w-[150px] overflow-hidden whitespace-normal break-all leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]"
                        title={file.primary_key}>
                        {file.primary_key}
                      </span>
                    </TableCell>
                    {/* 1225[修改] 第二列：文件名 (原第一列) */}
                    <TableCell>
                      <div className="flex flex-col">
                        {/* -------------------20260303修改----------------- */}
                        <div className="flex items-start gap-2">
                          <span
                            className="max-w-[530px] overflow-hidden whitespace-normal break-all text-slate-700 leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]"
                            title={file.file_name}>
                            {file.file_name}
                          </span>
                          {/* 2026-03：解压阶段“成功但无有效文件”标注 */}
                          {String(
                            (file as any)?.decompress?.error || "",
                          ).includes("无符合条件的文件") && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              无符合文件
                            </Badge>
                          )}
                        </div>
                        {/* -------------------20260303修改结束----------------- */}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* [修改] 根据状态显示不同颜色的 Badge */}
                      <Badge
                        variant="outline"
                        className={`font-normal border
                          ${
                            file.final_status === "processing"
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : ""
                          }
                          ${
                            file.final_status === "success"
                              ? "bg-green-50 text-green-600 border-green-200"
                              : ""
                          }
                          ${
                            file.final_status === "failed"
                              ? "bg-red-50 text-red-600 border-red-200"
                              : ""
                          }
                          ${
                            !["processing", "success", "failed"].includes(
                              file.final_status || "",
                            )
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : ""
                          }
                        `}>
                        {file.final_status === "processing"
                          ? "处理中"
                          : file.final_status === "success"
                            ? "成功"
                            : file.final_status === "failed"
                              ? "失败"
                              : file.final_status || "等待"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {file.updated_at}
                    </TableCell>

                    {STAGE_CONFIG.map((stage) => {
                      // [0109修改] 优先使用后端传来的 stage_hover 自定义提示信息
                      // 失败时这里是错误信息，成功时是时间
                      const hoverText =
                        (file as any).stage_hover?.[stage.key] ||
                        file[stage.key]?.time
                      return (
                        <TableCell
                          key={stage.key}
                          className="text-center p-0 h-14">
                          <StatusIcon
                            status={file[stage.key]?.status}
                            tooltipContent={hoverText} // 0109
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
                {currentFiles.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="h-32 text-center text-muted-foreground">
                      {taskId
                        ? "暂无文件数据"
                        : "请先选择一个任务以查看处理日志"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* {3. 底部翻页栏} */}
          {totalItems > 0 && (
            <div className="border-t py-2 px-4 flex items-center justify-between bg-slate-50/50">
              <div className="text-sm text-muted-foreground">
                显示 {startIndex + 1} 到 {Math.min(endIndex, totalItems)} 条，共{" "}
                {totalItems} 条
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="h-8 px-3">
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <div className="text-sm font-medium min-w-[3rem] text-center">
                  {safeCurrentPage} / {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-3">
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="ml-2 flex items-center gap-2 text-sm text-muted-foreground">
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
                    className="h-8 w-16 rounded border border-gray-300 bg-white px-2 text-center outline-none focus:border-[#1890ff] focus:ring-2 focus:ring-[#1890ff]/15"
                  />
                  <span>页</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleJumpPage}
                    className="h-8 px-3">
                    确定
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

export default ProcessStatusPage
