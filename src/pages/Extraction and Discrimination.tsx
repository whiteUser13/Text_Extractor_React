import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Download,
  FileText,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCode,
  Filter,
  Brain,
  BarChart3,
  Play,
  Zap,
  Search,
  MoreHorizontal,
  Eye,
  FolderOpen,
  Folder,
  File,
  Image as ImageIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { dataService } from "@/services/dataService"
import type {
  ExtractionResult,
  Task,
  ExtractionRule,
  JudgmentRule,
} from "@/types"
import extractionAndDiscriminationApi from "../api/extractionAndDiscriminationApi"
import { usePagination } from "@/components/FileUpload/pagination"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { useTaskStore } from "@/context/TaskContext"

// 根据 app.py 的数据结构调整接口
interface DecompressedFolder {
  area_code: string // 地块编码
  folder_name: string // 文件夹名称
  download_time: string // 下载/解压时间
  status: string // 状态
  origin_folder_name?: string // 原始文件夹名称
  update_time?: string // 更新时间
  file_type?: string // 文件类型
}

interface FilterPdfFolder {
  area_code: string // 地块编码
  folder_name: string // 文件夹名称
  origin_folder_name?: string // 原始文件夹名称
  update_time?: string // 更新时间
  status: string // 状态
  file_type?: string // 文件类型
  file_count?: number // 文件数量
}

interface ExtractionLog {
  id: string
  fileName: string
  fileId: string
  extractedAt: Date | string
  status: "processing" | "completed" | "error"
  content?: string
  chapter?: string
  keywords?: string[]
  errorMessage?: string
  selectedTask?: Task
  fileType?: string
  actualProcessedFile?: string // 实际处理的文件名
  ruleIdentifier?: string // 规则标识符
  taskId?: string // 新增：任务ID
  sourceType?: "markdown" | "json" // 新增：源文件类型
}

interface DiscriminationLog {
  id: string
  fileName: string
  fileId: string
  discriminatedAt: Date | string
  status: "processing" | "completed" | "error"
  content?: string
  errorMessage?: string
  selectedTask?: Task
  judgmentRule?: JudgmentRule // 判别规则信息
  taskId?: string // 新增：任务ID
}

// 文件类型定义
interface ResultFile {
  name: string
  type: string
  size: number
  ruleIdentifier?: string
  fullPath?: string
  relativePath?: string
  area_code?: string
  isMarkdown?: boolean // 新增：是否为Markdown文件
}

// API 相关类型
interface FolderInfo {
  area_code: string
  folder_name: string
  origin_folder_name: string
  status: string
  update_time?: string
}

interface JsonFileInfo {
  id: string
  folder_name: string
  filename: string
  origin_name: string
  size_kb: number
  upload_time: string
  full_path: string
  rule_identifier?: string
}

// 任务文件类型
interface TaskFile {
  filename: string
  relative_path: string
  full_path: string
  size: number
  modified_time: string
  file_type: string
  area_code: string
  is_extraction_result?: boolean
  is_discrimination_result?: boolean
}

// 截断文件名的辅助函数
const truncateFileName = (name: string, maxLength: number = 25): string => {
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength) + "..."
}

// FileList 组件的 Props 接口
interface FileListProps {
  areaCode?: string
  ruleFilter?: string
  taskId?: string
  isExtractionResult?: boolean
  isDiscriminationResult?: boolean
  fileTypeFilter?: "markdown" | "json" | "all" // 新增：文件类型筛选
}

// 改进的规则标识符提取函数 - 不包含文件类型
const extractRuleIdentifier = (filename: string): string => {
  // 尝试多种模式匹配规则标识符
  console.log(`提取规则标识符 - 文件名: ${filename}`)

  // 先移除文件扩展名
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")
  console.log(`移除扩展名后: ${nameWithoutExt}`)

  // 模式1: xxx_规则标识符_extracted 或 xxx_规则标识符_discrimination
  const pattern1 = /_([^_]+)_(extracted|discrimination)$/
  const match1 = nameWithoutExt.match(pattern1)
  if (match1) {
    console.log(`模式1匹配成功: ${match1[1]}`)
    return match1[1]
  }

  // 模式2: 规则标识符_extracted 或 规则标识符_discrimination
  const pattern2 = /^([^_]+)_(extracted|discrimination)$/
  const match2 = nameWithoutExt.match(pattern2)
  if (match2) {
    console.log(`模式2匹配成功: ${match2[1]}`)
    return match2[1]
  }

  // 模式3: extracted_规则标识符 或 discrimination_规则标识符
  const pattern3 = /(?:extracted|discrimination)_([^_]+)$/
  const match3 = nameWithoutExt.match(pattern3)
  if (match3) {
    console.log(`模式3匹配成功: ${match3[1]}`)
    return match3[1]
  }

  // 模式4: 包含规则名称的关键词匹配
  const ruleKeywords = ["rule", "rules", "rule_", "_rule"]
  for (const keyword of ruleKeywords) {
    const keywordIndex = nameWithoutExt.indexOf(keyword)
    if (keywordIndex > -1) {
      // 尝试提取规则名称部分
      const afterKeyword = nameWithoutExt.substring(
        keywordIndex + keyword.length,
      )
      const parts = afterKeyword.split(/[_.-]/)
      if (parts.length > 0 && parts[0].trim()) {
        console.log(`关键词匹配成功: ${parts[0]}`)
        return parts[0]
      }
    }
  }

  // 模式5: 从任务ID中提取（如果文件名包含任务ID）
  const taskPattern = /(task[-_][^_]+)/
  const taskMatch = nameWithoutExt.match(taskPattern)
  if (taskMatch) {
    console.log(`任务ID匹配成功: ${taskMatch[1]}`)
    return taskMatch[1]
  }

  // 模式6: 尝试提取文件名的主体部分（排除 _extracted 或 _discrimination 后缀）
  const cleanName = nameWithoutExt.replace(/_(extracted|discrimination)$/, "")
  const parts = cleanName.split("_")
  if (parts.length > 1) {
    // 取最后一个部分作为可能的规则标识符
    const possibleIdentifier = parts[parts.length - 1]
    if (
      possibleIdentifier &&
      possibleIdentifier.length > 0 &&
      !/^\d+$/.test(possibleIdentifier)
    ) {
      console.log(`文件名主体匹配成功: ${possibleIdentifier}`)
      return possibleIdentifier
    }
  }

  // 模式7: 如果文件名为 "提取效果判别.json"，直接返回 "提取效果判别"
  if (nameWithoutExt === "提取效果判别") {
    console.log(`特定文件名匹配成功: 提取效果判别`)
    return "提取效果判别"
  }

  // 模式8: 返回去除扩展名的文件名，但排除常见的后缀
  const commonSuffixes = [
    "_extracted",
    "_discrimination",
    "_validation",
    "_result",
  ]
  let finalName = nameWithoutExt
  for (const suffix of commonSuffixes) {
    if (finalName.endsWith(suffix)) {
      finalName = finalName.replace(suffix, "")
      break
    }
  }

  console.log(`使用文件名主体: ${finalName}`)
  return finalName || "default"
}

// 判断是否为错误日志文件
const isErrorLogFile = (filename: string): boolean => {
  return filename.includes("extraction_error_log_") && filename.endsWith(".txt")
}

// 判断是否为Markdown文件
const isMarkdownFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith(".md")
}

// 判断是否为JSON文件
const isJsonFile = (filename: string): boolean => {
  return filename.toLowerCase().endsWith(".json")
}

// 获取文件类型显示名称
const getFileTypeDisplay = (fileType: string, filename?: string): string => {
  const typeMap: { [key: string]: string } = {
    excel: "Excel",
    text: "文本",
    json: "JSON",
    markdown: "Markdown",
    md: "Markdown",
    other: "其他",
  }

  // 优先使用文件扩展名判断
  if (filename) {
    if (isMarkdownFile(filename)) return "Markdown"
    if (isJsonFile(filename)) return "JSON"
    if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) return "Excel"
    if (filename.endsWith(".txt") || filename.endsWith(".log")) return "文本"
  }

  return typeMap[fileType.toLowerCase()] || fileType
}

// 获取文件图标
const getFileIcon = (fileType: string, filename?: string) => {
  if (filename && isMarkdownFile(filename)) {
    return <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
  }
  if (filename && isJsonFile(filename)) {
    return <FileCode className="h-4 w-4 text-green-600 flex-shrink-0" />
  }

  const type = fileType.toLowerCase()
  switch (type) {
    case "markdown":
    case "md":
      return <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
    case "json":
      return <FileCode className="h-4 w-4 text-green-600 flex-shrink-0" />
    case "excel":
      return <File className="h-4 w-4 text-green-700 flex-shrink-0" />
    case "text":
    case "txt":
      return <FileText className="h-4 w-4 text-gray-600 flex-shrink-0" />
    default:
      return <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
  }
}

// 改进的文件列表组件 - 添加更好的布局
const FileList: React.FC<FileListProps> = ({
  areaCode,
  ruleFilter,
  taskId,
  isExtractionResult,
  isDiscriminationResult,
  fileTypeFilter = "all", // 新增：文件类型筛选
}) => {
  const [files, setFiles] = useState<ResultFile[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { toast } = useToast()
  const [fileStats, setFileStats] = useState({
    total: 0,
    markdown: 0,
    json: 0,
    other: 0,
  })

  const loadFiles = async () => {
    setLoading(true)
    try {
      let response: Response
      let data: any

      if (taskId) {
        // 从任务目录获取文件
        let apiUrl = ""

        if (isExtractionResult) {
          apiUrl =
            extractionAndDiscriminationApi.getTaskExtractionResults(taskId)
        } else if (isDiscriminationResult) {
          apiUrl =
            extractionAndDiscriminationApi.getTaskDiscriminationResults(taskId)
        } else {
          apiUrl = extractionAndDiscriminationApi.getTaskChunkedFiles(taskId)
        }

        console.log(`请求任务文件API: ${apiUrl}`)

        response = await fetch(apiUrl, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })

        // 调试：查看响应状态和内容类型
        console.log(`响应状态: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          // 尝试获取错误信息
          const errorText = await response.text()
          console.error(`API错误响应:`, errorText.substring(0, 500))
          throw new Error(
            `获取文件列表失败: ${response.status} ${response.statusText}`,
          )
        }

        // 检查内容类型
        const contentType = response.headers.get("content-type") || ""
        if (!contentType.includes("application/json")) {
          const text = await response.text()
          console.warn("响应不是JSON格式:", text.substring(0, 200))
          // 如果不是JSON，尝试解析为文本或创建空数据
          if (text.trim().startsWith("<")) {
            throw new Error("服务器返回了HTML页面，可能是路由错误")
          }
          // 尝试解析为JSON
          try {
            data = JSON.parse(text)
          } catch (e) {
            // 如果解析失败，创建空数据
            data = { files: [], error: "响应格式无效" }
          }
        } else {
          data = await response.json()
        }

        console.log(`获取到任务 ${taskId} 的文件列表:`, data)

        // 处理数据 - 适配不同的响应格式
        let processedFiles: ResultFile[] = []

        if (data.files && Array.isArray(data.files)) {
          // 新的任务目录格式
          processedFiles = data.files.map((file: any) => {
            const filename = file.filename || file.name
            const ruleIdentifier = extractRuleIdentifier(filename)

            // 确定文件类型
            let fileType = file.file_type || file.type
            if (!fileType || fileType === "unknown") {
              if (isMarkdownFile(filename)) {
                fileType = "markdown"
              } else if (isJsonFile(filename)) {
                fileType = "json"
              } else if (
                filename.endsWith(".xlsx") ||
                filename.endsWith(".xls")
              ) {
                fileType = "excel"
              } else if (
                filename.endsWith(".txt") ||
                filename.endsWith(".log")
              ) {
                fileType = "text"
              } else {
                fileType = "other"
              }
            }

            return {
              name: filename,
              type: fileType,
              size: file.size || 0,
              ruleIdentifier: ruleIdentifier,
              fullPath: file.full_path || "",
              relativePath: file.relative_path || "",
              area_code: file.area_code || taskId,
              isMarkdown: isMarkdownFile(filename),
            }
          })
        } else if (Array.isArray(data)) {
          // 如果是数组格式
          processedFiles = data.map((file: any, index: number) => {
            const filename = file.filename || file.name || `file-${index}`
            const ruleIdentifier = extractRuleIdentifier(filename)

            let fileType = file.file_type || file.type || "unknown"
            if (fileType === "unknown") {
              if (isMarkdownFile(filename)) {
                fileType = "markdown"
              } else if (isJsonFile(filename)) {
                fileType = "json"
              }
            }

            return {
              name: filename,
              type: fileType,
              size: file.size || 0,
              ruleIdentifier: ruleIdentifier,
              fullPath: file.full_path || "",
              relativePath: file.relative_path || "",
              area_code: file.area_code || taskId,
              isMarkdown: isMarkdownFile(filename),
            }
          })
        }

        // 过滤掉错误日志文件
        const filteredFiles = processedFiles.filter(
          (file: ResultFile) => !isErrorLogFile(file.name),
        )

        // 根据文件类型筛选
        let typeFilteredFiles = filteredFiles
        if (fileTypeFilter !== "all") {
          typeFilteredFiles = filteredFiles.filter((file: ResultFile) => {
            if (fileTypeFilter === "markdown") return file.isMarkdown
            if (fileTypeFilter === "json")
              return file.type.toLowerCase() === "json"
            return true
          })
        }

        // 如果有规则筛选，进一步过滤文件
        const ruleFilteredFiles = ruleFilter
          ? typeFilteredFiles.filter(
              (file: ResultFile) => file.ruleIdentifier === ruleFilter,
            )
          : typeFilteredFiles

        // 统计文件类型
        const stats = {
          total: ruleFilteredFiles.length,
          markdown: ruleFilteredFiles.filter(
            (file: ResultFile) => file.isMarkdown,
          ).length,
          json: ruleFilteredFiles.filter(
            (file: ResultFile) => file.type.toLowerCase() === "json",
          ).length,
          other: ruleFilteredFiles.filter(
            (file: ResultFile) =>
              !file.isMarkdown && file.type.toLowerCase() !== "json",
          ).length,
        }
        setFileStats(stats)

        setFiles(ruleFilteredFiles)
      }
      // ... 保留原来的 areaCode 逻辑
      else if (areaCode) {
        // 原来的逻辑（全局目录）
        const apiUrl =
          extractionAndDiscriminationApi.getMarkdownExtractionResults(areaCode)
        console.log(`请求全局文件API: ${apiUrl}`)

        response = await fetch(apiUrl)

        if (response.ok) {
          data = await response.json()
          console.log(`获取到 ${areaCode} 的文件列表:`, data)

          const processedFiles =
            data.files?.map((file: any) => {
              const filename = file.filename
              const ruleIdentifier = extractRuleIdentifier(filename)

              let fileType = file.file_type
              if (!fileType) {
                if (isMarkdownFile(filename)) {
                  fileType = "markdown"
                } else if (isJsonFile(filename)) {
                  fileType = "json"
                }
              }

              return {
                name: filename,
                type:
                  fileType || (isMarkdownFile(filename) ? "markdown" : "json"),
                size: file.size || 0,
                ruleIdentifier: ruleIdentifier,
                fullPath: file.file_path,
                isMarkdown: isMarkdownFile(filename),
              }
            }) || []

          // 过滤掉错误日志文件
          const filteredFiles = processedFiles.filter(
            (file: ResultFile) => !isErrorLogFile(file.name),
          )

          // 统计文件类型
          const stats = {
            total: filteredFiles.length,
            markdown: filteredFiles.filter(
              (file: ResultFile) => file.isMarkdown,
            ).length,
            json: filteredFiles.filter(
              (file: ResultFile) => file.type.toLowerCase() === "json",
            ).length,
            other: filteredFiles.filter(
              (file: ResultFile) =>
                !file.isMarkdown && file.type.toLowerCase() !== "json",
            ).length,
          }
          setFileStats(stats)

          // 如果有规则筛选，进一步过滤文件
          const ruleFilteredFiles = ruleFilter
            ? filteredFiles.filter(
                (file: ResultFile) => file.ruleIdentifier === ruleFilter,
              )
            : filteredFiles

          setFiles(ruleFilteredFiles)
        } else {
          throw new Error("获取文件列表失败")
        }
      } else {
        // 既没有 taskId 也没有 areaCode
        setFiles([])
        setLoading(false)
        return
      }
    } catch (error) {
      console.log(11111111111111)

      console.error("获取文件列表失败:", error)
      toast({
        title: "获取文件列表失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
      setFiles([]) // 出错时清空文件列表
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (areaCode || taskId) {
      loadFiles()
    } else {
      setFiles([])
    }
  }, [
    areaCode,
    ruleFilter,
    taskId,
    isExtractionResult,
    isDiscriminationResult,
    fileTypeFilter,
    toast,
  ])

  const downloadFile = async (filename: string) => {
    try {
      let response: Response
      let downloadUrl = ""

      if (taskId) {
        // 构建正确的下载URL
        if (isExtractionResult) {
          downloadUrl =
            extractionAndDiscriminationApi.downloadTaskExtractionFile(
              taskId,
              filename,
            )
        } else if (isDiscriminationResult) {
          downloadUrl =
            extractionAndDiscriminationApi.downloadTaskDiscriminationFile(
              taskId,
              filename,
            )
        } else {
          downloadUrl = extractionAndDiscriminationApi.downloadTaskChunkedFile(
            taskId,
            filename,
          )
        }

        console.log(`下载文件URL: ${downloadUrl}`)

        // 添加认证头
        const headers: HeadersInit = {
          Accept: "application/octet-stream",
        }

        // 如果本地存储有token，添加认证头
        const token = localStorage.getItem("token")
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        response = await fetch(downloadUrl, { headers })

        if (response.ok) {
          // 检查内容类型
          const contentType = response.headers.get("content-type") || ""
          const contentDisposition =
            response.headers.get("content-disposition") || ""

          console.log(`内容类型: ${contentType}`)
          console.log(`Content-Disposition: ${contentDisposition}`)

          // 获取blob数据
          const blob = await response.blob()

          // 从Content-Disposition中提取文件名，如果没有则使用原始文件名
          let downloadFilename = filename
          if (contentDisposition) {
            const matches = contentDisposition.match(
              /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
            )
            if (matches && matches[1]) {
              downloadFilename = matches[1].replace(/['"]/g, "")
            }
          }

          // 创建下载链接
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.style.display = "none"
          a.href = url
          a.download = downloadFilename

          // 添加到文档并触发点击
          document.body.appendChild(a)
          a.click()

          // 清理
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)

          toast({
            title: "下载成功",
            description: `文件 ${downloadFilename} 已开始下载`,
          })
        } else {
          // 如果响应状态不是200-299，尝试查看错误信息
          const errorText = await response.text()
          console.error(`下载失败 (${response.status}):`, errorText)

          // 如果服务器返回了错误页面，提供备选方案
          if (response.headers.get("content-type")?.includes("text/html")) {
            toast({
              title: "下载失败",
              description: "服务器返回了错误页面，请联系管理员",
              variant: "destructive",
            })
          } else {
            throw new Error(
              `下载失败: ${response.status} ${response.statusText}`,
            )
          }
        }
      } else if (areaCode) {
        // 原来的逻辑（全局目录）
        downloadUrl = extractionAndDiscriminationApi.getMarkdownExtractionFile(
          areaCode || "",
          filename,
        )

        console.log(`全局下载文件URL: ${downloadUrl}`)

        response = await fetch(downloadUrl)

        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.style.display = "none"
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)

          toast({
            title: "下载成功",
            description: `文件 ${filename} 已开始下载`,
          })
        } else {
          throw new Error(`下载文件失败: ${response.status}`)
        }
      }
    } catch (error) {
      console.error("下载文件失败:", error)

      // 提供详细的错误信息
      let errorMessage = "下载失败"
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage = "网络连接失败，请检查网络设置"
        } else if (error.message.includes("404")) {
          errorMessage = "文件不存在或已被删除"
        } else if (error.message.includes("403")) {
          errorMessage = "没有权限下载此文件"
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: "下载失败",
        description: errorMessage,
        variant: "destructive",
      })

      // 在控制台输出更详细的调试信息
      console.log("下载失败详情:", {
        taskId,
        areaCode,
        filename,
        isExtractionResult,
        isDiscriminationResult,
        error,
      })
    }
  }
  const visibleFiles = expanded ? files : files.slice(0, 3)

  return (
    <div className="space-y-3">
      {/* 文件统计信息 */}
      {files.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>总计: {fileStats.total}</span>
          </div>
          {fileStats.markdown > 0 && (
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="px-1 py-0 h-4 text-[10px]">
                MD
              </Badge>
              <span>Markdown: {fileStats.markdown}</span>
            </div>
          )}
          {fileStats.json > 0 && (
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className="px-1 py-0 h-4 text-[10px] bg-green-50">
                JSON
              </Badge>
              <span>JSON: {fileStats.json}</span>
            </div>
          )}
          {fileStats.other > 0 && (
            <div className="flex items-center gap-1">
              <File className="h-3 w-3" />
              <span>其他: {fileStats.other}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          加载文件中...
        </div>
      ) : files.length > 0 ? (
        <>
          <div className="space-y-2">
            {visibleFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file.type, file.name)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="text-sm font-medium truncate"
                            title={file.name}>
                            {truncateFileName(file.name)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{file.name}</p>
                          {file.area_code && (
                            <p className="text-xs text-gray-500">
                              地块: {file.area_code}
                            </p>
                          )}
                          {file.isMarkdown && (
                            <p className="text-xs text-blue-500 mt-1">
                              📝 此文件为Markdown格式，将从文本内容中提取
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: file.isMarkdown
                            ? "#eff6ff"
                            : file.type === "json"
                              ? "#f0fdf4"
                              : file.type === "excel"
                                ? "#f0fdf0"
                                : "#f9fafb",
                        }}>
                        {getFileTypeDisplay(file.type, file.name)}
                      </Badge>
                      {file.ruleIdentifier && (
                        <Badge variant="secondary" className="text-xs">
                          规则: {file.ruleIdentifier}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {file.size > 0
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : "大小未知"}
                      {file.isMarkdown && (
                        <Badge
                          variant="outline"
                          className="px-1 py-0 h-4 text-[10px] bg-blue-50 text-blue-700">
                          优先提取
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadFile(file.name)}
                  className="h-8 px-2 flex-shrink-0">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {files.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full text-xs">
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  收起文件列表
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  显示全部 {files.length} 个文件
                </>
              )}
            </Button>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 py-4">
          <FileCode className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <span className="text-sm">暂无文件</span>
          {taskId && (
            <span className="text-xs block mt-1">
              {isExtractionResult
                ? "内容提取"
                : isDiscriminationResult
                  ? "判别"
                  : "分块"}
              结果目录为空
            </span>
          )}
          {ruleFilter && (
            <span className="text-xs block mt-1">
              当前筛选规则: {ruleFilter}
            </span>
          )}
          {fileTypeFilter !== "all" && (
            <span className="text-xs block mt-1">
              当前筛选文件类型:{" "}
              {fileTypeFilter === "markdown" ? "Markdown" : "JSON"}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// 获取提取文件夹信息的函数 - 修改为从新接口获取
const getExtractedFoldersInfo = async (): Promise<any[]> => {
  try {
    console.log("获取提取文件夹信息...")
    const response = await fetch(
      extractionAndDiscriminationApi.getExtractedFoldersInfo,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    )
    console.log("提取文件夹API响应状态:", response.status)

    if (response.ok) {
      const data = await response.json()
      console.log("获取到的提取文件夹信息:", data)

      // 处理数据格式，确保返回数组
      if (data.status === "success") {
        return data.folders || []
      } else if (Array.isArray(data)) {
        return data
      } else {
        console.warn("提取文件夹数据格式异常:", data)
        return []
      }
    } else {
      const errorText = await response.text()
      console.error("获取提取文件夹信息失败:", errorText)
      throw new Error(`获取提取文件夹信息失败: ${response.status}`)
    }
  } catch (error) {
    console.error("获取提取文件夹信息失败:", error)
    throw error
  }
}

// 获取判别文件夹信息的函数 - 修改为从新接口获取
const getJudgedFoldersInfo = async (): Promise<FolderInfo[]> => {
  try {
    console.log("获取判别文件夹信息...")
    const response = await fetch(
      extractionAndDiscriminationApi.getJudgedFoldersInfo,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    )
    console.log("判别文件夹API响应状态:", response.status)

    if (response.ok) {
      const data = await response.json()
      console.log("获取到的判别文件夹信息:", data)

      // 处理数据格式，确保返回数组
      if (data.status === "success") {
        return data.folders || []
      } else if (Array.isArray(data)) {
        return data
      } else {
        console.warn("判别文件夹数据格式异常:", data)
        return []
      }
    } else {
      const errorText = await response.text()
      console.error("获取判别文件夹信息失败:", errorText)
      throw new Error(`获取判别文件夹信息失败: ${response.status}`)
    }
  } catch (error) {
    console.error("获取判别文件夹信息失败:", error)
    throw error
  }
}

// 获取 markdown_extraction JSON 文件 - 新增接口
const getMarkdownExtractionJsonFiles = async (): Promise<JsonFileInfo[]> => {
  try {
    console.log("获取Markdown提取JSON文件...")
    const response = await fetch(
      extractionAndDiscriminationApi.getMarkdownExtractionJsonFiles,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      },
    )
    console.log("JSON文件API响应状态:", response.status)

    if (response.ok) {
      const data = await response.json()
      console.log("获取到的JSON文件:", data)

      // 处理数据格式
      if (data.status === "success") {
        return data.json_files || []
      } else if (Array.isArray(data)) {
        return data
      } else {
        console.warn("JSON文件数据格式异常:", data)
        return []
      }
    } else {
      const errorText = await response.text()
      console.error("获取JSON文件失败:", errorText)
      throw new Error(`获取JSON文件失败: ${response.status}`)
    }
  } catch (error) {
    console.error("获取JSON文件失败:", error)
    throw error
  }
}

// AI 判别请求
const requestAIAnalysis = async (
  folderName: string,
  jsonFileName: string = "",
  rulesDescription: string = "",
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(extractionAndDiscriminationApi.analyzeWithAI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        folder_name: folderName,
        json_filename: jsonFileName,
        rules_description: rulesDescription,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return { success: true }
    } else {
      const errorData = await response.json()
      return { success: false, error: errorData.error || "判别失败" }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "网络错误",
    }
  }
}

// 任务提取请求
const requestTaskExtraction = async (
  taskId: string,
  extractionRules: ExtractionRule[],
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    console.log(`请求任务提取: ${taskId}`)
    const response = await fetch(
      extractionAndDiscriminationApi.taskExtractContent(taskId),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extraction_rules: extractionRules,
        }),
      },
    )

    console.log(`提取请求响应状态: ${response.status}`)

    if (response.ok) {
      const result = await response.json()
      console.log("提取请求成功结果:", result)
      return { success: true, data: result.data || result }
    } else {
      const errorText = await response.text()
      console.error("提取请求错误响应:", errorText)
      try {
        const errorData = JSON.parse(errorText)
        return { success: false, error: errorData.error || "提取失败" }
      } catch {
        return { success: false, error: errorText || "提取失败" }
      }
    }
  } catch (error) {
    console.error("提取请求异常:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "网络错误",
    }
  }
}

// 任务判别请求
const requestTaskDiscrimination = async (
  taskId: string,
  judgmentRules: JudgmentRule[],
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    console.log(`请求任务判别: ${taskId}`)
    const response = await fetch(
      extractionAndDiscriminationApi.taskDiscriminateContent(taskId),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          judgment_rules: judgmentRules,
        }),
      },
    )

    console.log(`判别请求响应状态: ${response.status}`)

    if (response.ok) {
      const result = await response.json()
      console.log("判别请求成功结果:", result)
      return { success: true, data: result.data || result }
    } else {
      const errorText = await response.text()
      console.error("判别请求错误响应:", errorText)
      try {
        const errorData = JSON.parse(errorText)
        return { success: false, error: errorData.error || "判别失败" }
      } catch {
        return { success: false, error: errorText || "判别失败" }
      }
    }
  } catch (error) {
    console.error("判别请求异常:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "网络错误",
    }
  }
}

// 类型转换函数
const convertFolderInfoToFilterPdfFolder = (
  folderInfo: any,
): FilterPdfFolder => {
  const converted: FilterPdfFolder = {
    area_code: folderInfo.area_code || folderInfo.folder_name || "unknown",
    folder_name: folderInfo.folder_name || folderInfo.area_code || "unknown",
    origin_folder_name: folderInfo.origin_folder_name || folderInfo.folder_name,
    status: folderInfo.status || "unknown",
    file_type: folderInfo.file_type || "markdown",
  }

  if (folderInfo.update_time) {
    converted.update_time =
      folderInfo.update_time instanceof Date
        ? folderInfo.update_time.toISOString()
        : folderInfo.update_time
  }

  if (folderInfo.file_count) {
    converted.file_count = folderInfo.file_count
  }

  return converted
}

// 安全渲染规则信息
const renderRuleInfo = (rule: ExtractionRule, index: number) => {
  if (!rule || typeof rule !== "object") {
    return (
      <div
        key={`invalid-rule-${index}`}
        className="text-sm text-red-700 bg-red-100 p-2 rounded">
        <div className="font-medium">无效规则</div>
        <div>规则数据格式错误</div>
      </div>
    )
  }

  const ruleId = rule.id || `rule-${index}`
  const ruleName = rule.name || "未命名规则"

  let promptText = "无提示词"
  if (rule.prompt) {
    promptText =
      rule.prompt.length > 100
        ? rule.prompt.substring(0, 100) + "..."
        : rule.prompt
  }

  let sectionsText = ""
  if (Array.isArray(rule.sections)) {
    sectionsText = rule.sections.join("、")
  }

  return (
    <div key={ruleId} className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
      <div className="font-medium">{ruleName}</div>
      <div>提示词: {promptText}</div>
      {sectionsText && <div>章节: {sectionsText}</div>}
    </div>
  )
}

// 安全渲染判别规则信息
const renderJudgmentRuleInfo = (rule: JudgmentRule, index: number) => {
  if (!rule || typeof rule !== "object") {
    return (
      <div
        key={`invalid-judgment-rule-${index}`}
        className="text-sm text-red-700 bg-red-100 p-2 rounded">
        <div className="font-medium">无效判别规则</div>
        <div>规则数据格式错误</div>
      </div>
    )
  }

  const ruleId = rule.id || `judgment-rule-${index}`
  const ruleName = rule.name || "未命名判别规则"
  const ruleDescription = rule.description || "无描述"

  return (
    <div
      key={ruleId}
      className="text-sm text-green-700 bg-green-100 p-2 rounded">
      <div className="font-medium">{ruleName}</div>
      <div className="text-green-600">描述: {ruleDescription}</div>
    </div>
  )
}

// 安全渲染任务规则区域 - 修复版本
const renderTaskRules = (task: Task | null) => {
  if (!task) return null

  // 安全访问 extractionRules 属性
  const extractionRules = task.extractionRules || []

  if (!Array.isArray(extractionRules)) {
    return (
      <div className="text-red-600 bg-red-50 p-3 rounded">
        规则数据格式错误：extractionRules 不是数组
      </div>
    )
  }

  if (extractionRules.length === 0) {
    return (
      <div className="text-gray-500 bg-gray-50 p-3 rounded">
        该任务没有定义提取规则
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-blue-800">
        提取规则 ({extractionRules.length} 条):
      </p>
      {extractionRules.map((rule, index) => renderRuleInfo(rule, index))}
    </div>
  )
}

// 安全渲染任务判别规则区域 - 修复版本
const renderTaskJudgmentRules = (task: Task | null) => {
  if (!task) return null

  // 安全访问 judgmentRules 属性
  const judgmentRules = task.judgmentRules || []

  if (!Array.isArray(judgmentRules)) {
    return (
      <div className="text-red-600 bg-red-50 p-3 rounded">
        判别规则数据格式错误：judgmentRules 不是数组
      </div>
    )
  }

  if (judgmentRules.length === 0) {
    return (
      <div className="text-gray-500 bg-gray-50 p-3 rounded">
        该任务没有定义判别规则
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-green-800">
        判别规则 ({judgmentRules.length} 条):
      </p>
      {judgmentRules.map((rule, index) => renderJudgmentRuleInfo(rule, index))}
    </div>
  )
}

// 从文件名中提取文件类型
const getFileType = (filename: string): string => {
  if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) return "excel"
  if (filename.endsWith(".txt") || filename.endsWith(".log")) return "text"
  if (filename.endsWith(".json")) return "json"
  if (filename.endsWith(".md")) return "markdown"
  return "other"
}

// 格式化文件大小显示
const formatFileSize = (size: number): string => {
  if (size === 0) return "大小未知"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// 判别结果文件列表组件
const JudgedFileList: React.FC<{
  folderName: string
  taskId?: string
}> = ({ folderName, taskId }) => {
  const [files, setFiles] = useState<ResultFile[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true)
      try {
        if (taskId) {
          // 从任务目录获取判别结果
          const response = await fetch(
            extractionAndDiscriminationApi.getTaskDiscriminationResults(taskId),
          )

          if (response.ok) {
            const data = await response.json()
            const processedFiles: ResultFile[] =
              data.files?.map((file: TaskFile) => ({
                name: file.filename,
                type: getFileType(file.filename),
                size: file.size || 0,
                fullPath: file.full_path,
                relativePath: file.relative_path,
                isMarkdown: isMarkdownFile(file.filename),
              })) || []

            setFiles(processedFiles)
          }
        } else {
          // 原来的逻辑（全局目录）
          const response = await fetch(
            extractionAndDiscriminationApi.getJudgedFoldersInfo,
          )

          if (response.ok) {
            const data = await response.json()
            const targetFolder = data.folders?.find(
              (folder: any) => folder.folder_name === folderName,
            )

            if (targetFolder) {
              const filesResponse = await fetch(
                extractionAndDiscriminationApi.getFolderDetailedInfo(
                  folderName,
                ),
              )
              if (filesResponse.ok) {
                const filesData = await filesResponse.json()

                const processedFiles: ResultFile[] = await Promise.all(
                  (filesData.files || []).map(async (filename: string) => {
                    const fileType = getFileType(filename)

                    try {
                      const sizeResponse = await fetch(
                        extractionAndDiscriminationApi.getFileInfo(
                          folderName,
                          filename,
                        ),
                      )
                      if (sizeResponse.ok) {
                        const sizeData = await sizeResponse.json()
                        return {
                          name: filename,
                          type: fileType,
                          size: sizeData.size || 0,
                          fullPath: `/documents/results/${folderName}/${filename}`,
                          isMarkdown: isMarkdownFile(filename),
                        }
                      }
                    } catch (error) {
                      console.warn(
                        `无法获取文件 ${filename} 的详细信息:`,
                        error,
                      )
                    }

                    return {
                      name: filename,
                      type: fileType,
                      size: 0,
                      fullPath: `/documents/results/${folderName}/${filename}`,
                      isMarkdown: isMarkdownFile(filename),
                    }
                  }),
                )

                setFiles(processedFiles)
              }
            }
          }
        }
      } catch (error) {
        console.error("加载判别结果文件失败:", error)
        toast({
          title: "加载失败",
          description: "无法获取判别结果文件列表",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (folderName || taskId) {
      loadFiles()
    }
  }, [folderName, taskId, toast])

  const downloadJudgedResult = async (filename: string) => {
    try {
      let response: Response

      if (taskId) {
        // 从任务目录下载
        response = await fetch(
          extractionAndDiscriminationApi.downloadTaskDiscriminationFile(
            taskId,
            filename,
          ),
        )
      } else {
        // 原来的逻辑（全局目录）
        response = await fetch(
          extractionAndDiscriminationApi.getResultsFile(folderName, filename),
        )
      }

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "下载成功",
          description: `文件 ${filename} 已开始下载`,
        })
      } else {
        throw new Error("下载文件失败")
      }
    } catch (error) {
      console.error("下载判别结果失败:", error)
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const visibleFiles = expanded ? files : files.slice(0, 3)

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          加载文件中...
        </div>
      ) : files.length > 0 ? (
        <>
          <div className="space-y-2">
            {visibleFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file.type, file.name)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="text-sm font-medium truncate"
                            title={file.name}>
                            {truncateFileName(file.name, 30)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{file.name}</p>
                          {file.isMarkdown && (
                            <p className="text-xs text-blue-500 mt-1">
                              📝 Markdown文件
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: file.isMarkdown
                            ? "#eff6ff"
                            : "#f9fafb",
                        }}>
                        {getFileTypeDisplay(file.type, file.name)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadJudgedResult(file.name)}
                  className="h-8 px-2 flex-shrink-0">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {files.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full text-xs">
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  收起文件列表
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  显示全部 {files.length} 个文件
                </>
              )}
            </Button>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 py-4">
          <FileCode className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <span className="text-sm">暂无判别结果文件</span>
          <p className="text-xs mt-1">请确保判别任务已完成并生成了结果文件</p>
        </div>
      )}
    </div>
  )
}

// 日志列表组件
interface LogListProps {
  data: any[]
  columns: Column[]
  type: "extraction" | "discrimination"
}

type Column = {
  key: string
  label: string
  tdClassName?: string
  render?: (value: any, row: any) => React.ReactNode
}

const LogList: React.FC<LogListProps> = ({ data, columns, type }) => {
  const { page, totalPages, pageData, next, prev, goTo } = usePagination(
    data,
    10,
  )

  // 格式化日期时间
  const formatDateTime = (date: Date | string): string => {
    try {
      if (date instanceof Date) {
        return date.toLocaleString()
      } else if (typeof date === "string") {
        const parsedDate = new Date(date)
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleString()
        }
        return date
      }
      return "-"
    } catch (error) {
      return "-"
    }
  }

  return (
    <div className="space-y-4">
      {/* 日志列表 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pageData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-gray-900 ${
                      col.tdClassName || ""
                    }`}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>暂无{type === "extraction" ? "提取" : "判别"}日志</p>
            <p className="text-sm mt-1">
              执行{type === "extraction" ? "提取" : "判别"}
              操作后，日志将显示在这里
            </p>
          </div>
        )}
      </div>

      {/* 分页组件 */}
      {data.length > 0 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={prev} />
            </PaginationItem>

            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1
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

            <PaginationItem>
              <PaginationNext onClick={next} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

// 新增：定义一个接口用于接收props
interface ExtractionAndDiscriminationProps {
  selectedFolders: DecompressedFolder[] // 移除 selectedTask，从全局上下文获取
}

const ExtractionAndDiscrimination: React.FC<
  ExtractionAndDiscriminationProps
> = ({ selectedFolders }) => {
  // 从全局任务上下文获取任务信息
  const { selectedTaskId, setSelectedTaskId, selectedTask, setSelectedTask } =
    useTaskStore()

  const [extractionLogs, setExtractionLogs] = useState<ExtractionLog[]>([])
  const [discriminationLogs, setDiscriminationLogs] = useState<
    DiscriminationLog[]
  >([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isDiscriminating, setIsDiscriminating] = useState(false)
  const { toast } = useToast()
  const [filterPdfFolders, setFilterPdfFolders] = useState<FilterPdfFolder[]>(
    [],
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [extractedFolderInfo, setExtractedFolderInfo] = useState<any[]>([])
  const [resultsFolderInfo, setResultsFolderInfo] = useState<FolderInfo[]>([])
  const [jsonFiles, setJsonFiles] = useState<JsonFileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<string>("all")
  const [fileTypeFilter, setFileTypeFilter] = useState<
    "markdown" | "json" | "all"
  >("all") // 新增：文件类型筛选

  // 新增：进度状态
  const [extractionProgress, setExtractionProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
  })
  const [discriminationProgress, setDiscriminationProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
  })

  // 获取已提取的文件夹信息 - 修改为使用新接口
  const fetchExtractedFolders = async () => {
    try {
      console.log("开始获取已提取文件夹信息...")
      const extractedFolders = await getExtractedFoldersInfo()
      console.log("获取到的已提取文件夹:", extractedFolders)
      setExtractedFolderInfo(extractedFolders)

      const convertedFolders = extractedFolders.map(
        convertFolderInfoToFilterPdfFolder,
      )
      setFilterPdfFolders(convertedFolders)

      return extractedFolders
    } catch (error) {
      console.error("获取已提取文件夹失败:", error)
      // 发生错误时设置空数组，而不是抛出错误
      setExtractedFolderInfo([])
      setFilterPdfFolders([])
      return []
    }
  }

  // 获取判别结果文件夹信息 - 修改为使用新接口，添加去重逻辑
  const fetchJudgedFolders = async () => {
    try {
      const judgedFolders = await getJudgedFoldersInfo()
      // 去重处理：基于 folder_name 去重
      const uniqueFolders = judgedFolders.filter(
        (folder, index, self) =>
          index === self.findIndex((f) => f.folder_name === folder.folder_name),
      )
      console.log("去重后的判别文件夹:", uniqueFolders)
      setResultsFolderInfo(uniqueFolders)
      return uniqueFolders
    } catch (error) {
      console.error("获取判别文件夹失败:", error)
      // 发生错误时设置空数组
      setResultsFolderInfo([])
      return []
    }
  }

  // 获取 JSON 文件 - 修改为使用新接口
  const fetchJsonFiles = async () => {
    try {
      const allJsonFiles: JsonFileInfo[] = []
      const markdownExtractionJsonFiles = await getMarkdownExtractionJsonFiles()
      allJsonFiles.push(...markdownExtractionJsonFiles)
      setJsonFiles(allJsonFiles)
      console.log("获取到的JSON文件:", allJsonFiles)
    } catch (error) {
      console.warn(`无法加载 markdown_extraction 文件夹的 JSON 文件:`, error)
      setJsonFiles([])
    }
  }

  // 手动刷新数据
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const [extractedFolders, judgedFolders] = await Promise.all([
        fetchExtractedFolders(),
        fetchJudgedFolders(),
      ])

      await fetchJsonFiles()

      toast({
        title: "刷新成功",
        description: `已更新 ${extractedFolders.length} 个提取结果和 ${judgedFolders.length} 个判别结果`,
      })
    } catch (error) {
      console.error("刷新失败:", error)
      toast({
        title: "刷新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // 内容提取函数
  const extractContentFromFolder = async (
    folderName: string,
    extractionRules?: ExtractionRule[],
  ): Promise<{
    content: string
    status: string
    actualFiles?: string[]
    rule_identifier?: string
  }> => {
    try {
      console.log(`开始实际处理文件夹: ${folderName}`)

      // 使用传入的规则，如果没有则使用任务规则，都没有则用空数组
      const rulesToUse = extractionRules || selectedTask?.extractionRules || []

      console.log(`提取规则数量: ${rulesToUse.length}`)

      const requestBody: any = {
        folder_name: folderName,
        extraction_rules: rulesToUse,
      }

      if (selectedTask && rulesToUse.length > 0) {
        requestBody.task_id = selectedTask.id
        requestBody.extraction_rules = rulesToUse.map((rule) => {
          return {
            id: rule.id,
            name: rule.name,
            prompt: rule.prompt,
            sections: rule.sections,
            title_exclude_keywords: rule.title_exclude_keywords || [], //12.30新增
          }
        })
      }

      console.log("发送处理请求:", JSON.stringify(requestBody, null, 2))

      const response = await fetch(
        extractionAndDiscriminationApi.extractContent,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      )

      if (!response.ok) {
        let errorMessage = `HTTP错误! 状态: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
          console.error("后端返回的错误信息:", errorData)
        } catch (e) {
          const errorText = await response.text()
          errorMessage = errorText || errorMessage
          console.error("后端返回的原始错误:", errorText)
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("后端处理结果:", result)

      let extractedContent = `【文件内容提取结果】\n\n`
      extractedContent += `处理文件夹: ${folderName}\n`
      extractedContent += `处理时间: ${new Date().toLocaleString()}\n`
      extractedContent += `处理模式: 实际文件处理\n`
      extractedContent += `状态: ${result.message}\n`

      if (selectedTask) {
        extractedContent += `使用任务: ${selectedTask.name}\n`
        extractedContent += `提取规则: ${rulesToUse.length} 条\n`
      }

      if (result.rule_identifier) {
        extractedContent += `规则标识: ${result.rule_identifier}\n`
      }

      if (result.folder_info) {
        extractedContent += `处理详情:\n`
        extractedContent += `- 地块编码: ${
          result.folder_info.area_code || folderName
        }\n`
        extractedContent += `- 文件夹名称: ${
          result.folder_info.folder_name || folderName
        }\n`
        extractedContent += `- 文件类型: Markdown\n`
        extractedContent += `- 更新时间: ${
          result.folder_info.update_time || "未知"
        }\n`
        extractedContent += `- 处理状态: ${
          result.folder_info.status || "未知"
        }\n`
      }

      if (result.file_statistics) {
        extractedContent += `\n文件生成统计:\n`
        extractedContent += `- 总文件数: ${result.file_statistics.total_files}\n`
        extractedContent += `- Markdown文件: ${result.file_statistics.markdown_files}\n`
        extractedContent += `- JSON文件: ${result.file_statistics.json_files}\n`
      }

      if (result.result_files && result.result_files.length > 0) {
        extractedContent += `\n生成的文件列表:\n`
        result.result_files.forEach((file: string) => {
          extractedContent += `- ${file}\n`
        })
      }

      extractedContent += `\n文件提取流程:\n`
      extractedContent += `1. 扫描JSON文件夹中的文件\n`
      extractedContent += `2. 读取JSON文件内容\n`
      extractedContent += `3. 调用大模型API进行内容提取\n`
      extractedContent += `4. 生成JSON格式提取结果\n`
      extractedContent += `5. 生成Markdown格式提取结果\n`
      extractedContent += `6. 状态更新为: ${
        result.folder_info?.status || "completed"
      }`

      return {
        content: extractedContent,
        status: result.folder_info?.status || "completed",
        actualFiles: result.result_files || [],
        rule_identifier: result.rule_identifier,
      }
    } catch (error) {
      console.error("文件内容提取失败:", error)
      throw new Error(
        `文件内容提取失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
      )
    }
  }

  // 任务内容提取函数
  const extractContentForTask = async (): Promise<{
    success: boolean
    data?: any
    error?: string
  }> => {
    if (!selectedTask) {
      return { success: false, error: "请先选择任务" }
    }

    try {
      const extractionRules = selectedTask.extractionRules || []
      if (extractionRules.length === 0) {
        return { success: false, error: "任务没有定义提取规则" }
      }

      const result = await requestTaskExtraction(
        selectedTask.id,
        extractionRules,
      )
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      }
    }
  }

  // 执行核心内容提取
  const handleExtractCoreContent = async () => {
    if (!selectedTask) {
      toast({
        title: "请先选择任务",
        description: "请在文件上传界面选择任务",
        variant: "destructive",
      })
      return
    }

    console.log("=== 开始任务内容提取 ===")
    console.log("任务ID:", selectedTask.id)
    console.log("任务名称:", selectedTask.name)

    setIsExtracting(true)

    // 初始化提取进度
    setExtractionProgress({
      current: 0,
      total: 1,
      percentage: 0,
    })

    try {
      const logId = `log-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const processingLog: ExtractionLog = {
        id: logId,
        fileName: selectedTask.name,
        fileId: selectedTask.id,
        extractedAt: new Date(),
        status: "processing",
        selectedTask: selectedTask,
        fileType: "task",
        taskId: selectedTask.id,
        sourceType: "markdown", // 新增：标记为Markdown提取
      }

      const updatedLogs = [...extractionLogs, processingLog]
      saveExtractionLogs(updatedLogs)

      try {
        // 更新进度
        setExtractionProgress({
          current: 1,
          total: 1,
          percentage: 50,
        })

        // 执行任务提取
        const result = await extractContentForTask()

        if (result.success) {
          const completedLog: ExtractionLog = {
            ...processingLog,
            status: "completed",
            content: `任务 ${selectedTask.name} 内容提取完成`,
            chapter: "任务内容提取",
            actualProcessedFile:
              result.data?.extraction_results?.directory || "任务目录",
            ruleIdentifier: result.data?.rule_identifier || "default",
            sourceType:
              result.data?.file_types?.processed_markdown > 0
                ? "markdown"
                : "json",
          }

          const finalLogs = updatedLogs.slice(0, -1).concat(completedLog)
          saveExtractionLogs(finalLogs)

          const dataServiceResult: ExtractionResult = {
            id: `result-${Date.now()}`,
            fileId: selectedTask.id,
            ruleId: selectedTask.id,
            content: `任务 ${selectedTask.name} 内容提取完成`,
            confidence: 0.95,
            location: {
              page: 1,
              section: "任务内容提取",
            },
            extractedAt: new Date(),
          }

          dataService.addExtractionResult(dataServiceResult)

          console.log(`成功处理任务: ${selectedTask.name}`)
        } else {
          throw new Error(result.error || "任务提取失败")
        }
      } catch (error) {
        console.error(`处理任务失败: ${selectedTask.name}`, error)

        const errorLog: ExtractionLog = {
          id: logId,
          fileName: selectedTask.name,
          fileId: selectedTask.id,
          extractedAt: new Date(),
          status: "error",
          errorMessage: error instanceof Error ? error.message : "任务提取失败",
          selectedTask: selectedTask,
          fileType: "task",
          taskId: selectedTask.id,
          sourceType: "markdown",
        }

        const errorLogs = updatedLogs.slice(0, -1).concat(errorLog)
        saveExtractionLogs(errorLogs)
      }

      // 重置进度
      setExtractionProgress({
        current: 0,
        total: 0,
        percentage: 100,
      })

      toast({
        title: "任务内容提取完成",
        description: `任务 ${selectedTask.name} 的内容提取已处理完成`,
      })
    } catch (error) {
      console.error("任务内容提取出错:", error)
      toast({
        title: "任务内容提取失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  // 保存提取日志到localStorage - 修复日期序列化问题
  const saveExtractionLogs = (logs: ExtractionLog[]) => {
    // 确保日期被正确序列化
    const logsToSave = logs.map((log) => ({
      ...log,
      extractedAt:
        log.extractedAt instanceof Date
          ? log.extractedAt.toISOString()
          : log.extractedAt,
    }))
    localStorage.setItem("extraction_logs", JSON.stringify(logsToSave))
    setExtractionLogs(logs)
  }

  // 保存判别日志到localStorage - 修复日期序列化问题
  const saveDiscriminationLogs = (logs: DiscriminationLog[]) => {
    const logsToSave = logs.map((log) => ({
      ...log,
      discriminatedAt:
        log.discriminatedAt instanceof Date
          ? log.discriminatedAt.toISOString()
          : log.discriminatedAt,
    }))
    localStorage.setItem("discrimination_logs", JSON.stringify(logsToSave))
    setDiscriminationLogs(logs)
  }

  // 导出提取结果
  const exportExtractionResults = () => {
    const completedLogs = extractionLogs.filter(
      (log) => log.status === "completed",
    )

    if (completedLogs.length === 0) {
      toast({
        title: "无可导出内容",
        description: "请先执行内容提取",
        variant: "destructive",
      })
      return
    }

    const csvContent = [
      ["文档名称", "处理文件", "提取时间", "任务名称", "状态", "源文件类型"],
      ...completedLogs.map((log) => [
        log.fileName,
        log.actualProcessedFile || log.fileName,
        new Date(log.extractedAt).toLocaleString(),
        log.selectedTask?.name || "",
        log.status === "completed" ? "完成" : "失败",
        log.sourceType === "markdown" ? "Markdown" : "JSON",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `extraction-results-${
      new Date().toISOString().split("T")[0]
    }.csv`
    link.click()
    URL.revokeObjectURL(link.href)

    toast({
      title: "导出成功",
      description: `已导出 ${completedLogs.length} 条提取结果`,
    })
  }

  // 导出判别结果
  const exportDiscriminationResults = () => {
    const completedLogs = discriminationLogs.filter(
      (log) => log.status === "completed",
    )

    if (completedLogs.length === 0) {
      toast({
        title: "无可导出内容",
        description: "请先执行判别操作",
        variant: "destructive",
      })
      return
    }

    const csvContent = [
      ["文档名称", "判别时间", "任务名称", "判别规则", "状态"],
      ...completedLogs.map((log) => [
        log.fileName,
        new Date(log.discriminatedAt).toLocaleString(),
        log.selectedTask?.name || "",
        log.judgmentRule?.name || "默认规则",
        log.status === "completed" ? "完成" : "失败",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `discrimination-results-${
      new Date().toISOString().split("T")[0]
    }.csv`
    link.click()
    URL.revokeObjectURL(link.href)

    toast({
      title: "导出成功",
      description: `已导出 ${completedLogs.length} 条判别结果`,
    })
  }

  // 清空提取日志
  const clearExtractionLogs = () => {
    saveExtractionLogs([])
    toast({
      title: "提取日志已清空",
      description: "所有提取日志已被清除",
    })
  }

  // 清空判别日志
  const clearDiscriminationLogs = () => {
    saveDiscriminationLogs([])
    toast({
      title: "判别日志已清空",
      description: "所有判别日志已被清除",
    })
  }

  // 判别相关函数
  const handleAIAnalysis = async (
    folderName: string,
    judgmentRule?: JudgmentRule,
  ) => {
    if (!selectedTask) {
      toast({
        title: "请先选择任务",
        description: "请在文件上传界面选择任务",
        variant: "destructive",
      })
      return
    }

    try {
      const rulesDescription = judgmentRule
        ? `使用判别规则: ${judgmentRule.name} - ${judgmentRule.description}`
        : `使用任务规则: ${selectedTask.name}`

      const logId = `discrimination-log-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const processingLog: DiscriminationLog = {
        id: logId,
        fileName: folderName,
        fileId: folderName,
        discriminatedAt: new Date(),
        status: "processing",
        selectedTask: selectedTask,
        judgmentRule: judgmentRule,
      }

      const updatedLogs = [...discriminationLogs, processingLog]
      saveDiscriminationLogs(updatedLogs)

      const result = await requestAIAnalysis(
        folderName,
        selectedFile,
        rulesDescription,
      )

      if (result.success) {
        const completedLog: DiscriminationLog = {
          ...processingLog,
          status: "completed",
          content: `文件夹 ${folderName} 的判别任务已完成，使用规则: ${
            judgmentRule?.name || "默认规则"
          }`,
        }

        const finalLogs = updatedLogs.slice(0, -1).concat(completedLog)
        saveDiscriminationLogs(finalLogs)

        toast({
          title: "判别已启动",
          description: `文件夹 ${folderName} 的判别任务已开始处理`,
        })

        // 刷新判别结果列表
        await fetchJudgedFolders()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("判别失败:", error)

      const errorLog: DiscriminationLog = {
        id: `discrimination-log-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        fileName: folderName,
        fileId: folderName,
        discriminatedAt: new Date(),
        status: "error",
        errorMessage: error instanceof Error ? error.message : "判别失败",
        selectedTask: selectedTask,
        judgmentRule: judgmentRule,
      }

      const errorLogs = [...discriminationLogs, errorLog]
      saveDiscriminationLogs(errorLogs)

      toast({
        title: "AI判别失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  // 任务判别函数
  const handleTaskDiscrimination = async () => {
    if (!selectedTask) {
      toast({
        title: "请先选择任务",
        description: "请在文件上传界面选择任务",
        variant: "destructive",
      })
      return
    }

    console.log("=== 开始任务判别 ===")
    console.log("任务ID:", selectedTask.id)
    console.log("任务名称:", selectedTask.name)

    setIsDiscriminating(true)

    // 初始化判别进度
    setDiscriminationProgress({
      current: 0,
      total: 1,
      percentage: 0,
    })

    try {
      const logId = `discrimination-log-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`

      const processingLog: DiscriminationLog = {
        id: logId,
        fileName: selectedTask.name,
        fileId: selectedTask.id,
        discriminatedAt: new Date(),
        status: "processing",
        selectedTask: selectedTask,
        taskId: selectedTask.id,
      }

      const updatedLogs = [...discriminationLogs, processingLog]
      saveDiscriminationLogs(updatedLogs)

      try {
        // 更新进度
        setDiscriminationProgress({
          current: 1,
          total: 1,
          percentage: 50,
        })

        // 获取判别规则
        const judgmentRules = selectedTask.judgmentRules || []
        if (judgmentRules.length === 0) {
          throw new Error("任务没有定义判别规则")
        }

        // 执行任务判别
        const result = await requestTaskDiscrimination(
          selectedTask.id,
          judgmentRules,
        )

        if (result.success) {
          const completedLog: DiscriminationLog = {
            ...processingLog,
            status: "completed",
            content: `任务 ${selectedTask.name} 判别完成`,
            judgmentRule: judgmentRules[0],
          }

          const finalLogs = updatedLogs.slice(0, -1).concat(completedLog)
          saveDiscriminationLogs(finalLogs)

          toast({
            title: "任务判别完成",
            description: `任务 ${selectedTask.name} 的判别已完成`,
          })
        } else {
          throw new Error(result.error || "任务判别失败")
        }
      } catch (error) {
        console.error(`任务判别失败: ${selectedTask.name}`, error)

        const errorLog: DiscriminationLog = {
          id: logId,
          fileName: selectedTask.name,
          fileId: selectedTask.id,
          discriminatedAt: new Date(),
          status: "error",
          errorMessage: error instanceof Error ? error.message : "任务判别失败",
          selectedTask: selectedTask,
          taskId: selectedTask.id,
        }

        const errorLogs = updatedLogs.slice(0, -1).concat(errorLog)
        saveDiscriminationLogs(errorLogs)

        toast({
          title: "任务判别失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        })
      }

      // 重置进度
      setDiscriminationProgress({
        current: 0,
        total: 0,
        percentage: 100,
      })
    } catch (error) {
      console.error("任务判别出错:", error)
      toast({
        title: "任务判别失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsDiscriminating(false)
    }
  }

  // 批量AI判别
  const handleBatchAIAnalysis = async () => {
    if (!selectedTask) {
      toast({
        title: "请先选择任务",
        description: "请在文件上传界面选择任务",
        variant: "destructive",
      })
      return
    }

    if (!filterPdfFolders || filterPdfFolders.length === 0) {
      toast({
        title: "无可判别文件夹",
        description: "没有找到可判别的文件夹",
        variant: "destructive",
      })
      return
    }

    setIsDiscriminating(true)

    // 初始化判别进度
    const totalFolders = filterPdfFolders.length
    setDiscriminationProgress({
      current: 0,
      total: totalFolders,
      percentage: 0,
    })

    try {
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < filterPdfFolders.length; i++) {
        const folder = filterPdfFolders[i]

        // 更新进度
        setDiscriminationProgress({
          current: i + 1,
          total: totalFolders,
          percentage: Math.round(((i + 1) / totalFolders) * 100),
        })

        try {
          // 使用第一个判别规则，如果没有则使用默认 - 修复：使用可选链
          const judgmentRule =
            selectedTask.judgmentRules?.length > 0
              ? selectedTask.judgmentRules[0]
              : undefined

          const rulesDescription = judgmentRule
            ? `使用判别规则: ${judgmentRule.name} - ${judgmentRule.description}`
            : `使用任务规则: ${selectedTask.name}`

          const result = await requestAIAnalysis(
            folder.folder_name,
            selectedFile,
            rulesDescription,
          )

          if (result.success) {
            successCount++

            const log: DiscriminationLog = {
              id: `discrimination-log-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              fileName: folder.folder_name,
              fileId: folder.area_code,
              discriminatedAt: new Date(),
              status: "completed",
              content: `文件夹 ${folder.folder_name} 的AI判别任务已完成`,
              selectedTask: selectedTask,
              judgmentRule: judgmentRule,
            }

            const updatedLogs = [...discriminationLogs, log]
            saveDiscriminationLogs(updatedLogs)
          } else {
            errorCount++

            const log: DiscriminationLog = {
              id: `discrimination-log-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              fileName: folder.folder_name,
              fileId: folder.area_code,
              discriminatedAt: new Date(),
              status: "error",
              errorMessage: result.error || "判别失败",
              selectedTask: selectedTask,
              judgmentRule: judgmentRule,
            }

            const updatedLogs = [...discriminationLogs, log]
            saveDiscriminationLogs(updatedLogs)
          }
        } catch (error) {
          console.error(`文件夹 ${folder.folder_name} 判别失败:`, error)
          errorCount++

          const log: DiscriminationLog = {
            id: `discrimination-log-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            fileName: folder.folder_name,
            fileId: folder.area_code,
            discriminatedAt: new Date(),
            status: "error",
            errorMessage: error instanceof Error ? error.message : "判别失败",
            selectedTask: selectedTask,
          }

          const updatedLogs = [...discriminationLogs, log]
          saveDiscriminationLogs(updatedLogs)
        }
      }

      // 重置进度
      setDiscriminationProgress({
        current: 0,
        total: 0,
        percentage: 0,
      })

      toast({
        title: "批量判别完成",
        description: `成功提交 ${successCount} 个，失败 ${errorCount} 个`,
      })

      // 刷新判别结果列表
      await fetchJudgedFolders()
    } catch (error) {
      console.error("批量判别失败:", error)
      toast({
        title: "批量判别失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsDiscriminating(false)
    }
  }

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      console.log("初始化数据...")
      try {
        await Promise.all([
          fetchExtractedFolders(),
          fetchJudgedFolders(),
          fetchJsonFiles(),
        ])
        console.log("数据初始化完成")
      } catch (error) {
        console.error("数据初始化失败:", error)
        // 即使部分失败，也继续显示界面
      }
    }

    initializeData()
  }, [])

  // 加载本地存储的日志 - 修复日期反序列化问题
  useEffect(() => {
    const savedExtractionLogs = localStorage.getItem("extraction_logs")
    if (savedExtractionLogs) {
      try {
        const parsedLogs = JSON.parse(savedExtractionLogs)
        // 将字符串日期转换回 Date 对象
        const logsWithDates = parsedLogs.map((log: any) => ({
          ...log,
          extractedAt: new Date(log.extractedAt),
        }))
        setExtractionLogs(logsWithDates)
      } catch (error) {
        console.error("解析保存的提取日志失败:", error)
      }
    }

    const savedDiscriminationLogs = localStorage.getItem("discrimination_logs")
    if (savedDiscriminationLogs) {
      try {
        const parsedLogs = JSON.parse(savedDiscriminationLogs)
        // 将字符串日期转换回 Date 对象
        const logsWithDates = parsedLogs.map((log: any) => ({
          ...log,
          discriminatedAt: new Date(log.discriminatedAt),
        }))
        setDiscriminationLogs(logsWithDates)
      } catch (error) {
        console.error("解析保存的判别日志失败:", error)
      }
    }
  }, [])

  // 安全获取提取规则数量
  const getExtractionRulesCount = () => {
    if (!selectedTask) return 0
    return selectedTask.extractionRules?.length || 0
  }

  // 安全获取判别规则数量
  const getJudgmentRulesCount = () => {
    if (!selectedTask) return 0
    return selectedTask.judgmentRules?.length || 0
  }

  // 安全获取文件夹数量
  const getSelectedFoldersCount = () => {
    return selectedFolders?.length || 0
  }

  // 安全获取提取文件夹数量
  const getFilterPdfFoldersCount = () => {
    return filterPdfFolders?.length || 0
  }

  // 安全获取判别结果文件夹数量
  const getResultsFolderInfoCount = () => {
    return resultsFolderInfo?.length || 0
  }

  // 文件类型筛选切换
  const handleFileTypeFilterChange = (type: "markdown" | "json" | "all") => {
    setFileTypeFilter(type)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            内容提取与判别
          </h1>
          <p className="text-lg text-gray-600">
            智能提取文档内容并进行判别分析
          </p>
          {selectedTask && (
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <Brain className="h-5 w-5" />
              <span className="font-medium">当前任务: {selectedTask.name}</span>
              <Badge variant="outline" className="ml-2">
                {getSelectedFoldersCount()} 个文件夹
              </Badge>
              {/* 修复：使用安全函数获取规则数量 */}
              <Badge variant="outline" className="ml-2">
                {getExtractionRulesCount()} 条提取规则
              </Badge>
              {/* 修复：使用安全函数获取规则数量 */}
              <Badge variant="outline" className="ml-2">
                {getJudgmentRulesCount()} 条判别规则
              </Badge>
            </div>
          )}
        </div>

        {/* 任务信息展示 */}
        {selectedTask && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                任务信息: {selectedTask.name}
              </CardTitle>
              <CardDescription>
                {selectedTask.description || "当前选中的任务规则信息"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 提取规则 */}
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h3 className="font-medium text-blue-800 mb-2">提取规则</h3>
                  {renderTaskRules(selectedTask)}
                </div>

                {/* 判别规则 */}
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <h3 className="font-medium text-green-800 mb-2">判别规则</h3>
                  {renderTaskJudgmentRules(selectedTask)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 操作区域 - 左右分栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：提取操作 */}
          <div className="space-y-6">
            {/* 提取按钮 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-600" />
                  内容提取
                </CardTitle>
                <CardDescription>
                  使用选定的任务规则提取文档内容
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={handleExtractCoreContent}
                    disabled={isExtracting || !selectedTask}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg">
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        提取中...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        {selectedTask
                          ? `开始提取 (任务: ${selectedTask.name})`
                          : "开始提取"}
                      </>
                    )}
                  </Button>

                  {/* 提取进度条 */}
                  {isExtracting && extractionProgress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>处理进度</span>
                        <span>
                          {extractionProgress.current}/
                          {extractionProgress.total}(
                          {extractionProgress.percentage}%)
                        </span>
                      </div>
                      <Progress
                        value={extractionProgress.percentage}
                        className="h-2"
                      />
                    </div>
                  )}

                  {!selectedTask && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        请在文件上传界面选择任务
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 提取结果 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    {selectedTask ? "任务提取结果" : "提取结果"}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        fileTypeFilter === "markdown" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handleFileTypeFilterChange("markdown")}
                      className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Markdown
                    </Button>
                    <Button
                      variant={
                        fileTypeFilter === "json" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handleFileTypeFilterChange("json")}
                      className="text-xs">
                      <FileCode className="h-3 w-3 mr-1" />
                      JSON
                    </Button>
                    <Button
                      variant={fileTypeFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFileTypeFilterChange("all")}
                      className="text-xs">
                      <File className="h-3 w-3 mr-1" />
                      全部
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {selectedTask
                    ? "任务内容提取的结果文件"
                    : "已提取的内容结果文件"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTask ? (
                  <FileList
                    taskId={selectedTask.id}
                    isExtractionResult={true}
                    fileTypeFilter={fileTypeFilter}
                  />
                ) : getFilterPdfFoldersCount() > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filterPdfFolders.map((folder) => (
                      <div
                        key={folder.area_code}
                        className="border rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">
                              {folder.folder_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {folder.area_code}
                            </Badge>
                            {folder.file_count && (
                              <Badge variant="secondary" className="text-xs">
                                {folder.file_count} 个文件
                              </Badge>
                            )}
                          </div>
                        </div>
                        <FileList
                          areaCode={folder.area_code}
                          fileTypeFilter={fileTypeFilter}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>暂无提取结果</p>
                    <p className="text-sm mt-1">请先执行内容提取操作</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：判别操作 */}
          <div className="space-y-6">
            {/* 判别按钮 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-600" />
                  智能判别
                </CardTitle>
                <CardDescription>对提取结果进行判别分析</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={
                      selectedTask
                        ? handleTaskDiscrimination
                        : handleBatchAIAnalysis
                    }
                    disabled={isDiscriminating || !selectedTask}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg">
                    {isDiscriminating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        判别中...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        {selectedTask
                          ? `开始判别 (任务: ${selectedTask.name})`
                          : "开始判别"}
                      </>
                    )}
                  </Button>

                  {/* 判别进度条 */}
                  {isDiscriminating && discriminationProgress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>判别进度</span>
                        <span>
                          {discriminationProgress.current}/
                          {discriminationProgress.total}(
                          {discriminationProgress.percentage}%)
                        </span>
                      </div>
                      <Progress
                        value={discriminationProgress.percentage}
                        className="h-2"
                      />
                    </div>
                  )}

                  {!selectedTask && (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription>
                        请在文件上传界面选择任务
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 判别结果 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-green-600" />
                  {selectedTask ? "任务判别结果" : "判别结果"}
                </CardTitle>
                <CardDescription>
                  {selectedTask ? "任务判别分析结果文件" : "判别分析结果文件"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTask ? (
                  <FileList
                    taskId={selectedTask.id}
                    isDiscriminationResult={true}
                  />
                ) : getResultsFolderInfoCount() > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {resultsFolderInfo.map((folder) => (
                      <div
                        key={folder.area_code}
                        className="border rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {folder.folder_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {folder.area_code}
                            </Badge>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {folder.status}
                          </Badge>
                        </div>
                        <JudgedFileList folderName={folder.folder_name} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Brain className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>暂无判别结果</p>
                    <p className="text-sm mt-1">请先执行判别操作</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 源文件列表（分块结果） */}
        {selectedTask && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-gray-600" />
                  源文件（分块结果）
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={
                      fileTypeFilter === "markdown" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleFileTypeFilterChange("markdown")}
                    className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Markdown
                  </Button>
                  <Button
                    variant={fileTypeFilter === "json" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFileTypeFilterChange("json")}
                    className="text-xs">
                    <FileCode className="h-3 w-3 mr-1" />
                    JSON
                  </Button>
                  <Button
                    variant={fileTypeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFileTypeFilterChange("all")}
                    className="text-xs">
                    <File className="h-3 w-3 mr-1" />
                    全部
                  </Button>
                </div>
              </div>
              <CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-blue-600">
                    将优先从Markdown文件中提取内容
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileList
                taskId={selectedTask.id}
                fileTypeFilter={fileTypeFilter}
              />
            </CardContent>
          </Card>
        )}

        {/* 日志区域 - 左右分栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：提取日志 */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  提取日志
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportExtractionResults}>
                    <Download className="h-3 w-3 mr-1" />
                    导出CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearExtractionLogs}>
                    清空日志
                  </Button>
                </div>
              </div>
              <CardDescription>内容提取的操作记录和结果</CardDescription>
            </CardHeader>
            <CardContent>
              <LogList
                data={extractionLogs}
                type="extraction"
                columns={[
                  {
                    key: "fileName",
                    label: "文件名",
                    render: (value: string, row: any) => (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 max-w-[180px]">
                            {row.sourceType === "markdown" ? (
                              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <FileCode className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            <span
                              className="font-medium truncate"
                              title={value}>
                              {truncateFileName(value, 20)}
                            </span>
                            {row.sourceType && (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0 h-4"
                                style={{
                                  backgroundColor:
                                    row.sourceType === "markdown"
                                      ? "#eff6ff"
                                      : "#f0fdf4",
                                }}>
                                {row.sourceType === "markdown" ? "MD" : "JSON"}
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs break-words">{value}</p>
                          {row.actualProcessedFile && (
                            <p className="text-xs text-gray-500 mt-1">
                              实际文件: {row.actualProcessedFile}
                            </p>
                          )}
                          {row.taskId && (
                            <p className="text-xs text-gray-500 mt-1">
                              任务ID: {row.taskId}
                            </p>
                          )}
                          {row.sourceType && (
                            <p className="text-xs text-gray-500 mt-1">
                              源文件类型:{" "}
                              {row.sourceType === "markdown"
                                ? "Markdown"
                                : "JSON"}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  },
                  {
                    key: "fileType",
                    label: "类型",
                    tdClassName: "w-20",
                    render: (value: string) => (
                      <Badge variant="outline" className="text-xs">
                        {value || "文件"}
                      </Badge>
                    ),
                  },
                  {
                    key: "content",
                    label: "大小",
                    tdClassName: "w-24",
                    render: (value: string) => (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {value ? `${(value.length / 1024).toFixed(1)} KB` : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: "状态",
                    tdClassName: "w-20",
                    render: (value: string, row: any) => (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            value === "completed"
                              ? "bg-green-500"
                              : value === "error"
                                ? "bg-red-500"
                                : "bg-blue-500"
                          }`}
                        />
                        <span className="text-xs whitespace-nowrap">
                          {value === "completed"
                            ? "已完成"
                            : value === "error"
                              ? "错误"
                              : "处理中"}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "extractedAt",
                    label: "处理时间",
                    tdClassName: "w-32",
                    render: (value: Date | string) => (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(value).toLocaleString()}
                      </span>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>

          {/* 右侧：判别日志 */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-green-600" />
                  判别日志
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportDiscriminationResults}>
                    <Download className="h-3 w-3 mr-1" />
                    导出CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearDiscriminationLogs}>
                    清空日志
                  </Button>
                </div>
              </div>
              <CardDescription>判别分析的操作记录和结果</CardDescription>
            </CardHeader>
            <CardContent>
              <LogList
                data={discriminationLogs}
                type="discrimination"
                columns={[
                  {
                    key: "fileName",
                    label: "文件名",
                    render: (value: string, row: any) => (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 max-w-[180px]">
                            <Brain className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span
                              className="font-medium truncate"
                              title={value}>
                              {truncateFileName(value, 20)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs break-words">{value}</p>
                          {row.judgmentRule?.name && (
                            <p className="text-xs text-gray-500 mt-1">
                              判别规则: {row.judgmentRule.name}
                            </p>
                          )}
                          {row.taskId && (
                            <p className="text-xs text-gray-500 mt-1">
                              任务ID: {row.taskId}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  },
                  {
                    key: "fileType",
                    label: "类型",
                    tdClassName: "w-20",
                    render: (value: string) => (
                      <Badge variant="outline" className="text-xs">
                        {value || "判别结果"}
                      </Badge>
                    ),
                  },
                  {
                    key: "content",
                    label: "大小",
                    tdClassName: "w-24",
                    render: (value: string) => (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {value ? `${(value.length / 1024).toFixed(1)} KB` : "-"}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: "状态",
                    tdClassName: "w-20",
                    render: (value: string, row: any) => (
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            value === "completed"
                              ? "bg-green-500"
                              : value === "error"
                                ? "bg-red-500"
                                : "bg-blue-500"
                          }`}
                        />
                        <span className="text-xs whitespace-nowrap">
                          {value === "completed"
                            ? "已完成"
                            : value === "error"
                              ? "错误"
                              : "处理中"}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "discriminatedAt",
                    label: "处理时间",
                    tdClassName: "w-32",
                    render: (value: Date | string) => (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(value).toLocaleString()}
                      </span>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ExtractionAndDiscrimination
