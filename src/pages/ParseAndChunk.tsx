import React, { useEffect, useMemo, useState, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ProgressBar from "@/components/ui/progressbar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import DataList from "@/components/FileUpload/DataList" // 引入 DataList 组件
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  Loader2,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Folder as FolderIcon,
  Search as SearchIcon,
  Eye,
  AlertCircle,
  Archive,
  // Table,   12.27改：删除Table
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"
import apiClient from "@/api/index"
import { useTaskStore } from "@/context/TaskContext" // 导入任务上下文
import {
  getParseTasksInfo,
  addParseTask,
  ParseTaskInfo,
  retryErrorParse,
  addPureTXTParseTask,
} from "@/api/parseChunk"
// 统一后端/前端使用的 rid：去路径、去扩展名、去 ~$ 前缀
const normalizeRid = (v: string) => {
  if (!v) return ""
  const base = v.split(/[\\/]/).pop() || v
  const noTemp = base.startsWith("~$") ? base.slice(2) : base
  return noTemp.replace(/\.[^\.]+$/, "")
}

/** --------- 数据类型 --------- **/
interface DecompressedFolder {
  area_code: string
  folder_name: string
  download_time: string // 已格式化
  status: string
  file_type?: "pdf" | "word" // 新增，可选字段
}
interface ParsedFolder {
  area_code: string
  name: string
  files: string[] // ["images", "<rid>.md", "<rid>_content_list.json"]
}

interface ChunkResultFolder {
  area_code: string
  name: string
  files: string[] // ["images", "<rid>_parsed.json"]
}

/** ===== API BASE & 请求封装 ===== **/
// const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? ""
const API_BASE = apiClient.defaults.baseURL || ""

/** 拼接 API_BASE 与绝对路径（以 / 开头） */
function withBase(path: string) {
  const base = `${API_BASE}`.replace(/\/+$/, "")
  return `${base}${path}`
}

// 修改 API 函数以包含任务ID参数
async function apiGet<T = any>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(withBase(path), window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })
  }
  const r = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
  })
  return r.json()
}

async function apiPost<T = any>(path: string, body: any): Promise<T> {
  const r = await fetch(withBase(path), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  return r.json()
}

/** 以 Blob 方式下载（避免相对路径不可访问导致失败） */
async  function downloadFile(url: string, filename?: string) { // 1.9修改
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
  })
  if (!resp.ok) {
    throw new Error(`下载失败（${resp.status}）`)
  }
  const blob = await resp.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = filename || url.split("/").pop() || "download"
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}


// 1.9修改：带 token 的“查看/预览”能力（新标签页打开），用于替代 a.href 直链（无法携带 Authorization Header）
async function viewFileWithToken(url: string, mimeHint?: string) {
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
  if (!resp.ok) {
    throw new Error(`打开失败（${resp.status}）`)
  }

  const contentType =
    resp.headers.get("content-type") || mimeHint || "application/octet-stream"
  const blob = await resp.blob()
  // 给 blob 兜底一个类型，避免后端不返回 content-type 时预览异常
  const fixedBlob = blob.slice(0, blob.size, contentType)

  const objectUrl = URL.createObjectURL(fixedBlob)
  const win = window.open(objectUrl, "_blank", "noopener,noreferrer")
  if (!win) {
    // 弹窗被拦截时兜底
    const a = document.createElement("a")
    a.href = objectUrl
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  // 延迟释放，避免新页尚未加载完成就 revoke
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

/** 时间工具：把后端 mtime（秒）→ "YYYY-MM-DD HH:mm" */
function formatTs(tsLike: number | string): string {
  const n = typeof tsLike === "number" ? tsLike : Number(tsLike)
  const d = new Date(n * 1000) // 如果你的 st_mtime 是毫秒，请改成 new Date(n)
  const pad = (x: number) => String(x).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

/** ============ 组件 ============ **/
const ParseAndChunk: React.FC = () => {
  const { toast } = useToast()
  const { selectedTaskId } = useTaskStore() // 获取当前选中的任务ID

  /** 已解压（来自后端 /api/decompressed） */
  const [decompressed, setDecompressed] = useState<DecompressedFolder[]>([])
  const [decOpen, setDecOpen] = useState(false)
  const [decLoading, setDecLoading] = useState(false)
  const [selectedDec, setSelectedDec] = useState<string[]>([]) // 选中的 area_code

  /** 解析结果（来自后端 /api/parsed 或 /api/parse 返回） */
  const [parsedFolders, setParsedFolders] = useState<ParsedFolder[]>([])
  const [parseLoading, setParseLoading] = useState(false)

  /** 解析结果筛选 */
  const [parseFilter, setParseFilter] = useState("")

  /** 解析完成的 JSON 选择（每个文件夹仅 1 个） */
  const [jsonOpen, setJsonOpen] = useState(false)
  const [selectedJsonByFolder, setSelectedJsonByFolder] = useState<
    Record<string, string>
  >({})
  const selectedJsonCount = useMemo(
    () => Object.keys(selectedJsonByFolder).length,
    [selectedJsonByFolder]
  )

  // 解析日志表格
  const [parseTotal, setParseTotal] = useState(0)
  const [parseCompleted, setParseCompleted] = useState(0)
  const [parseError, setParseError] = useState(0)
  const [parseTasks, setParseTasks] = useState<ParseTaskInfo[]>([])
  const parseTaskTabColumns = [
    { key: "file_name", label: "文件名" },
    { key: "created_at", label: "创建时间" },
    {
      key: "status",
      label: "状态",
      render: (value: string) => {
        return (
          <div>
            <div
              className={`inline-block w-3 h-3 rounded-full ${getStatusColor(
                value
              )}`}
            />
            <span> {getStatusLabel(value)}</span>
          </div>
        )
      },
    },
    {
      key: "msg",
      label: "信息",
      render: (value: string) => {
        if (value) {
          return (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 red" />
              </TooltipTrigger>
              <TooltipContent className="w-[400px]">
                <p>{value}</p>
              </TooltipContent>
            </Tooltip>
          )
        }
        return <div></div>
      },
    },
    {
      key: "select_type",
      label: "选择解析方式",
      render: (value: string) => {
        return (
          <div>
            <span> {getParseStyle(value)}</span>
          </div>
        )
      },
    },
    {
      key: "used",
      label: "最终使用方式",
      render: (value: string) => {
        return (
          <div>
            <span> {getParseStyle(value)}</span>
          </div>
        )
      },
    },
  ]
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "parsed":
        return "bg-green-500"
      case "pending":
        return "bg-blue-500"
      case "error":
        return "bg-red-500"
      case "parsing":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "parsed":
        return "解析成功"
      case "pending":
        return "未解析"
      case "error":
        return "解析失败"
      case "parsing":
        return "解析中"
      default:
        return "未知"
    }
  }
  const getParseStyle = (status: string): string => {
    switch (status) {
      case "mineru":
        return "mineru解析"
      case "pure_txt":
        return "文本解析"
      default:
        return "未知"
    }
  }

  //获取解析信息管理
  const getParseTasks = () => {
    if (selectedTaskId) {
      getParseTasksInfo(selectedTaskId).then((result) => {
        if (result.success) {
          const sortedData = result.data.sort((a, b) => {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            )
          })
          setParseTasks(sortedData)
          let errorCounts = 0
          let successCounts = 0
          setParseTotal(sortedData.length)
          sortedData.forEach((task) => {
            if (task.status == "error") {
              errorCounts++
            } else if (task.status == "parsed") {
              successCounts++
            }
          })
          setParseCompleted(successCounts)
          setParseError(errorCounts)
          console.log(sortedData)
        } else {
          toast({
            title: "获取下载任务信息失败",
            description: result.msg,
          })
        }
      })
    } else {
      toast({
        title: "请先选择任务",
        variant: "destructive",
      })
    }
  }
  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    // ① 进入页面立刻请求一次
    getParseTasks()

    // ② 启动轮询
    timerRef.current = window.setInterval(() => {
      getParseTasks()
    }, 10000)

    // ③ 离开页面时清除
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])
  // 解析错误重试
  //下载重试
  const retryParseError = () => {
    if (selectedTaskId) {
      retryErrorParse(selectedTaskId).then((result) => {
        console.log(result.data)
        if (result.success) {
          toast({
            title: "刷新成功",
            description: result.msg,
          })
          getParseTasks()
        } else {
          toast({
            title: "获取下载任务信息失败",
            description: result.msg,
          })
        }
      })
    } else {
      toast({
        title: "请先选择任务",
        variant: "destructive",
      })
    }
  }

  /** 分块（来自后端 /api/chunk 或 /api/chunk-results） */
  const [chunkLoading, setChunkLoading] = useState(false)
  const [chunkResults, setChunkResults] = useState<ChunkResultFolder[]>([]) // 分块结果清单

  /** 分块结果筛选 */
  const [chunkFilter, setChunkFilter] = useState("")

  /** 日志（简单输出） */
  const [logs, setLogs] = useState<string[]>([])

  // 用来存储文件的详细状态数据
  const [fileData, setFileData] = useState<any[]>([])
  // 在现有的状态定义附近添加
  const [recordData, setRecordData] = useState<{
    parsed: string[]
    chunked: string[]
  }>({ parsed: [], chunked: [] })

  // 添加获取文件大小的辅助函数 - 使用新的后端接口
  const getFileSize = async (fileName: string): Promise<string> => {
    try {
      const response = await apiGet<{ code: number; data: any; msg: string }>(
        "/api/parse/mineru/file-sizes",
        { task_id: selectedTaskId } // 添加任务ID参数
      )
      if (response?.code === 0 && response.data) {
        const rid = normalizeRid(fileName)
        const fileInfo = response.data[rid] ?? response.data[fileName]
        if (fileInfo && fileInfo.size_kb) {
          return `${fileInfo.size_kb} KB`
        }
      }
    } catch (error) {
      console.error("获取文件大小失败:", error)
    }
    return "未知"
  }

  // 从已解压文件初始化日志数据
  const initializeLogDataFromDecompressed = async (
    decompressedList: DecompressedFolder[]
  ) => {
    try {
      // 从新的后端接口获取文件大小信息
      const response = await apiGet<{ code: number; data: any; msg: string }>(
        "/api/parse/mineru/file-sizes",
        { task_id: selectedTaskId } // 添加任务ID参数
      )
      const fileSizeMap = new Map()

      if (response?.code === 0 && response.data) {
        Object.values(response.data).forEach((fileInfo: any) => {
          fileSizeMap.set(fileInfo.area_code, fileInfo)
        })
      }

      const logData = decompressedList.map((item: DecompressedFolder) => {
        const fileInfo = fileSizeMap.get(item.area_code)
        const size = fileInfo?.size_kb ? `${fileInfo.size_kb} KB` : "未知"
        const sourceDir =
          fileInfo?.source_dir === "extracted/right"
            ? "解压筛选目录"
            : "其他目录"

        return {
          fileName: normalizeRid(item.area_code),
          format: item.file_type === "word" ? "WORD" : "PDF",
          size: size,
          source: sourceDir,
          status: item.status || "等待处理",
          stage: "等待处理",
          parsingStatus: "未开始",
          chunkingStatus: "未开始",
        }
      })

      setFileData(logData)
    } catch (error) {
      console.error("初始化日志数据失败:", error)
      // 如果获取文件信息失败，使用默认数据
      const logData = decompressedList.map((item: DecompressedFolder) => ({
        fileName: normalizeRid(item.area_code),
        format: item.file_type === "word" ? "WORD" : "PDF",
        size: "未知",
        source: "解压筛选目录",
        status: item.status || "等待处理",
        stage: "等待处理",
        parsingStatus: "未开始",
        chunkingStatus: "未开始",
      }))
      setFileData(logData)
    }
  }

  // 添加更新后端状态的函数
  const updateBackendFileStatus = async (
    fileName: string,
    status: string,
    stage: string,
    parsingStatus: string,
    chunkingStatus: string
  ) => {
    try {
      await apiPost("/api/parse/update-file-status", {
        file_name: fileName,
        status,
        stage,
        parsingStatus,
        chunkingStatus,
        task_id: selectedTaskId, // 添加任务ID
      })
    } catch (error) {
      console.error("更新后端文件状态失败:", error)
    }
  }

  // 修改 handleLogUpdate 函数，允许更新已存在的文件和添加解析/分块相关的文件
  const handleLogUpdate = (
    fileName: string,
    status: string,
    stage: string,
    parsingStatus: string,
    chunkingStatus: string,
    fileSize?: string // 新增可选参数
  ) => {
    setFileData((prevData) => {
      const existingFile = prevData.find((file) => file.fileName === fileName)

      if (existingFile) {
        // 更新现有文件
        return prevData.map((file) =>
          file.fileName === fileName
            ? {
                ...file,
                status,
                stage,
                parsingStatus,
                chunkingStatus,
                size: fileSize || file.size, // 如果有新的大小则更新，否则保持原大小
              }
            : file
        )
      } else {
        // 允许添加解析和分块相关的文件
        const isInParsed = parsedFolders.some(
          (folder) => normalizeRid(folder.area_code) === fileName
        )
        const isInChunked = chunkResults.some(
          (result) => result.area_code === fileName
        )

        if (isInParsed || isInChunked) {
          const newFile = {
            fileName,
            format: fileName.includes(".")
              ? fileName.split(".").pop()?.toUpperCase() || "未知"
              : "未知",
            size: fileSize || "未知", // 使用传入的大小或默认值
            source: isInParsed ? "已解析文件" : "已分块文件",
            status,
            stage,
            parsingStatus,
            chunkingStatus,
          }
          return [...prevData, newFile]
        } else {
          // 不允许添加无关文件
          console.warn(`尝试添加不相关的文件到日志: ${fileName}`)
          return prevData
        }
      }
    })

    // 同时更新后端状态
    updateBackendFileStatus(
      fileName,
      status,
      stage,
      parsingStatus,
      chunkingStatus
    )
  }

  // 修改同步解析和分块结果到日志的函数
  const syncParsedAndChunkedToLogs = async () => {
    // 使用Map来避免重复文件
    const fileMap = new Map<string, any>()

    // 首先将现有文件添加到Map
    fileData.forEach((file) => {
      fileMap.set(file.fileName, file)
    })

    // 将解析结果添加到日志
    for (const folder of parsedFolders) {
      const existing = fileMap.get(normalizeRid(folder.area_code))
      if (!existing) {
        const fileSize = await getFileSize(normalizeRid(folder.area_code))
        fileMap.set(normalizeRid(folder.area_code), {
          fileName: normalizeRid(folder.area_code),
          format: "未知", // 需要从后端获取实际格式
          size: fileSize,
          source: "已解析文件",
          status: "等待分块",
          stage: "解析完成",
          parsingStatus: "解析成功",
          chunkingStatus: "未开始",
        })
      } else {
        // 如果已经存在，确保解析状态正确
        fileMap.set(normalizeRid(folder.area_code), {
          ...existing,
          parsingStatus: "解析成功",
          status:
            existing.chunkingStatus === "分块成功" ? "处理完成" : "等待分块",
          stage:
            existing.chunkingStatus === "分块成功" ? "分块完成" : "解析完成",
          source: "已解析文件",
        })
      }
    }

    // 将分块结果添加到日志
    for (const result of chunkResults) {
      const existing = fileMap.get(result.area_code)
      if (!existing) {
        const fileSize = await getFileSize(result.area_code)
        fileMap.set(result.area_code, {
          fileName: result.area_code,
          format: "未知",
          size: fileSize,
          source: "已分块文件",
          status: "处理完成",
          stage: "分块完成",
          parsingStatus: "解析成功", // 已分块的文件应该已经解析过了
          chunkingStatus: "分块成功",
        })
      } else {
        // 如果已经存在，确保分块状态正确
        fileMap.set(result.area_code, {
          ...existing,
          chunkingStatus: "分块成功",
          status: "处理完成",
          stage: "分块完成",
          source: "已分块文件",
        })
      }
    }

    // 转换回数组并更新状态
    setFileData(Array.from(fileMap.values()))
  }

  // 添加导出统计表格的函数
  const exportStatisticsToExcel = () => {
    try {
      // 准备数据
      const data = fileData.map((file) => ({
        文件名: file.fileName,
        格式: file.format,
        大小: file.size,
        状态: file.status,
        阶段: file.stage,
        解析状态: file.parsingStatus,
        分块状态: file.chunkingStatus,
      }))

      // 计算统计信息
      const totalFiles = fileData.length
      const parsedSuccessCount = fileData.filter(
        (file) => file.parsingStatus === "解析成功"
      ).length
      const chunkSuccessCount = fileData.filter(
        (file) => file.chunkingStatus === "分块成功"
      ).length
      const processingCount = fileData.filter(
        (file) => file.status === "处理中"
      ).length
      const completedCount = fileData.filter(
        (file) => file.status === "处理完成"
      ).length
      const errorCount = fileData.filter(
        (file) => file.status === "处理失败"
      ).length

      // 创建工作簿
      const wb = XLSX.utils.book_new()

      // 添加详细数据表
      const wsData = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, wsData, "文件处理详情")

      // 添加统计信息表
      const statsData = [
        ["统计项目", "数量"],
        ["总文件数", totalFiles],
        ["解析成功", parsedSuccessCount],
        ["分块成功", chunkSuccessCount],
        ["处理中", processingCount],
        ["处理完成", completedCount],
        ["处理失败", errorCount],
        [
          "解析成功率",
          `${((parsedSuccessCount / totalFiles) * 100).toFixed(2)}%`,
        ],
        [
          "分块成功率",
          `${((chunkSuccessCount / totalFiles) * 100).toFixed(2)}%`,
        ],
      ]
      const wsStats = XLSX.utils.aoa_to_sheet(statsData)
      XLSX.utils.book_append_sheet(wb, wsStats, "处理统计")

      // 生成Excel文件 - 使用原生方式下载
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const dataBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // 创建下载链接
      const url = URL.createObjectURL(dataBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `文件处理统计_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "导出成功",
        description: `已导出 ${totalFiles} 个文件的处理统计`,
      })
    } catch (error) {
      console.error("导出Excel失败:", error)
      toast({
        title: "导出失败",
        description: "生成统计表格时出错",
        variant: "destructive",
      })
    }
  }

  // 基于 fileData 计算统计信息和进度
  const fileStats = useMemo(() => {
    const totalFiles = fileData.length
    const parsedSuccessCount = fileData.filter(
      (file) => file.parsingStatus === "解析成功"
    ).length
    const chunkSuccessCount = fileData.filter(
      (file) => file.chunkingStatus === "分块成功"
    ).length
    const processingCount = fileData.filter(
      (file) => file.status === "处理中"
    ).length
    const completedCount = fileData.filter(
      (file) => file.status === "处理完成"
    ).length
    const errorCount = fileData.filter(
      (file) => file.status === "处理失败"
    ).length

    const percent = (num: number) =>
      totalFiles ? Math.round((num / totalFiles) * 100) : 0

    // 修改：计算解析进度时，包含正在解析和已解析成功的文件
    const parsingInProgress = fileData.filter(
      (file) => file.parsingStatus === "解析中"
    ).length
    const parseProgressTotal = parsedSuccessCount + parsingInProgress

    // 修改：计算分块进度时，包含正在分块和已分块成功的文件
    const chunkingInProgress = fileData.filter(
      (file) => file.chunkingStatus === "分块中"
    ).length
    const chunkProgressTotal = chunkSuccessCount + chunkingInProgress

    const completedOrFailed = completedCount + errorCount

    return {
      totalFiles,
      parsedSuccessCount,
      chunkSuccessCount,
      processingCount,
      completedCount,
      errorCount,
      overallProgress: percent(completedOrFailed), // 整体完成进度
      // 修改：解析进度包含正在解析的文件
      parseProgress: percent(parseProgressTotal),
      // 修改：分块进度包含正在分块的文件
      chunkProgress: percent(chunkProgressTotal),
    }
  }, [fileData])

  /** ---- 初始化：加载已解压文件 + 当前已有解析/分块结果 ---- **/
  useEffect(() => {
    if (!selectedTaskId) {
      // 如果没有选择任务，不执行初始化
      toast({
        title: "提示",
        description: "请先选择一个任务",
        variant: "default",
      })
      return
    }

    const boot = async () => {
      setDecLoading(true)
      try {
        // 1) 已解压 - 添加过滤条件和任务ID参数
        const j1 = await apiGet<{ code: number; data: any[]; msg: string }>(
          "/api/parse/mineru/decompressed",
          { task_id: selectedTaskId } // 添加任务ID参数
        )

        let decompressedList: DecompressedFolder[] = []
        if (j1?.code === 0 && Array.isArray(j1.data)) {
          // 添加过滤：只显示 PDF 和 Word 文件，并且状态为 ready 的文件
          const filteredData = j1.data.filter(
            (it: any) =>
              (it.file_type === "pdf" || it.file_type === "word") &&
              it.status === "ready"
          )

          decompressedList = filteredData.map((it: any) => ({
            area_code: it.area_code,
            folder_name: it.folder_name,
            download_time: formatTs(it.download_time),
            status: it.status || "ready",
            file_type: it.file_type as "pdf" | "word" | undefined,
          }))

          setDecompressed(decompressedList)
        }

        // 2) 已有解析结果
        let parsedData: any[] = []
        try {
          const j2 = await apiGet<{ code: number; data: any[] }>(
            "/api/chunk/mineru/parsed",
            { task_id: selectedTaskId } // 添加任务ID参数
          )
          if (j2?.code === 0 && Array.isArray(j2.data)) {
            parsedData = j2.data
            setParsedFolders(j2.data)
          }
        } catch {
          // 忽略错误，保持空数组
        }

        // 3) 已有分块结果
        let chunkedData: any[] = []
        try {
          const j3 = await apiGet<{ code: number; data: any[] }>(
            "/api/chunk/mineru/chunk-results",
            { task_id: selectedTaskId } // 添加任务ID参数
          )
          if (j3?.code === 0 && Array.isArray(j3.data)) {
            chunkedData = j3.data
            setChunkResults(j3.data)
          }
        } catch {
          // 忽略错误，保持空数组
        }

        // 4) 构建完整的文件日志数据
        const allFiles = new Map<string, any>()

        // 首先添加所有已解压的文件
        decompressedList.forEach((item) => {
          const rid = normalizeRid(item.area_code)
          allFiles.set(rid, {
            fileName: rid,
            format: item.file_type === "word" ? "WORD" : "PDF",
            size: "未知",
            source: "解压筛选目录",
            status: "等待处理",
            stage: "等待处理",
            parsingStatus: "未开始",
            chunkingStatus: "未开始",
          })
        })

        // 然后更新已解析的文件状态
        parsedData.forEach((folder) => {
          const existing = allFiles.get(normalizeRid(folder.area_code))
          if (existing) {
            // 更新已存在的文件
            allFiles.set(normalizeRid(folder.area_code), {
              ...existing,
              parsingStatus: "解析成功",
              status:
                existing.chunkingStatus === "分块成功"
                  ? "处理完成"
                  : "等待分块",
              stage:
                existing.chunkingStatus === "分块成功"
                  ? "分块完成"
                  : "解析完成",
              source: "已解析文件",
            })
          } else {
            // 添加已解析但未解压的文件
            allFiles.set(normalizeRid(folder.area_code), {
              fileName: normalizeRid(folder.area_code),
              format: "未知", // 需要从后端获取，但这里我们不知道，因为parsedData里没有文件类型信息
              size: "未知",
              source: "已解析文件",
              status: "等待分块",
              stage: "解析完成",
              parsingStatus: "解析成功",
              chunkingStatus: "未开始",
            })
          }
        })

        // 最后更新已分块的文件状态
        chunkedData.forEach((result) => {
          const existing = allFiles.get(result.area_code)
          if (existing) {
            // 更新已存在的文件
            allFiles.set(result.area_code, {
              ...existing,
              // ✅ 分块完成必然意味着解析已完成；刷新后避免出现“分块成功但解析未开始”
              parsingStatus:
                existing.parsingStatus === "解析成功"
                  ? existing.parsingStatus
                  : "解析成功",
              chunkingStatus: "分块成功",
              status: "处理完成",
              stage: "分块完成",
              source: "已分块文件",
            })
          } else {
            // 添加已分块但未解压的文件
            allFiles.set(result.area_code, {
              fileName: result.area_code,
              format: "未知", // 需要从后端获取，但这里我们不知道
              size: "未知",
              source: "已分块文件",
              status: "处理完成",
              stage: "分块完成",
              parsingStatus: "解析成功", // 已分块的文件应该已经解析过了
              chunkingStatus: "分块成功",
            })
          }
        })

        // 转换为数组并设置文件数据
        const fileDataArray = Array.from(allFiles.values())
        setFileData(fileDataArray)
      } catch (e) {
        setDecompressed([])
        setFileData([])
        toast({
          title: "错误",
          description: "获取文件列表失败（网络或端口问题）",
          variant: "destructive",
        })
      } finally {
        setDecLoading(false)
      }

      // 5) 新增：加载记录数据 - 添加任务ID参数
      try {
        const recordResp = await apiGet<{ code: number; data: any }>(
          "/api/parse/mineru/record",
          { task_id: selectedTaskId } // 添加任务ID参数
        )
        if (recordResp?.code === 0) {
          setRecordData(recordResp.data)
        }
      } catch (error) {
        console.error("加载记录数据失败", error)
      }
    }
    boot()
  }, [toast, selectedTaskId]) // 添加 selectedTaskId 依赖

  // 如果没有选择任务，显示提示
  if (!selectedTaskId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg bg-white">
            <CardHeader>
              <CardTitle>文件解析与分块</CardTitle>
              <CardDescription>
                请先在文件上传与下载界面选择一个任务，然后才能使用解析与分块功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">您尚未选择任何任务</p>
                <Button
                  onClick={() => (window.location.href = "/upload")}
                  variant="default">
                  前往文件上传与下载界面选择任务
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  /** ---- 已解压：全选/取消全选 ---- **/

  // 只保留“待解析”的：没解析成功 && 没分块成功
  const pendingDecompressed = useMemo(() => {
    const statusMap = new Map(
      fileData.map((f) => [normalizeRid(f.fileName), f])
    )
    return decompressed.filter((d) => {
      const s = statusMap.get(normalizeRid(d.area_code))
      const parsedOk = s?.parsingStatus === "解析成功"
      const chunkedOk = s?.chunkingStatus === "分块成功"
      return !parsedOk && !chunkedOk
    })
  }, [decompressed, fileData])

  const allUnparsedSelected = useMemo(
    () =>
      pendingDecompressed.length > 0 &&
      pendingDecompressed.every((d) => selectedDec.includes(d.area_code)),
    [pendingDecompressed, selectedDec]
  ) // 0122修改：判断“是否已全选所有未解析文件”，允许 selectedDec 里包含手动勾选的已解析文件

  const toggleAllDec = () => {
    const unparsedCodes = pendingDecompressed.map((d) => d.area_code)
    const unparsedSet = new Set(unparsedCodes)

    if (allUnparsedSelected) {
      // 0122修改：取消“未解析全选”，只移除未解析集合，不影响已解析文件的手动勾选
      setSelectedDec((prev) => prev.filter((c) => !unparsedSet.has(c)))
    } else {
      // 0122修改：全选“未解析文件”，并入现有选择（去重），保留已解析文件的手动勾选
      setSelectedDec((prev) => Array.from(new Set([...prev, ...unparsedCodes])))
    }
  }

  const toggleDecOne = (code: string) => {
    setSelectedDec((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  /** ---- 执行解析：调后端 /api/parse ---- **/

  const handleMineruParse = async () => {
    if (selectedDec.length === 0) {
      toast({
        title: "错误",
        description: "请选择需要解析的文件",
        variant: "destructive",
      })
      return
    }

    setParseLoading(true)

    // 固定本次要处理的清单：统一 rid、去重，避免处理中用户改勾选导致 UI 错乱
    const batch: string[] = []
    const seen = new Set<string>()
    for (const v of selectedDec) {
      const rid = normalizeRid(v)
      if (!rid || seen.has(rid)) continue
      seen.add(rid)
      batch.push(rid)
    }
    console.log(batch)

    addParseTask(batch, selectedTaskId)
      .then((result) => {
        if (result.success) {
          toast({
            title: "添加解析任务成功",
            description: result.msg,
          })
          getParseTasks()
        } else {
          toast({
            title: "添加解析任务失败",
            description: result.msg,
            variant: "destructive",
          })
        }
      })
      .catch((err) => {
        toast({
          title: "请求出错：",
          description: err,
          variant: "destructive",
        })
      })
    setParseLoading(false)

    // try {
    //   for (const rid of batch) {
    //     const fileSize = await getFileSize(rid)

    //     // 标记“解析中”
    //     handleLogUpdate(
    //       rid,
    //       "处理中",
    //       "解析进行中",
    //       "解析中",
    //       "未开始",
    //       fileSize
    //     )
    //     setLogs((l) => [...l, `开始解析：${rid}`])
    //     // 让出事件循环，让进度条/日志先渲染（尤其是 MinerU 单文件耗时很长时）
    //     await new Promise((r) => setTimeout(r, 0))

    //     const resp = await apiPost<{ code: number; data?: any; msg?: string }>(
    //       "/api/parse/mineru/parse",
    //       { area_codes: [rid], task_id: selectedTaskId }
    //     )

    //     if (resp?.code === 0) {
    //       handleLogUpdate(
    //         rid,
    //         "处理完成",
    //         "解析完成",
    //         "解析成功",
    //         "未开始",
    //         fileSize
    //       )

    //       // 每完成一个就刷新“已解析列表”
    //       const j2 = await apiGet<{ code: number; data: any[] }>(
    //         "/api/chunk/mineru/parsed",
    //         { task_id: selectedTaskId }
    //       )
    //       if (j2?.code === 0 && Array.isArray(j2.data))
    //         setParsedFolders(j2.data)
    //     } else {
    //       handleLogUpdate(
    //         rid,
    //         "处理失败",
    //         "解析失败",
    //         "解析失败",
    //         "未开始",
    //         fileSize
    //       )
    //     }
    //   }

    //   setSelectedDec([])
    //   toast({ title: "解析完成", description: `已处理 ${batch.length} 个文件` })
    // } catch {
    //   toast({
    //     title: "错误",
    //     description: "网络请求失败",
    //     variant: "destructive",
    //   })
    // } finally {
    //   setParseLoading(false)
    // }
  }

  const handlePureTextParse = async () => {
    if (selectedDec.length === 0) {
      toast({
        title: "错误",
        description: "请选择需要解析的文件",
        variant: "destructive",
      })
      return
    }

    setParseLoading(true)

    // 固定本次要处理的清单：统一 rid、去重，避免处理中用户改勾选导致 UI 错乱
    const batch: string[] = []
    const seen = new Set<string>()
    for (const v of selectedDec) {
      const rid = normalizeRid(v)
      if (!rid || seen.has(rid)) continue
      seen.add(rid)
      batch.push(rid)
    }
    addPureTXTParseTask(batch, selectedTaskId)
      .then((result) => {
        if (result.success) {
          toast({
            title: "添加纯文本解析任务成功",
            description: result.msg,
          })
          getParseTasks()
        } else {
          toast({
            title: "添加纯文本解析任务失败",
            description: result.msg,
            variant: "destructive",
          })
        }
      })
      .catch((err) => {
        toast({
          title: "请求出错：",
          description: err,
          variant: "destructive",
        })
      })
    setParseLoading(false)
  }

  /** ---- 解析结果：查看文件 ---- **/
  const viewOneParsedFile = async (areaCode: string, filename: string) => {
    const url = withBase(
      `/api/file/task-parsed/${selectedTaskId}/${areaCode}/${filename}`
    )
    setLogs((l) => [...l, `查看解析文件：${url}`])
    try {
      // 1.9修改：通过 fetch + Authorization 拉取，再用 objectURL 在新标签页打开（a.href 直链无法携带 token）
      const lower = filename.toLowerCase()
      const mime =
        lower.endsWith(".pdf")
          ? "application/pdf"
          : lower.endsWith(".json")
            ? "application/json"
            : lower.endsWith(".md")
              ? "text/markdown"
              : "application/octet-stream"
      await viewFileWithToken(url, mime)
    } catch (e) {
      toast({
        title: "打开失败",
        description: String(e),
        variant: "destructive",
      })
    }
  }

/** ---- 解析结果：下载文件 ---- **/
  const downloadOneParsedFile = async (areaCode: string, filename: string) => {
    const url = withBase(
      `/api/file/task-parsed/${selectedTaskId}/${areaCode}/${filename}`
    )
    setLogs((l) => [...l, `下载解析文件：${url}`])
    try {
      await downloadFile(url, filename)
      toast({ title: "下载开始", description: filename })
    } catch (e) {
      toast({
        title: "下载失败",
        description: String(e),
        variant: "destructive",
      })
    }
  }

  /** ---- 打包下载所有解析结果 ---- **/
  const downloadAllParseResults = async () => {
    const url = withBase(
      `/api/parse/mineru/download-all-parse-results?task_id=${selectedTaskId}`
    )
    setLogs((l) => [...l, `打包下载所有解析结果...`])
    try {
      await downloadFile(url, `task_${selectedTaskId}_parse_results.zip`)
      toast({ title: "下载开始", description: "所有解析结果打包下载开始" })
    } catch (e) {
      toast({
        title: "下载失败",
        description: String(e),
        variant: "destructive",
      })
    }
  }

  /** ---- 解析结果筛选 ---- **/
  const filteredParsedFolders = useMemo(() => {
    const q = parseFilter.trim().toLowerCase()
    if (!q) return parsedFolders
    return parsedFolders.filter((pf) => {
      const inName =
        pf.name.toLowerCase().includes(q) ||
        pf.area_code.toLowerCase().includes(q)
      const inFiles = pf.files.some((f) => f.toLowerCase().includes(q))
      return inName || inFiles
    })
  }, [parseFilter, parsedFolders])

  /** ---- JSON 多选（每个文件夹仅 1 个），全选优先 *_content_list.json ---- **/
  const toggleJsonOne = (area_code: string, file: string) => {
    setSelectedJsonByFolder((prev) => {
      const next = { ...prev }
      if (next[area_code] === file) delete next[area_code]
      else next[area_code] = file
      return next
    })
  }

  const toggleJsonAll = () => {
    const totalGroups = parsedFolders.length
    const already = Object.keys(selectedJsonByFolder).length
    if (already === totalGroups) {
      setSelectedJsonByFolder({})
      return
    }
    const next: Record<string, string> = {}
    parsedFolders.forEach((f) => {
      const jsons = f.files.filter((x) => x.endsWith(".json"))
      const preferred =
        jsons.find((x) => x.endsWith("_content_list.json")) || jsons[0]
      if (preferred) next[f.area_code] = preferred
    })
    setSelectedJsonByFolder(next)
  }

  /** ---- 执行分块：调后端 /api/chunk（以 area_code 为 report_ids） ---- **/

  const handleChunking = async () => {
    const entries = Object.entries(selectedJsonByFolder)
    if (entries.length === 0) {
      toast({
        title: "错误",
        description: "请选择解析完成的JSON文件",
        variant: "destructive",
      })
      return
    }

    setChunkLoading(true)

    // 固定本次要分块的清单：统一 rid、去重
    const batch: string[] = []
    const seen = new Set<string>()
    for (const [areaCode] of entries) {
      const rid = normalizeRid(areaCode)
      if (!rid || seen.has(rid)) continue
      seen.add(rid)
      batch.push(rid)
    }

    try {
      for (const rid of batch) {
        const fileSize = await getFileSize(rid)

        // 标记“分块中”
        handleLogUpdate(
          rid,
          "处理中",
          "分块进行中",
          "解析成功",
          "分块中",
          fileSize
        )

        const resp = await apiPost<{ code: number; data?: any; msg?: string }>(
          "/api/chunk/mineru/chunk",
          { report_ids: [rid], task_id: selectedTaskId }
        )

        if (resp?.code === 0) {
          handleLogUpdate(
            rid,
            "处理完成",
            "分块完成",
            "解析成功",
            "分块成功",
            fileSize
          )

          // 每完成一个就刷新分块结果列表
          const j3 = await apiGet<{ code: number; data: any[] }>(
            "/api/chunk/mineru/chunk-results",
            { task_id: selectedTaskId }
          )
          if (j3?.code === 0 && Array.isArray(j3.data)) setChunkResults(j3.data)
        } else {
          handleLogUpdate(
            rid,
            "处理失败",
            "分块失败",
            "解析成功",
            "分块失败",
            fileSize
          )
        }
      }

      setSelectedJsonByFolder({})
      toast({ title: "分块完成", description: `已处理 ${batch.length} 个文件` })
    } catch {
      toast({
        title: "错误",
        description: "网络请求失败",
        variant: "destructive",
      })
    } finally {
      setChunkLoading(false)
    }
  }

  /** ---- 分块结果：查看文件 ---- **/
  const viewOneFile = async (areaCode: string, filename: string) => {
    const url = withBase(
      `/api/file/task-chunked/${selectedTaskId}/${areaCode}_分块结果/${filename}`
    )

    setLogs((l) => [...l, `查看文件：${url}`])
    try {
      // 1.9修改：通过 fetch + Authorization 拉取，再用 objectURL 在新标签页打开（a.href 直链无法携带 token）
      const lower = filename.toLowerCase()
      const mime = lower.endsWith(".json")
        ? "application/json"
        : lower.endsWith(".pdf")
          ? "application/pdf"
          : "application/octet-stream"
      await viewFileWithToken(url, mime)
    } catch (e) {
      toast({
        title: "打开失败",
        description: String(e),
        variant: "destructive",
      })
    }
  }

/** ---- 分块结果：下载文件 ---- **/
  const downloadOneFile = async (areaCode: string, filename: string) => {
    const url = withBase(`/api/file/task-chunked/${selectedTaskId}/${areaCode}_分块结果/${filename}`)
    await fetch(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`, // 1.9修改
  }
})

    setLogs((l) => [...l, `下载文件：${url}`])
    try {
      await downloadFile(url, filename)
      toast({ title: "下载开始", description: filename })
    } catch (e) {
      toast({
        title: "下载失败",
        description: String(e),
        variant: "destructive",
      })
    }
  }

  /** ---- 打包下载所有分块结果 ---- **/
  const downloadAllChunkResults = async () => {
    const url = withBase(
      `/api/chunk/mineru/download-all-chunk-results?task_id=${selectedTaskId}`
    )

    setLogs((l) => [...l, `打包下载所有分块结果...`])
    try {
      // 1.9修改：下载统一走 downloadFile（内部已带 Authorization），避免重复请求/重复下载
      await downloadFile(url, `task_${selectedTaskId}_chunk_results.zip`)
      toast({ title: "下载开始", description: "所有分块结果打包下载开始" })
    } catch (e) {
      toast({
        title: "下载失败",
        description: String(e),
        variant: "destructive",
      })
    }
  }

/** ---- 分块结果筛选 ---- **/
  const filteredChunkResults = useMemo(() => {
    const q = chunkFilter.trim().toLowerCase()
    if (!q) return chunkResults
    return chunkResults.filter((cf) => {
      const inName =
        cf.name.toLowerCase().includes(q) ||
        cf.area_code.toLowerCase().includes(q)
      const inFiles = cf.files.some((f) => f.toLowerCase().includes(q))
      return inName || inFiles
    })
  }, [chunkFilter, chunkResults])

  /** ---- 辅助：渲染解析结果（images/md/json） ---- **/
  const renderParsedFolderDetail = (pf: ParsedFolder) => {
    const imageFolder = pf.files.find((f) => f.toLowerCase() === "images")
    const mds = pf.files.filter((f) => f.endsWith(".md"))
    const jsons = pf.files.filter((f) => f.endsWith(".json"))
    const pdfs = pf.files.filter((f) => f.toLowerCase().endsWith(".pdf"))

    return (
      <div className="ml-6 text-sm space-y-4">
        {/* 图片文件夹 */}
        <div className="flex items-start gap-1">
          <span className="font-medium text-gray-700 shrink-0">
            图片文件夹:
          </span>
          {imageFolder ? (
            <span className="text-gray-900 whitespace-normal break-words">
              {imageFolder}
            </span>
          ) : (
            <span className="text-gray-500">无</span>
          )}
        </div>

        {/* Markdown 文件 */}
        <div className="space-y-2">
          <div className="font-medium text-gray-700">Markdown 文件:</div>
          {mds.length ? (
            mds.map((f, i) => (
              <div key={i} className="rounded-md border p-2">
                <div className="text-gray-900 whitespace-normal break-words">
                  {f}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewOneParsedFile(pf.area_code, f)}>
                    <Eye className="h-3 w-3 mr-1" /> 查看
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadOneParsedFile(pf.area_code, f)}>
                    <Download className="h-3 w-3 mr-1" /> 下载
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-500">无</span>
          )}
        </div>

        {/* 新增：PDF 文件（包含 DOCX 转换结果） */}
        <div className="space-y-2">
          <div className="font-medium text-gray-700">
            PDF 文件（含 DOCX 转换结果）:
          </div>
          {pdfs.length ? (
            pdfs.map((f, i) => (
              <div key={i} className="rounded-md border p-2">
                <div className="text-gray-900 whitespace-normal break-words">
                  {f}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewOneParsedFile(pf.area_code, f)}>
                    <Eye className="h-3 w-3 mr-1" /> 查看
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadOneParsedFile(pf.area_code, f)}>
                    <Download className="h-3 w-3 mr-1" /> 下载
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-500">无</span>
          )}
        </div>

        {/* JSON 文件 */}
        <div className="space-y-2">
          <div className="font-medium text-gray-700">JSON 文件:</div>
          {jsons.length ? (
            jsons.map((f, i) => (
              <div key={i} className="rounded-md border p-2">
                <div className="text-gray-900 whitespace-normal break-words">
                  {f}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewOneParsedFile(pf.area_code, f)}>
                    <Eye className="h-3 w-3 mr-1" /> 查看
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadOneParsedFile(pf.area_code, f)}>
                    <Download className="h-3 w-3 mr-1" /> 下载
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-500">无</span>
          )}
        </div>
      </div>
    )
  }

  /** ---- 辅助：渲染分块结果（images/json/xlsx） --- **/
  const renderChunkFolderDetail = (cf: ChunkResultFolder) => {
    const imageFolder = cf.files.find((f) => f.toLowerCase() === "images")
    const jsons = cf.files.filter((f) => f.endsWith(".json")) // <rid>_parsed.json
    // const excels = cf.files.filter((f) => f.endsWith(".xlsx"))  12.27改
    return (
      <div className="ml-6 text-sm space-y-4">
        <div className="flex items-start gap-1">
          <span className="font-medium text-gray-700 shrink-0">
            图片文件夹:
          </span>
          {imageFolder ? (
            <span className="text-gray-900 whitespace-normal break-words">
              {imageFolder}
            </span>
          ) : (
            <span className="text-gray-500">无</span>
          )}
        </div>

        <div className="space-y-2">
          <div className="font-medium text-gray-700">JSON 文件:</div>
          {jsons.length ? (
            jsons.map((f, i) => (
              <div key={i} className="rounded-md border p-2">
                <div className="text-gray-900 whitespace-normal break-words">
                  {f}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewOneFile(cf.area_code, f)}>
                    <Eye className="h-3 w-3 mr-1" /> 查看
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadOneFile(cf.area_code, f)}>
                    <Download className="h-3 w-3 mr-1" /> 下载
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-500">无</span>
          )}
        </div>
        {/* 12.27改 */}
        {/* <div className="space-y-2">
          <div className="font-medium text-gray-700">Excel 文件:</div>
          {excels.length ? (
            excels.map((f, i) => (
              <div key={i} className="rounded-md border p-2">
                <div className="text-gray-900 whitespace-normal break-words">
                  {f}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewOneFile(cf.area_code, f)}>
                    <Eye className="h-3 w-3 mr-1" /> 查看
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadOneFile(cf.area_code, f)}>
                    <Download className="h-3 w-3 mr-1" /> 下载
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <span className="text-gray-500">无</span>
          )}
        </div> */}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页头 */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900">
              文件解析与分块
            </h1>
          </div>
          <p className="mt-2 text-lg text-gray-600">
            使用MinerU将已解压筛选的PDF/Word文件解析，并分块生成结构化文件
          </p>
        </div>

        {/* 第一行：左"选择已解压(多选)"，右"解析结果" */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左：选择已解压（多选 + 全选） */}
          <Card className="shadow-lg w-full bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>选择需要解析的全部文件</CardTitle>
                </div>
                <Badge variant="secondary" className="ml-2">
                  任务: {selectedTaskId}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* 触发条 */}
              <div
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  decLoading ? "opacity-50 pointer-events-none" : ""
                }`}
                onClick={() => setDecOpen((o) => !o)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {selectedDec.length
                      ? `已选择 ${selectedDec.length} 个`
                      : "文件列表"}
                  </span>
                  {selectedDec.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      已选择
                    </Badge>
                  )}
                </div>
                {decOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>

              {/* 下拉内容 */}
              {decOpen && (
                <div className="border rounded-lg mt-2">
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-100">
                    {/* 0122修改：将“全选”改为“全选所有未解析文件”；列表展示全部文件，已解析文件可手动勾选重跑 */}
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={toggleAllDec}>
                      {allUnparsedSelected ? "取消全选未解析文件" : "全选所有未解析文件"}
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {decompressed.length ? (
                      decompressed.map((d) => (
                        <div
                          key={d.area_code}
                          className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={selectedDec.includes(d.area_code)}
                              onCheckedChange={() => toggleDecOne(d.area_code)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="text-sm font-medium text-gray-900 truncate"
                                    title={d.folder_name}>
                                    {d.folder_name}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                    <span>编码: {d.area_code}</span>
                                    <span>
                                      类型:{" "}
                                      {d.file_type === "word"
                                        ? "Word(DOCX)"
                                        : "PDF"}
                                    </span>
                                    <span>解压时间: {d.download_time}</span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs">
                                      {d.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        暂无已解压的文件
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  className="w-full"
                  onClick={handlePureTextParse}
                  disabled={parseLoading || selectedDec.length === 0}>
                  {parseLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "PDF解析"
                  )}
                </Button>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleMineruParse}
                  disabled={parseLoading || selectedDec.length === 0}>
                  {parseLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "执行MinerU解析"
                  )}
                </Button>
              </div>

              {/* <Button
                className="mt-4 w-full"
                onClick={handleMineruParse}
                disabled={parseLoading || selectedDec.length === 0}>
                {parseLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "执行MinerU解析"
                )}
              </Button> */}
            </CardContent>
          </Card>

          {/* 右：解析结果 */}
          <Card className="bg-white shadow-lg w-full">
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle>解析结果</CardTitle>
                  <CardDescription>
                    解析结果为文件夹，包含 images / .md / *_content_list.json
                  </CardDescription>
                </div>

                {/* 新增：解析结果筛选搜索框 */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="按文件夹名称、编码或文件名筛选解析结果..."
                      value={parseFilter}
                      onChange={(e) => setParseFilter(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredParsedFolders.length ? (
                <>
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {filteredParsedFolders.map((pf) => (
                      <div key={pf.area_code} className="border rounded-lg p-3">
                        <div className="flex items-start gap-2 mb-1">
                          <FolderIcon className="h-4 w-4 shrink-0 mt-0.5" />
                          <span
                            className="font-medium text-gray-800 whitespace-normal break-words"
                            title={pf.name}>
                            {pf.name}
                          </span>
                        </div>
                        {renderParsedFolderDetail(pf)}
                      </div>
                    ))}
                  </div>
                  <Button
                    className="mt-2 w-full"
                    onClick={downloadAllParseResults}>
                    <Archive className="h-4 w-4 mr-2" />
                    打包下载所有解析结果
                  </Button>
                </>
              ) : (
                <span className="text-sm text-gray-500">暂无解析结果</span>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                解析进度
              </span>
              <Button onClick={retryParseError}>错误重新解析</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 下载任务进度条 */}
            <div className="pb-4">
              <ProgressBar
                total={parseTotal}
                downloaded={parseCompleted}
                error={parseError}
              />
            </div>
            <DataList
              data={parseTasks}
              columns={parseTaskTabColumns}></DataList>
          </CardContent>
        </Card>

        {/* 第二行：左"选择解析完成的JSON（每组仅 1 个）+ 执行分块"，右"分块结果清单 + 过滤 + 下载" */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左：选择解析完成的文件（JSON） */}
          <Card className="bg-white shadow-lg w-full">
            <CardHeader>
              <CardTitle>选择解析完成的文件（JSON）</CardTitle>
              <CardDescription>
                每个解析结果文件夹只可选择 1 个 JSON；支持一键全选
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 触发条 */}
              <div
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                onClick={() => setJsonOpen((o) => !o)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {selectedJsonCount
                      ? `已选择 ${selectedJsonCount} 个`
                      : "选择解析完成的 JSON 文件"}
                  </span>
                  {selectedJsonCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      已选择
                    </Badge>
                  )}
                </div>
                {jsonOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>

              {/* 下拉内容：按文件夹分组 */}
              {jsonOpen && (
                <div className="border rounded-lg mt-2">
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-100">
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={toggleJsonAll}>
                      {selectedJsonCount === parsedFolders.length
                        ? "取消全选"
                        : "全选"}
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {parsedFolders.length ? (
                      parsedFolders.map((pf) => {
                        const jsons = pf.files.filter((f) =>
                          f.endsWith(".json")
                        )
                        if (!jsons.length) return null
                        return (
                          <div
                            key={pf.area_code}
                            className="border-b last:border-b-0">
                            <div className="px-4 py-2 bg-gray-100 text-xs font-medium text-gray-700">
                              <span
                                className="whitespace-normal break-words inline-block"
                                title={pf.name}>
                                {pf.name}
                              </span>
                            </div>
                            {jsons.map((jf) => (
                              <div
                                key={jf}
                                className="flex items-start space-x-3 px-4 py-2 hover:bg-gray-50">
                                <Checkbox
                                  checked={
                                    selectedJsonByFolder[pf.area_code] === jf
                                  }
                                  onCheckedChange={() =>
                                    toggleJsonOne(pf.area_code, jf)
                                  }
                                />
                                <span
                                  className="text-sm text-gray-900 whitespace-normal break-words"
                                  title={jf}>
                                  {jf}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        暂无可选 JSON
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                className="mt-4 w-full"
                onClick={handleChunking}
                disabled={chunkLoading || selectedJsonCount === 0}>
                {chunkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "执行分块处理"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 右：分块结果清单 */}
          <Card className="bg-white shadow-lg w-full">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>分块结果</CardTitle>
                  <CardDescription>
                    {/* 12.27改：文字描述 */}
                    每个结果为一个文件夹，包含 images/、*_parsed.json
                  </CardDescription>
                </div>
                {/* 关键字筛选框 */}
                <div className="relative w-56">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    value={chunkFilter}
                    onChange={(e) => setChunkFilter(e.target.value)}
                    placeholder="筛选：文件夹/area_code/文件名"
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredChunkResults.length ? (
                <>
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {filteredChunkResults.map((cf) => (
                      <div key={cf.area_code} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-start gap-2">
                            <FolderIcon className="h-4 w-4 shrink-0 mt-0.5" />
                            <span
                              className="font-medium text-gray-800 whitespace-normal break-words"
                              title={cf.name}>
                              {cf.name}
                            </span>
                          </div>
                        </div>
                        {renderChunkFolderDetail(cf)}
                      </div>
                    ))}
                  </div>
                  <Button
                    className="mt-2 w-full"
                    onClick={downloadAllChunkResults}>
                    <Archive className="h-4 w-4 mr-2" />
                    打包下载所有分块结果
                  </Button>
                </>
              ) : (
                <span className="text-sm text-gray-500">
                  暂无匹配的分块结果
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 第三行：处理日志 */}
        <Card className="bg-white shadow-lg w-full">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>分块进度</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 新增：动态进度条 */}
            <div className="mb-4 space-y-3">
              {/* 解析 / 分块 进度 */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-3 text-xs text-gray-600">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>
                      {fileStats.chunkSuccessCount}/{fileStats.totalFiles || 0}{" "}
                      · {fileStats.chunkProgress}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${fileStats.chunkProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    成功: {fileStats.chunkSuccessCount} · 进行中:{" "}
                    {
                      fileData.filter((f) => f.chunkingStatus === "分块中")
                        .length
                    }{" "}
                    · 失败:{" "}
                    {
                      fileData.filter((f) => f.chunkingStatus === "分块失败")
                        .length
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* 使用 DataList 渲染文件日志 */}
            {/* <DataList data={fileData} /> */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ParseAndChunk
