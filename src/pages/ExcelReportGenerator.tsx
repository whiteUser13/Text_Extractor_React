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
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import {
  FileSpreadsheet,
  Play,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileDown,
  Clock,
} from "lucide-react"

// 导入 TaskContext
import { useTaskStore } from "@/context/TaskContext"
import type {
  Task,
  ExtractionRule as IExtractionRule,
  JudgmentRule,
} from "@/types"

import api from "../api/excelReportGenerator"
import apiClient from "../api/index"

interface ExtractionRuleSet {
  id: string
  name: string
  extractionHeaders: string[] // 提取规则字段
  judgmentHeaders: string[] // 判别规则字段
  commonHeaders: string[] // 共用字段
  allHeaders: string[] // 所有字段（用于显示）
}

interface ResultFolder {
  area_code: string
  folder_name: string
  status: string
  update_time?: string
  task_id?: string
  result_type?: string
}

interface GenerationLog {
  id: string
  timestamp: Date
  type: "info" | "success" | "error" | "warning" | "download"
  message: string
  folderName?: string
  downloadUrl?: string
  taskId?: string
}

// 从任务生成表头规则
const generateHeadersFromTask = (
  task: Task | null
): {
  extractionHeaders: string[]
  judgmentHeaders: string[]
  commonHeaders: string[]
  allHeaders: string[]
} => {
  if (!task) {
    return {
      extractionHeaders: [],
      judgmentHeaders: [],
      commonHeaders: [],
      allHeaders: [],
    }
  }

  const pureExtractionHeaders: string[] = []
  const pureJudgmentHeaders: string[] = []

  // 从提取规则生成表头
  if (task.extractionRules && Array.isArray(task.extractionRules)) {
    task.extractionRules.forEach((rule: IExtractionRule) => {
      if (rule.name && !pureExtractionHeaders.includes(rule.name)) {
        pureExtractionHeaders.push(rule.name)
      }
    })
  }

  // 从判别规则生成表头
  if (task.judgmentRules && Array.isArray(task.judgmentRules)) {
    task.judgmentRules.forEach((rule: JudgmentRule) => {
      if (rule.name && !pureJudgmentHeaders.includes(rule.name)) {
        pureJudgmentHeaders.push(rule.name)
      }
      if (rule.conditions && Array.isArray(rule.conditions)) {
        rule.conditions.forEach((condition: any) => {
          if (
            condition.field &&
            !pureJudgmentHeaders.includes(condition.field)
          ) {
            pureJudgmentHeaders.push(condition.field)
          }
        })
      }
      if (rule.actions && Array.isArray(rule.actions)) {
        rule.actions.forEach((action: any) => {
          const actionHeader = `${action.type || "操作"}结果`
          if (!pureJudgmentHeaders.includes(actionHeader)) {
            pureJudgmentHeaders.push(actionHeader)
          }
        })
      }
    })
  }

  // 计算共用字段
  const commonHeaders = pureExtractionHeaders.filter((header) =>
    pureJudgmentHeaders.includes(header)
  )

  // 计算纯提取字段
  const finalPureExtractionHeaders = pureExtractionHeaders.filter(
    (header) => !commonHeaders.includes(header)
  )

  // 计算纯判别字段
  const finalPureJudgmentHeaders = pureJudgmentHeaders.filter(
    (header) => !commonHeaders.includes(header)
  )

  // 基础字段
  const baseHeaders = ["地块编号", "报告名称"]

  // 所有字段
  const allHeaders = [
    ...baseHeaders,
    ...finalPureExtractionHeaders,
    ...finalPureJudgmentHeaders,
    ...commonHeaders,
  ]

  return {
    extractionHeaders: [
      ...baseHeaders,
      ...finalPureExtractionHeaders,
      ...commonHeaders,
    ],
    judgmentHeaders: [
      ...baseHeaders,
      ...finalPureJudgmentHeaders,
      ...commonHeaders,
    ],
    commonHeaders,
    allHeaders: [...new Set(allHeaders)],
  }
}

// 获取任务相关的结果文件夹
const fetchResultFolders = async (taskId?: string): Promise<ResultFolder[]> => {
  try {
    if (!taskId) {
      console.error("未提供任务ID")
      return []
    }

    const url = `/api/result/task/${taskId}/result_folders`
    const response = await apiClient.get(url)
    const folders = response.data.folders || []
    return folders
  } catch (error) {
    console.error("获取任务结果文件夹失败:", error)
    return []
  }
}

// 保存日志到本地存储
const saveLogsToStorage = (logs: GenerationLog[]) => {
  try {
    const logsToSave = logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    }))
    localStorage.setItem(
      "excel_report_generation_logs",
      JSON.stringify(logsToSave)
    )
  } catch (error) {
    console.error("保存日志到本地存储失败:", error)
  }
}

// 从本地存储加载日志
const loadLogsFromStorage = (): GenerationLog[] => {
  try {
    const savedLogs = localStorage.getItem("excel_report_generation_logs")
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs)
      return parsedLogs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }))
    }
    return []
  } catch (error) {
    console.error("从本地存储加载日志失败:", error)
    return []
  }
}

// 下载Excel文件
const downloadExcelFile = async (downloadUrl: string, filename: string) => {
  try {
    const response = await apiClient.get(downloadUrl, {
      responseType: "blob",
    })

    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    return true
  } catch (error) {
    console.error("下载Excel文件失败:", error)
    throw error
  }
}

const ExcelReportGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationLogs, setGenerationLogs] = useState<GenerationLog[]>(
    loadLogsFromStorage()
  )
  const [resultFolders, setResultFolders] = useState<ResultFolder[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const { toast } = useToast()

  // 使用 TaskContext 获取选中的任务
  const { selectedTaskId, selectedTask } = useTaskStore()

  // 从选中的任务生成表头规则
  const extractionRuleSet = selectedTask
    ? {
        id: selectedTask.id,
        name: selectedTask.name,
        ...generateHeadersFromTask(selectedTask),
      }
    : null

  // 更新日志并保存到本地存储
  const updateGenerationLogs = (
    newLogs: GenerationLog[] | ((prev: GenerationLog[]) => GenerationLog[])
  ) => {
    setGenerationLogs((prev) => {
      const updatedLogs =
        typeof newLogs === "function" ? newLogs(prev) : newLogs
      saveLogsToStorage(updatedLogs)
      return updatedLogs
    })
  }

  // 添加日志
  const addLog = (
    type: GenerationLog["type"],
    message: string,
    folderName?: string,
    downloadUrl?: string
  ) => {
    const newLog: GenerationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      folderName,
      downloadUrl,
      taskId: selectedTaskId || undefined,
    }
    updateGenerationLogs((prev) => [newLog, ...prev])
  }

  // 清空日志
  const clearLogs = () => {
    updateGenerationLogs([])
    toast({
      title: "日志已清空",
      description: "生成日志已被清空",
    })
  }

  // 加载任务相关的结果文件夹
  const loadResultFolders = async () => {
    setIsLoadingFolders(true)
    try {
      const folders = await fetchResultFolders(selectedTaskId || undefined)
      setResultFolders(folders)

      if (folders.length === 0) {
        addLog(
          "warning",
          `任务 ${selectedTaskId} 没有找到结果数据，请先完成内容提取和判别`
        )
      }
    } catch (error) {
      console.error("加载结果文件夹失败:", error)
      toast({
        title: "加载失败",
        description: "无法获取结果文件夹列表",
        variant: "destructive",
      })
    } finally {
      setIsLoadingFolders(false)
    }
  }

  // 刷新数据
  const handleRefresh = async () => {
    await loadResultFolders()
    toast({
      title: "刷新成功",
      description: "结果数据已更新",
    })
  }

  // 批量生成Excel报告 - 每个任务只生成一个文件
  const generateExcelReport = async () => {
    if (!selectedTaskId || !selectedTask) {
      toast({
        title: "请选择任务",
        description: "请先在文件上传界面选择处理任务",
        variant: "destructive",
      })
      return
    }

    if (!extractionRuleSet) {
      toast({
        title: "任务规则无效",
        description: "选中的任务没有有效的规则配置",
        variant: "destructive",
      })
      return
    }

    if (resultFolders.length === 0) {
      toast({
        title: "无结果数据",
        description: "没有找到可用的结果数据",
        variant: "destructive",
      })
      return
    }

    const selectedHeaders = extractionRuleSet.allHeaders

    if (selectedHeaders.length === 0) {
      toast({
        title: "规则不存在",
        description: "选中的任务没有可用字段，请重新选择任务",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    // 添加开始日志
    addLog("info", "开始生成Excel报告")
    addLog("info", `任务ID: ${selectedTaskId}`)
    addLog("info", `任务名称: ${selectedTask.name}`)
    addLog("info", `发现报告数量: ${resultFolders.length}`)
    addLog("info", `将生成一个包含所有报告的Excel文件`)

    try {
      // 构建请求体 - 每个任务只调用一次接口
      const requestBody = {
        task_name: selectedTask.name, // 1229新增：任务名称
        report_name: `${extractionRuleSet.name || "任务"}_报告`,
        headers: selectedHeaders,
        extraction_headers: extractionRuleSet.extractionHeaders,
        judgment_headers: extractionRuleSet.judgmentHeaders,
      }

      console.log("生成Excel报告请求:", requestBody)

      // 调用批量生成接口 - 每个任务只调用一次
      const response = await apiClient.post(
        `/api/result/task/${selectedTaskId}/generate_batch_excel`,
        requestBody
      )
      console.log("生成响应:", response.data)

      if (response.data.excel_filename && response.data.download_url) {
        addLog("success", "Excel报告生成成功")

        // 下载Excel文件
        try {
          const filename = response.data.excel_filename
          await downloadExcelFile(response.data.download_url, filename)
          addLog(
            "download",
            `文件下载成功: ${filename}`,
            undefined,
            response.data.download_url
          )

          toast({
            title: "生成完成",
            description: `Excel报告已生成并开始下载: ${filename}`,
          })
        } catch (downloadError: any) {
          console.error("下载失败:", downloadError)
          addLog("error", "文件下载失败，请手动下载")

          // 提供手动下载链接
          toast({
            title: "生成成功，下载失败",
            description: (
              <div>
                报告已生成，但自动下载失败。
                <a
                  href={response.data.download_url}
                  download={response.data.excel_filename}
                  className="ml-1 text-blue-600 hover:underline">
                  点击这里手动下载
                </a>
              </div>
            ),
            variant: "default",
          })
        }
      } else {
        const errorMsg = response.data.error || "生成失败，未知错误"
        addLog("error", `生成失败: ${errorMsg}`)
        toast({
          title: "生成失败",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("生成失败:", error)
      const errorMessage =
        error.response?.data?.error || error.message || "未知错误"
      addLog("error", `生成错误: ${errorMessage}`)
      toast({
        title: "生成失败",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // 手动下载文件
  const handleManualDownload = async (
    downloadUrl: string,
    filename: string
  ) => {
    try {
      addLog("info", `开始下载文件: ${filename}`)
      await downloadExcelFile(downloadUrl, filename)
      addLog("download", `文件下载成功: ${filename}`, undefined, downloadUrl)
      toast({
        title: "下载成功",
        description: `文件 ${filename} 已开始下载`,
      })
    } catch (error) {
      addLog("error", `文件下载失败: ${filename}`)
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (selectedTaskId) {
      loadResultFolders()
    } else {
      setResultFolders([])
    }
  }, [selectedTaskId])

  // 计算统计信息
  const getFieldStats = () => {
    if (!extractionRuleSet)
      return {
        extractionCount: 0,
        judgmentCount: 0,
        commonCount: 0,
        allCount: 0,
      }

    const baseHeaders = ["地块编号", "报告名称"]
    const pureExtractionCount = extractionRuleSet.extractionHeaders.filter(
      (h: string) => !baseHeaders.includes(h)
    ).length
    const pureJudgmentCount = extractionRuleSet.judgmentHeaders.filter(
      (h: string) => !baseHeaders.includes(h)
    ).length

    return {
      extractionCount: pureExtractionCount,
      judgmentCount: pureJudgmentCount,
      commonCount: extractionRuleSet.commonHeaders.length,
      allCount: extractionRuleSet.allHeaders.length,
    }
  }

  const fieldStats = getFieldStats()

  // 获取日志图标
  const getLogIcon = (type: GenerationLog["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-600" />
      case "warning":
        return <AlertCircle className="h-3 w-3 text-yellow-600" />
      case "download":
        return <FileDown className="h-3 w-3 text-blue-600" />
      default:
        return <Clock className="h-3 w-3 text-gray-600" />
    }
  }

  // 获取日志样式
  const getLogStyle = (type: GenerationLog["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 text-green-700 border border-green-200"
      case "error":
        return "bg-red-50 text-red-700 border border-red-200"
      case "warning":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200"
      case "download":
        return "bg-blue-50 text-blue-700 border border-blue-200"
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200"
    }
  }

  // 获取结果类型徽章
  const getResultTypeBadge = (resultType?: string) => {
    if (!resultType) return null

    switch (resultType) {
      case "extraction":
        return (
          <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">
            提取
          </Badge>
        )
      case "discrimination":
        return (
          <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
            判别
          </Badge>
        )
      case "both":
        return (
          <Badge
            variant="outline"
            className="ml-2 bg-purple-100 text-purple-800">
            完整
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Excel报告生成
          </h1>
          <p className="text-lg text-gray-600">
            每个任务生成一个Excel文件，包含所有报告的数据
          </p>
        </div>

        {/* 当前任务信息 */}
        {selectedTaskId && selectedTask && (
          <Card className="border py-4 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                当前任务：{selectedTask.name}
                <Badge variant="secondary">{selectedTaskId}</Badge>
              </CardTitle>
              <CardDescription>
                将生成一个包含 {resultFolders.length} 个报告的Excel文件
                {selectedTask.description && (
                  <p className="mt-1">{selectedTask.description}</p>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!selectedTaskId && (
          <Card className="border py-4 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                未选择任务
              </CardTitle>
              <CardDescription>
                请先在文件上传界面选择处理任务，然后才能生成Excel报告
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧配置面板 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 刷新按钮 */}
            <Card className="bg-white shadow-lg">
              <CardContent className="pt-6">
                <Button
                  onClick={handleRefresh}
                  disabled={isLoadingFolders}
                  variant="outline"
                  className="w-full">
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isLoadingFolders ? "animate-spin" : ""
                    }`}
                  />
                  刷新数据
                </Button>
              </CardContent>
            </Card>

            {/* 任务规则配置 */}
            {extractionRuleSet && (
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    任务规则配置
                  </CardTitle>
                  <CardDescription>将根据任务规则生成Excel表头</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">任务名称</span>
                      <Badge variant="outline">{extractionRuleSet.name}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">报告数量</span>
                      <Badge variant="outline">{resultFolders.length}</Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Excel表头字段</span>
                      <Badge variant="outline">
                        {extractionRuleSet.allHeaders.length} 个字段
                      </Badge>
                    </div>

                    {/* 字段统计 */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>提取字段: {fieldStats.extractionCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>判别字段: {fieldStats.judgmentCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>共用字段: {fieldStats.commonCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span>全部字段: {fieldStats.allCount}</span>
                      </div>
                    </div>

                    <ScrollArea className="h-48 border rounded-md p-2">
                      <div className="space-y-1">
                        {extractionRuleSet.allHeaders.map((header, index) => {
                          const isBaseField = ["地块编号", "报告名称"].includes(
                            header
                          )
                          const isExtractionField =
                            extractionRuleSet.extractionHeaders.includes(header)
                          const isJudgmentField =
                            extractionRuleSet.judgmentHeaders.includes(header)
                          const isCommonField =
                            extractionRuleSet.commonHeaders.includes(header)

                          let fieldType = ""
                          let color = ""

                          if (isBaseField) {
                            fieldType = "基础"
                            color = "bg-gray-500"
                          } else if (isCommonField) {
                            fieldType = "共用"
                            color = "bg-purple-500"
                          } else if (isExtractionField) {
                            fieldType = "提取"
                            color = "bg-blue-500"
                          } else if (isJudgmentField) {
                            fieldType = "判别"
                            color = "bg-green-500"
                          }

                          return (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-1 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {index + 1}
                              </Badge>
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`}></div>
                              <span className="flex-1">{header}</span>
                              <Badge variant="outline" className="text-xs">
                                {fieldType}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 发现的报告列表 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  发现的报告
                  <Badge variant="outline">{resultFolders.length}</Badge>
                </CardTitle>
                <CardDescription>
                  将在Excel中生成 {resultFolders.length} 行数据
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingFolders ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    加载中...
                  </div>
                ) : resultFolders.length > 0 ? (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {resultFolders.map((folder, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">
                              {folder.folder_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              地块编码: {folder.area_code}
                              {getResultTypeBadge(folder.result_type)}
                            </div>
                          </div>
                          <Badge
                            variant={
                              folder.status === "complete" ||
                              folder.status === "both"
                                ? "default"
                                : folder.status === "extracted"
                                ? "secondary"
                                : folder.status === "validated"
                                ? "destructive"
                                : "outline"
                            }>
                            {folder.status === "complete" ||
                            folder.status === "both"
                              ? "完整"
                              : folder.status === "extracted"
                              ? "已提取"
                              : folder.status === "validated"
                              ? "已判别"
                              : folder.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {selectedTaskId ? "没有找到报告" : "请先选择任务"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 生成按钮 */}
            <Card className="bg-white shadow-lg">
              <CardContent className="pt-6">
                <Button
                  onClick={generateExcelReport}
                  disabled={
                    isGenerating ||
                    !selectedTaskId ||
                    !extractionRuleSet ||
                    resultFolders.length === 0
                  }
                  className="w-full"
                  size="lg">
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      生成Excel报告
                    </>
                  )}
                </Button>

                {!selectedTaskId && (
                  <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      请先在文件上传界面选择处理任务
                    </AlertDescription>
                  </Alert>
                )}

                {selectedTaskId && !extractionRuleSet && (
                  <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      当前任务没有可用的规则配置
                    </AlertDescription>
                  </Alert>
                )}

                {resultFolders.length === 0 && selectedTaskId && (
                  <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      没有找到报告数据，请确保： 1. 已完成内容提取（检查
                      extraction_results 目录） 2. 已完成内容判别（检查
                      discrimination_results 目录）
                    </AlertDescription>
                  </Alert>
                )}

                {resultFolders.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-700">
                      <strong>提示：</strong>将生成一个Excel文件，包含{" "}
                      {resultFolders.length} 个报告的数据，每个报告占一行。
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧日志输出 */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    生成日志
                  </CardTitle>
                  <CardDescription>
                    每个任务生成一个Excel文件，包含所有报告数据
                  </CardDescription>
                </div>
                {generationLogs.length > 0 && (
                  <Button
                    onClick={clearLogs}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    清空日志
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {generationLogs.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {generationLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-3 rounded text-sm ${getLogStyle(
                            log.type
                          )}`}>
                          <div className="flex items-start gap-3">
                            {getLogIcon(log.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium break-all">
                                  {log.message}
                                </span>
                                {log.folderName && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.folderName}
                                  </Badge>
                                )}
                                {log.taskId && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs">
                                    任务: {log.taskId.substring(0, 8)}...
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>
                                  {log.timestamp.toLocaleTimeString()}
                                </span>
                                {log.downloadUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleManualDownload(
                                        log.downloadUrl!,
                                        log.message.includes(":")
                                          ? log.message.split(":")[1].trim()
                                          : "download.xlsx"
                                      )
                                    }
                                    className="h-6 px-2 text-xs">
                                    <Download className="h-3 w-3 mr-1" />
                                    重新下载
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      暂无生成日志
                    </p>
                    <p className="text-sm text-gray-500">
                      点击生成按钮后，日志将显示在这里并自动下载Excel文件
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExcelReportGenerator
