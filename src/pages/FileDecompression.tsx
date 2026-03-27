// 1. 外部依赖导入
import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 2. 内部工具与类型导入
import { useTaskStore } from "@/context/TaskContext"
import { useToast } from "@/hooks/use-toast"
import type { FileInfo, Task } from "@/types"

// 3. 图标导入
import {
  Archive,
  Play,
  FileText,
  Clock,
  CheckSquare,
  Square,
  FolderOpen,
  Briefcase,
  RefreshCw,
  Info,
  Scissors,
} from "lucide-react"

import api from "@/api/fileDecompression"

type FilterType = "filename" | "filesize"
type FilenameCondition = "contains" | "not_contains"
type FilesizeCondition = "greater_than" | "less_than"

interface FilterRule {
  id: string
  type: FilterType
  condition: FilenameCondition | FilesizeCondition
  value: string // 对于filename是关键词，对于filesize是数值
}
// 5. 主组件
const FileDecompression: React.FC = () => {
  // 6. 状态管理
  // 6.1 文件相关状态
  const [allFiles, setAllFiles] = useState<FileInfo[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [processedFilesSet, setProcessedFilesSet] = useState<Set<string>>(
    new Set()
  )
  // 6.2 筛选条件状态
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])
  const [newRuleType, setNewRuleType] = useState<FilterType>("filename")
  const [newRuleCondition, setNewRuleCondition] = useState<
    FilenameCondition | FilesizeCondition
  >("contains")
  const [newRuleValue, setNewRuleValue] = useState<string>("")
  const [allowNoFilters, setAllowNoFilters] = useState<boolean>(false)

  // 6.3 任务相关状态
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTaskName, setSelectedTaskName] = useState<string>("")
  const { selectedTaskId, setSelectedTaskId } = useTaskStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [totalFilesToProcess, setTotalFilesToProcess] = useState<number>(0)
  const [processedFilesCount, setProcessedFilesCount] = useState<number>(0)
  const processedTopFilesRef = useRef<Set<string>>(new Set())
  const [isPdfCutting, setIsPdfCutting] = useState(false)
  // // 6.4 处理状态
  // 6.5 日志相关状态
  // const [logs, setLogs] = useState<DecompressionLog[]>(() => {
  //   const savedLogs = sessionStorage.getItem("decompressionLogs")
  //   return savedLogs ? JSON.parse(savedLogs) : []
  // })

  const [extractLogs, setExtractLogs] = useState<string[]>(() => {
    if (!selectedTaskId) return []
    // 按任务ID读取专属日志
    const savedLogs = sessionStorage.getItem(
      `decompressionLogs_${selectedTaskId}`
    )
    return savedLogs ? JSON.parse(savedLogs) : []
  })
  const eventSourceRef = useRef<EventSource | null>(null)
  const logsEndRef = useRef<HTMLDivElement | null>(null)

  // 6.6 工具
  const { toast } = useToast()

  // 7. 辅助函数
  // 7.1 比较两个Set是否相等

  // 7.2 获取文件前缀标识（压缩包/普通文件）
  const getFilePrefix = (fileName: string, fileType: string): string => {
    // 检查是否为文件夹
    if (fileType === "folder") {
      return "📁" // 文件夹符号
    }

    // 检查是否为压缩文件
    const ext = fileName.split(".").pop()?.toLowerCase()
    const isCompressed = ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")
    if (isCompressed) {
      return "📦"
    }
    return "📄"
  }
  // 7.3 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 7.4 获取文件类型图标
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "zip":
      case "rar":
      case "7z":
        return <Archive className="h-4 w-4 text-orange-500" />
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />
      case "doc":
      case "docx":
        return <FileText className="h-4 w-4 text-blue-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }
  // 8. 事件处理函数
  // 8.1 任务相关处理
  const fetchTasks = async () => {
    try {
      const response = await fetch(api.getTasks, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) throw new Error(`HTTP错误! 状态: ${response.status}`)

      const data = await response.json()
      if (data.success || data.tasks) {
        setTasks(data.tasks || [])
      } else {
        toast({
          title: "获取任务列表失败",
          description: data.error || "请检查网络连接",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "获取任务列表失败",
        description: error instanceof Error ? error.message : "网络请求错误",
        variant: "destructive",
      })
    }
  }

  const handleRefreshTasks = () => {
    fetchTasks()
    toast({
      title: "正在刷新任务列表",
      description: "请稍候...",
    })
  }
  const addFilterRule = () => {
    if (!newRuleValue.trim()) {
      toast({
        title: "错误",
        description: "请填写筛选值",
        variant: "destructive",
      })
      return
    }

    const newRule: FilterRule = {
      id: `rule-${Date.now()}`,
      type: newRuleType,
      condition: newRuleCondition,
      value: newRuleValue,
    }

    setFilterRules([...filterRules, newRule])
    setAllowNoFilters(false)
    // 重置表单
    setNewRuleValue("")
    if (newRuleType === "filename") {
      setNewRuleCondition("contains")
    } else {
      setNewRuleCondition("greater_than")
    }
  }
  const sortedFiles = [...allFiles].sort((a, b) => {
    // 判断文件是否为压缩包
    const isCompressed = (file: FileInfo) => {
      const ext = file.name.split(".").pop()?.toLowerCase()
      return ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")
    }

    const aIsCompressed = isCompressed(a)
    const bIsCompressed = isCompressed(b)

    // 压缩包排在前面，非压缩包排在后面
    if (aIsCompressed && !bIsCompressed) return -1
    if (!aIsCompressed && bIsCompressed) return 1
    // 同为压缩包或非压缩包时保持原有顺序
    return 0
  })

  const removeFilterRule = (id: string) => {
    const updatedRules = filterRules.filter((rule) => rule.id !== id)
    setFilterRules(updatedRules)

    // If no rules left, reset allowNoFilters
    if (updatedRules.length === 0) {
      setAllowNoFilters(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFileIds = allFiles.map((file) => file.id)
      setSelectedFiles(new Set(allFileIds))
    } else {
      setSelectedFiles(new Set())
    }
  }
    // 新增：全选/取消全选 未处理的压缩包
  // 新增：全选/取消全选 未处理的压缩包（支持传入 checked 控制）
  const handleSelectCompressed = (checked?: boolean) => {
    const compressedIds = allFiles
      .filter((file) => {
        const ext = file.name.split(".").pop()?.toLowerCase()
        return ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")
      })
      .filter((file) => !file.isProcessed)
      .map((file) => file.id)

    if (compressedIds.length === 0) return

    if (typeof checked === "boolean") {
      const newSet = new Set(selectedFiles)
      if (checked) compressedIds.forEach((id) => newSet.add(id))
      else compressedIds.forEach((id) => newSet.delete(id))
      setSelectedFiles(newSet)
      return
    }

    const allSelected =
      compressedIds.length > 0 && compressedIds.every((id) => selectedFiles.has(id))

    const newSet = new Set(selectedFiles)
    if (allSelected) compressedIds.forEach((id) => newSet.delete(id))
    else compressedIds.forEach((id) => newSet.add(id))
    setSelectedFiles(newSet)
  }

  // 8.3 解压处理
  const startExtraction = async () => {

    console.log("selectedTaskId:", selectedTaskId);
    
    if (!selectedTaskId) {
      toast({
        title: "错误",
        description: "请先选择任务",
        variant: "destructive",
      })
      return
    }

    // 新增验证：检查文件列表是否为空
    if (allFiles.length === 0) {
      toast({
        title: "错误",
        description: "当前任务没有可用文件，请先上传文件",
        variant: "destructive",
      })
      return
    }
    // 更新后的验证代码
    if (filterRules.length === 0 && !allowNoFilters) {
      toast({
        title: "错误",
        description: "请至少设置一条筛选规则或勾选'不添加筛选条件'",
        variant: "destructive",
      })
      return
    }
    const selectedUnprocessedFiles = Array.from(selectedFiles).filter((id) => {
      const file = allFiles.find((f) => f.id === id)
      return file && !file.isProcessed
    })

    if (selectedUnprocessedFiles.length === 0) {
      toast({
        title: "错误",
        description: "没有可处理的文件，请选择未处理的文件",
        variant: "destructive",
      })
      return
    }

    setExtractLogs([])
    setIsProcessing(true)
    setProcessedFilesCount(0)
    processedTopFilesRef.current.clear()

    // 准备请求参数
    // const names = selectedUnprocessedFiles
    //   .map((id) => allFiles.find((f) => f.id === id)?.name)
    //   .filter(Boolean) as string[]
    // const params = new URLSearchParams()
    // params.append("task_id", selectedTaskId)
    // params.append("filenames", names.join(","))
    // if (filterRules.length > 0) {
    //   params.append("filter_rules", JSON.stringify(filterRules))
    // }
    // setTotalFilesToProcess(names.length)

    // // 建立SSE连接
    // const url =
    //   api.decompressionClassify +
    //   `?${params.toString()}` +
    //   `&token=${localStorage.getItem("token")}`
    // if (eventSourceRef.current) eventSourceRef.current.close()

    // const es = new EventSource(url, { withCredentials: true })
    const names = selectedUnprocessedFiles
      .map((id) => allFiles.find((f) => f.id === id)?.name)
      .filter(Boolean) as string[]
    setTotalFilesToProcess(names.length)

    // POST 注册 stream（短 ID），后续用 stream_id 建立 SSE
    const registerUrl = `${api.decompressionClassify}/register`
    let streamId: string | null = null
    try {
      const regResp = await fetch(registerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: selectedTaskId,
          filenames: names,
          filter_rules: filterRules.length ? filterRules : [],
        }),
      })
      const regData = await regResp.json()
      console.log("DEBUG register response:", regResp.status, regData)
      if (!regResp.ok || !regData.success || !regData.stream_id) {
        throw new Error(regData.error || regData.message || "注册 stream_id 失败")
      }
      streamId = regData.stream_id
    } catch (err: any) {
      setIsProcessing(false)
      toast({
        title: "错误",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      })
      return
    }

    // 使用短 stream_id 建立 SSE 连接
    const esUrl = `${api.decompressionClassify}?stream_id=${encodeURIComponent(
       streamId ?? ""
     )}&token=${encodeURIComponent(localStorage.getItem("token") ?? "")}`
    if (eventSourceRef.current) eventSourceRef.current.close()

    const es = new EventSource(esUrl, { withCredentials: true })
    eventSourceRef.current = es
    // 处理SSE消息
    es.onmessage = (e) => {
      const text = e.data?.toString() ?? ""
      setExtractLogs((prev) => {
        const updatedLogs = [...prev, text]
        sessionStorage.setItem(
          `decompressionLogs_${selectedTaskId}`,
          JSON.stringify(updatedLogs)
        )
        return updatedLogs
      })

      // 更新进度计数
      const handleCount = (text.match(/处理文件/g) || []).length
      if (handleCount > 0) {
        setProcessedFilesCount((prev) => prev + handleCount)
      }

      if (text.includes("清理已完成")) {
        // 重新加载文件列表以反映删除操作
        fetchFiles()
      }

      // 处理完成逻辑
      if (text === "END" || text.includes("处理完成")) {
        es.close()
        eventSourceRef.current = null
        // ----------------------12.25新增end--------------------------
        setExtractLogs((prev) => [...prev, "⏳ 正在进行 DOCX->PDF 转换..."])

        api
          .finalizeTask(selectedTaskId)
          .then((response: any) => {
            const data = response.data || response
            const failedFiles = data.failed_files || []

            if (failedFiles && failedFiles.length > 0) {
              setExtractLogs((prev) => [
                ...prev,
                "⚠️ 检测到以下文件转换 PDF 失败 (已跳过):",
                ...failedFiles.map((f: string) => `❌ ${f}`),
              ])
            }

            setExtractLogs((prev) => [
              ...prev,
              "✅ 文档格式转换完成：所有文档已准备就绪",
            ])
            toast({
              title: "完成",
              description: "解压、分类及格式转换全部完成",
              variant: "default",
            })
          })
          .catch((err) => {
            const errMsg = err.response?.data?.message || err.message
            setExtractLogs((prev) => [...prev, `❌ 格式转换失败: ${errMsg}`])
            toast({
              title: "错误",
              description: `转换失败: ${errMsg}`,
              variant: "destructive",
            })
          })
          .finally(() => {
            setIsProcessing(false)
            setTimeout(() => {
              fetchFiles().then(() => {
                const allProcessed =
                  allFiles.length > 0 &&
                  allFiles.every((file) => file.isProcessed)
                if (allProcessed) {
                  setAllowNoFilters(true)
                }
              })
            }, 500) // 延迟执行以确保文件状态已更新
          })
        // ----------------------12.25新增end--------------------------
      }

      // 记录已处理文件
      const processedFileMatch = text.match(/^[\s]*[✅❌]\s*([^\s]+)/)
      if (processedFileMatch) {
        const fileName = processedFileMatch[1]
        const fileId = allFiles.find((file) => file.name === fileName)?.id
        if (fileId) {
          setProcessedFilesSet((prev) => {
            const newSet = new Set(prev)
            newSet.add(fileId)
            return newSet
          })
        }
      }
    }

    // 处理SSE错误
    es.onerror = (err) => {
      console.error("SSE error:", err)
      setExtractLogs((prev) => [...prev, "❌ 连接异常，已中止。"])
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsProcessing(false)
      toast({
        title: "错误",
        description: "处理过程中发生错误",
        variant: "destructive",
      })
    }
  }
  // ----------------------12.25新增start--------------------------
  // 计算解压按钮是否禁用
  // 计算未处理文件的数量

  // 解压按钮状态：只有存在选中的未处理文件时才可点击（除非允许无筛选条件）
  // const isExtractionDisabled = isProcessing ||
  //   unprocessedFilesCount === 0 ||  // 当没有未处理文件时禁用
  //   selectedUnprocessedCount === 0 ||
  const isExtractionDisabled =
    isProcessing || (filterRules.length === 0 && !allowNoFilters)

  const isPdfCutDisabled =
    isPdfCutting ||
    allFiles.length === 0 ||
    (filterRules.length === 0 && !allowNoFilters) // Updated this line
  // ----------------------12.25新增end--------------------------

  const startPdfCut = async () => {
    if (!selectedTaskId) {
      toast({
        title: "错误",
        description: "请先选择任务",
        variant: "destructive",
      })
      return
    }

    if (selectedFiles.size === 0) {
      toast({
        title: "错误",
        description: "请先选择要剪切的文件",
        variant: "destructive",
      })
      return
    }

    setIsPdfCutting(true)

    setExtractLogs((prev) => [...prev, "⏳ 正在进行PDF剪切..."])
    try {
      // 获取用户选择的文件名称
      const selectedFileNames = Array.from(selectedFiles)
        .map((id) => allFiles.find((file) => file.id === id)?.name)
        .filter((name) => name) as string[]

      // 调用PDF剪切接口
      const response = await fetch(
        `${api.decompressionClassify.replace(
          "/extract-and-classify-stream",
          ""
        )}/pdf-cut/${selectedTaskId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            extraction_rules: [], // 可以从任务配置中获取规则，或使用默认规则
            selected_files: selectedFileNames,
          }),
        }
      )

      const data = await response.json()

      if (data.success) {
        setExtractLogs((prev) => [...prev, "✅ 所有文件剪切完成"])
        toast({
          title: "PDF剪切完成",
          description: data.message || "PDF剪切任务已完成",
          variant: "default",
        })
      } else {
        setExtractLogs((prev) => [
          ...prev,
          `❌ PDF剪切失败: ${data.error || data.message}`,
        ])
        toast({
          title: "PDF剪切失败",
          description: data.error || data.message || "PDF剪切过程中发生错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "PDF剪切失败",
        description: error instanceof Error ? error.message : "网络请求错误",
        variant: "destructive",
      })
    } finally {
      setIsPdfCutting(false)
    }
  }
  // ----------------------12.25新增end--------------------------
  // 9. 副作用钩子
  // 9.1 日志初始化与自动滚动
  useEffect(() => {
    const savedLogs = sessionStorage.getItem("decompressionLogs")
    if (savedLogs) setExtractLogs(JSON.parse(savedLogs))
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [extractLogs])

  // 9.2 清理SSE连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])
  useEffect(() => {
    if (!selectedTaskId) {
      setExtractLogs([])
      return
    }
    // 切换任务时，加载该任务的专属日志
    const taskSpecificLogs = sessionStorage.getItem(
      `decompressionLogs_${selectedTaskId}`
    )
    setExtractLogs(taskSpecificLogs ? JSON.parse(taskSpecificLogs) : [])
    fetchFiles()
    // 同时重置处理状态
    setIsProcessing(false)
    setProcessedFilesCount(0)
    setTotalFilesToProcess(0)
    processedTopFilesRef.current.clear()
    setProcessedFilesSet(new Set())
  }, [selectedTaskId]) // 依赖：选中的任务ID
  // 9.3 加载任务文件列表
  useEffect(() => {
    fetchFiles() // Fetch files whenever the selected task changes
  }, [selectedTaskId, toast])

  // 在 fetchFiles 函数中，增强文件处理状态的判断
  const fetchFiles = async () => {
    if (!selectedTaskId) {
      setAllFiles([])
      return
    }

    try {
      const response = await fetch(api.getFiles(selectedTaskId), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) throw new Error(`HTTP 错误! 状态: ${response.status}`)

      const data = await response.json()
      const downloads = data.data?.downloads || data.downloads || []
      const uploads = data.data?.uploads || data.uploads || []
      const allTaskFiles = [...downloads, ...uploads]

      // 使用后端返回的已处理文件列表
      const processedFiles = data.processed_files || []

      const filesWithMetadata = allTaskFiles.map((file, index) => {
        const folderName = file.name.split("/")[0] // 提取子文件夹名称
        return {
          id: `${file.name}-${index}`,
          name: file.name || "",
          size: file.size || 0,
          uploadTime: file.uploadTime || new Date().toISOString(),
          type: file.type || "file",
          status: file.status || "pending",
          taskId: selectedTaskId,
          isProcessed: processedFiles.includes(
            file.name.replace(/\.[^/.]+$/, "")
          ),
          folderName: folderName, // 新增字段：子文件夹名称
        }
      })

      setAllFiles(filesWithMetadata)
    } catch (error) {
      toast({
        title: "错误",
        description: `获取文件列表失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        variant: "destructive",
      })
    }
  }
  // 9.4 初始化任务列表
  useEffect(() => {
    fetchTasks()
  }, [])

  // 9.5 监听URL参数中的任务ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const taskIdFromUrl = urlParams.get("task")
    if (taskIdFromUrl) {
      setSelectedTaskId(taskIdFromUrl)
      const task = tasks.find((t) => t.id === taskIdFromUrl)
      if (task) setSelectedTaskName(task.name)
    }
  }, [tasks])

  // 9.6 监听任务创建事件
  useEffect(() => {
    const handleTaskCreated = (event: CustomEvent) => {
      fetchTasks()
      if (event.detail?.taskId) {
        toast({ title: "新任务已创建", description: "正在刷新任务列表..." })
        setTimeout(() => {
          const newTask = tasks.find((t) => t.id === event.detail.taskId)
          if (newTask) {
            setSelectedTaskId(newTask.id)
            setSelectedTaskName(newTask.name)
            toast({
              title: "已切换到新任务",
              description: `现在可以处理任务"${newTask.name}"的文件`,
            })
          }
        }, 1000)
      }
    }

    const eventHandler = (e: Event) => handleTaskCreated(e as CustomEvent)
    window.addEventListener("task-created", eventHandler)
    return () => window.removeEventListener("task-created", eventHandler)
  }, [tasks])

  // 10. UI渲染相关计算
  const compressedFiles = allFiles.filter((file) => {
    const ext = file.name.split(".").pop()?.toLowerCase()
    return ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")
  })
  const unprocessedCompressed = compressedFiles.filter((f) => !f.isProcessed)
  const isCompressedSelected =
  unprocessedCompressed.length > 0 &&
  unprocessedCompressed.every((f) => selectedFiles.has(f.id))

  const unprocessedFiles = allFiles.filter((file) => !file.isProcessed)
  const isAllSelected =
    unprocessedFiles.length > 0 &&
    selectedFiles.size === unprocessedFiles.length
  const isPartialSelected =
    selectedFiles.size > 0 && selectedFiles.size < unprocessedFiles.length

  const stats = {
    total: allFiles.length,
    selected: selectedFiles.size,
    compressed: compressedFiles.length,
  }

  // 11. 组件渲染
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            文件解压缩与筛选处理
          </h1>
          <p className="text-lg text-gray-600">
            自动选择所有文件，支持批量解压缩与筛选处理
          </p>
        </div>

        {/* 任务选择卡片 */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5" />
                <span>当前处理任务</span>
                {selectedTaskId && (
                  <Badge variant="secondary">{selectedTaskName}</Badge>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshTasks}
                disabled={isProcessing}>
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新任务
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select
                value={selectedTaskId ?? ""}
                onValueChange={(value) => {
                  const v = String(value)
                  setSelectedTaskId(v)
                  const task = tasks.find((t) => t.id === v)
                  setSelectedTaskName(task?.name || "")
                  setSelectedFiles(new Set())
                }}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择任务" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{task.name}</span>
                          <span className="text-xs text-gray-500">
                            ID: {task.id?.substring(0, 8) || "未知"} | 创建:{" "}
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-tasks" disabled>
                      <div className="text-gray-400">
                        暂无任务，请先在任务管理中心创建
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {selectedTaskId ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    所有解压缩的文件将保存到任务【{selectedTaskName}】目录下
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-blue-600">
                    <Info className="h-3 w-3" />
                    <span>已选择任务，系统将自动加载该任务下的文件</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600">
                    请先选择任务以查看和操作文件
                  </p>
                  {tasks.length === 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        ⚠️ 当前没有可用的任务
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        请在
                        <Button
                          variant="link"
                          className="h-auto p-0 mx-1"
                          onClick={() => (window.location.href = "/")}>
                          任务管理中心
                        </Button>
                        创建新任务
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 统计信息 */}
        {selectedTaskId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="bg-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总文件数</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  已上传的所有文件
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已选择</CardTitle>
                <CheckSquare className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.selected}
                </div>
                <p className="text-xs text-muted-foreground">待处理文件数量</p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已处理</CardTitle>
                <Archive className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 flex items-baseline">
                  <span aria-live="polite">{processedFilesCount}</span>
                  {totalFilesToProcess > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      / {totalFilesToProcess}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  已完成解压并分类的文件数
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg md:col-span-3">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">处理进度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-600 flex items-center justify-between mb-2">
                  <div className="font-medium">已处理文件</div>
                  <div aria-live="polite" className="font-mono">
                    {totalFilesToProcess > 0
                      ? `${processedFilesCount}/${totalFilesToProcess}`
                      : isProcessing
                      ? `${processedFilesCount} 已处理`
                      : "0"}
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                  {totalFilesToProcess > 0 ? (
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (processedFilesCount / totalFilesToProcess) * 100
                          )
                        )}%`,
                      }}
                    />
                  ) : (
                    <div
                      className="h-full bg-blue-400 animate-pulse"
                      style={{
                        width: `${Math.min(90, 10 + processedFilesCount * 6)}%`,
                      }}
                    />
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  进度按顶层文件完成计数。日志与进度同时更新。
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 主内容区（文件列表 + 处理日志） */}

        {selectedTaskId ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 文件列表和选择 */}
            <Card className="bg-white shadow-lg flex-1">
              <CardContent className="space-y-4 h-full">
                {/* 筛选规则配置 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">筛选规则</h3>

                  {/* 添加新规则的表单 */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-end gap-2 mb-2">
                      <div className="flex-1 grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <label className="text-xs font-medium block mb-1">
                            筛选对象
                          </label>
                          <select
                            value={newRuleType}
                            onChange={(e) => {
                              const type = e.target.value as FilterType
                              setNewRuleType(type)
                              // 重置条件
                              if (type === "filename") {
                                setNewRuleCondition("contains")
                              } else {
                                setNewRuleCondition("greater_than")
                              }
                            }}
                            className="w-full p-2 border rounded text-sm">
                            <option value="filename">文件名</option>
                            <option value="filesize">文件大小</option>
                          </select>
                        </div>
                        <div className="col-span-4">
                          <label className="text-xs font-medium block mb-1">
                            筛选方式
                          </label>
                          <select
                            value={newRuleCondition}
                            onChange={(e) =>
                              setNewRuleCondition(e.target.value as any)
                            }
                            className="w-full p-2 border rounded text-sm">
                            {newRuleType === "filename" ? (
                              <>
                                <option value="contains">包含关键词</option>
                                <option value="not_contains">
                                  不包含关键词
                                </option>
                              </>
                            ) : (
                              <>
                                <option value="greater_than">大于</option>
                                <option value="less_than">小于</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <label className="text-xs font-medium block mb-1">
                            {newRuleType === "filename" ? "关键词" : "数值(KB)"}
                          </label>
                          <input
                            type="text"
                            value={newRuleValue}
                            onChange={(e) => setNewRuleValue(e.target.value)}
                            placeholder={
                              newRuleType === "filename" ? "关键词" : "KB"
                            }
                            className="w-full p-2 border rounded text-sm"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={addFilterRule}
                        size="sm" // 添加这个属性使按钮变小
                        className="h-9">
                        添加规则
                      </Button>
                    </div>
                  </div>

                  {/* 显示现有规则 */}
                  <div className="space-y-2">
                    <h4 className="font-medium">当前规则 (AND关系)</h4>
                    {filterRules.length === 0 ? (
                      <p className="text-sm text-gray-500">暂无筛选规则</p>
                    ) : (
                      <div className="space-y-2">
                        {filterRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {rule.type === "filename"
                                  ? "文件名"
                                  : "文件大小"}
                              </span>

                              <span className="text-sm">
                                {rule.type === "filename"
                                  ? rule.condition === "contains"
                                    ? "包含"
                                    : "不包含"
                                  : rule.condition === "greater_than"
                                  ? "大于"
                                  : "小于"}
                              </span>

                              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                {rule.value}
                                {rule.type === "filesize" && " KB"}
                              </span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFilterRule(rule.id)}
                              className="h-8 w-8 p-0">
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 添加"不添加筛选条件"复选框 */}
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                    <Checkbox
                      id="allow-no-filters"
                      checked={allowNoFilters}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // If checked, clear all rules
                          setFilterRules([])
                        }
                        setAllowNoFilters(checked as boolean)
                      }}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <label
                      htmlFor="allow-no-filters"
                      className="text-sm font-medium cursor-pointer flex items-center space-x-2">
                      <span>不添加筛选条件</span>
                    </label>
                  </div>
                </div>
                <Separator />

                {/* 文件列表 */}
                {allFiles.length > 0 ? (
                  <>
                    <ScrollArea className="h-96">
                      <div className="space-y-2 min-w-max overflow-x-auto">
                        {/* 全选所有文件控制 */}
                        <div className="flex items-center space-x-3 py-2 px-3 bg-gray-50 rounded-lg border sticky top-0 z-10 mb-3">
                        {/* 全选压缩包 放在最左侧 */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="select-compressed"
                            checked={isCompressedSelected}
                            onCheckedChange={(checked) =>
                              handleSelectCompressed(checked as boolean)
                            }
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <label
                            htmlFor="select-compressed"
                            className="text-sm cursor-pointer select-none text-gray-700">
                            全选压缩包
                          </label>
                        </div>

                        {/* 把 全选所有文件 的勾选框放到文字前面，而不是最左边 */}
                        <div className="flex-1 flex items-center">
                          <label
                            htmlFor="select-all"
                            className="flex items-center space-x-2 cursor-pointer text-sm font-medium w-full">
                            <Checkbox
                              id="select-all"
                              checked={isAllSelected}
                              onCheckedChange={(checked) =>
                                handleSelectAll(checked as boolean)
                              }
                              className="data-[state=checked]:bg-blue-600"
                            />
                            <span className="text-gray-800">
                              全选所有文件
                              {isPartialSelected && !isAllSelected
                                ? ` (${selectedFiles.size}/${unprocessedFiles.length})`
                                : isAllSelected
                                ? ` (${unprocessedFiles.length})`
                                : allFiles.length > 0 &&
                                  allFiles.every((file) => file.isProcessed)
                                ? ` (所有文件已完成第一步处理，可进行裁切)`
                                : ""}
                            </span>
                          </label>
                        </div>
                      </div>




                        {/* 文件列表 */}
                        {sortedFiles.map((file) => {
                          const isProcessed = file.isProcessed
                          const canSelect = !isProcessed
                          const isSelected =
                            selectedFiles.has(file.id) && !isProcessed // 确保已处理文件不会显示为选中状态
                          return (
                            <div
                              key={file.id}
                              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                isProcessed
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              } ${
                                isSelected
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              title={
                                isProcessed
                                  ? "该文件已筛选，可进行裁剪"
                                  : undefined
                              }>
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <Checkbox
                                  id={`file-${file.id}`}
                                  checked={
                                    selectedFiles.has(file.id) && !isProcessed
                                  } // 只有未处理的文件才能显示为选中状态
                                  onCheckedChange={(checked) => {
                                    if (canSelect) {
                                      // 只有可选择的文件才能被勾选
                                      const newSelectedFiles = new Set(
                                        selectedFiles
                                      )
                                      if (checked) {
                                        newSelectedFiles.add(file.id)
                                      } else {
                                        newSelectedFiles.delete(file.id)
                                      }
                                      setSelectedFiles(newSelectedFiles)
                                    } else {
                                      toast({
                                        title: "提示",
                                        description: "该文件已筛选，可进行裁剪",
                                        variant: "default",
                                      })
                                    }
                                  }}
                                  disabled={!canSelect}
                                  className={`data-[state=checked]:bg-blue-600 ${
                                    isProcessed
                                      ? "pointer-events-none opacity-50"
                                      : ""
                                  }`}
                                />
                                {getFileIcon(file.name)}
                                <div className="flex-1 min-w-0">
                                  {/* 文件名和类型前缀 */}
                                  <p className="font-medium text-sm truncate">
                                    <span className="font-medium text-sm truncate block">
                                      {getFilePrefix(file.name, file.type)}{" "}
                                      {file.name}
                                    </span>
                                  </p>
                                  {/* 文件大小和上传时间 */}
                                  <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                    <span>{formatFileSize(file.size)}</span>
                                    <span>•</span>
                                    <span className="truncate max-w-[150px]">
                                      {new Date(
                                        file.uploadTime
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      暂无文件
                    </p>
                    <p className="text-sm text-gray-500">
                      请先在文件上传页面上传文件，或检查任务选择是否正确
                    </p>
                  </div>
                )}

                <Separator />

                {/* 按钮区域 - 始终显示，无论文件列表是否为空 */}
                <div className="space-y-3">
                  <Button
                    onClick={startExtraction}
                    disabled={isExtractionDisabled}
                    className="w-full"
                    size="lg">
                    {isProcessing ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        解压并筛选中...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        开始解压并筛选 ({selectedFiles.size})
                      </>
                    )}
                  </Button>

                  {/* PDF剪切按钮 - 始终显示，但根据条件控制是否可点击 */}
                  {selectedTaskId && (
                    <Button
                      onClick={startPdfCut}
                      disabled={isPdfCutDisabled}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg">
                      {isPdfCutting ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          PDF剪切中...
                        </>
                      ) : (
                        <>
                          <Scissors className="mr-2 h-4 w-4" />
                          PDF剪切 ({selectedTaskId})
                        </>
                      )}
                    </Button>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    解压后按规则分类到 tasks/{selectedTaskId}
                    /extracted/right 或 extracted/error
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 处理日志展示 */}
            <Card className="bg-white shadow-lg flex flex-col flex-1 h-[700px]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>处理日志</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="h-[calc(100%-4rem)]">
                <ScrollArea className="h-full font-mono text-sm">
                  <div className="space-y-1 overflow-x-auto whitespace-pre">
                    {extractLogs.length === 0 ? (
                      <div className="text-gray-500 text-center py-20">
                        等待开始处理...
                      </div>
                    ) : (
                      extractLogs.map((ln, i) => {
                        // 匹配日志中"符合条件 X 个"格式的数字（兼容各种空格情况）
                        const processedLine = ln.replace(
                          /(符合条件\s+)(\d+)(\s+个)/g,
                          (_, prefix, countStr, suffix) => {
                            const count = Number(countStr)
                            // 数字≥2时添加红色样式，否则保持原样式
                            return count >= 2
                              ? `${prefix}<span class="text-red-600 font-semibold">${countStr}</span>${suffix}`
                              : `${prefix}${countStr}${suffix}`
                          }
                        )

                        return (
                          <div
                            key={i}
                            className={`whitespace-pre-wrap break-words max-w-full ${
                              ln.includes("✅")
                                ? "text-green-700"
                                : ln.includes("❌")
                                ? "text-red-700"
                                : ln.includes("📝")
                                ? "text-blue-700"
                                : ln.includes("📦")
                                ? "text-orange-700"
                                : ln.includes("📊")
                                ? "text-purple-700"
                                : "text-gray-700"
                            }`}
                            // 使用dangerouslySetInnerHTML解析带样式的文本
                            dangerouslySetInnerHTML={{ __html: processedLine }}
                          />
                        )
                      })
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white shadow-lg">
            <CardContent className="text-center py-12">
              <Briefcase className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                请先选择任务
              </p>
              <p className="text-sm text-gray-500">
                选择任务后，系统将显示该任务下的所有文件，并进行解压缩操作
              </p>
              <p className="text-xs text-gray-400 mt-4">
                如果没有可用任务，请在任务管理中心创建新任务
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default FileDecompression
