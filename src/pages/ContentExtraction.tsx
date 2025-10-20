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
  Search,
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { dataService } from "@/services/dataService"
import type { ExtractionResult } from "@/types"
import { getExtractedFoldersInfo, FolderInfo } from "@/api/extractContent"
import FolderCard from "@/components/ui/foldercard"
// 根据 app.py 的数据结构调整接口
interface DecompressedFolder {
  area_code: string // 地块编码
  folder_name: string // 文件夹名称
  download_time: string // 下载/解压时间
  status: string // 状态
  origin_folder_name?: string // 原始文件夹名称
  update_time?: string // 更新时间
}

// 根据 filter_pdf 文件夹信息调整接口
interface FilterPdfFolder {
  area_code: string // 地块编码
  folder_name: string // 文件夹名称
  origin_folder_name?: string // 原始文件夹名称
  update_time?: string // 更新时间
  status: string // 状态
  size?: number // 文件大小
  type?: string // 文件类型
}

interface ExtractionLog {
  id: string
  fileName: string
  fileId: string
  extractedAt: Date
  status: "processing" | "completed" | "error"
  content?: string
  chapter?: string
  keywords?: string[]
  errorMessage?: string
  statusPdf?: string
  planningPdf?: string
}

// 创建单独的文件列表组件
interface FileListProps {
  areaCode: string
}

const FileList: React.FC<FileListProps> = ({ areaCode }) => {
  const [files, setFiles] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `http://localhost:8000/filter_pdf/extracteds?area_code=${areaCode}`
        )
        if (response.ok) {
          const data = await response.json()
          setFiles(data.files || [])
        } else {
          throw new Error("获取文件列表失败")
        }
      } catch (error) {
        console.error("获取文件列表失败:", error)
        toast({
          title: "获取文件列表失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadFiles()
  }, [areaCode, toast])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        加载文件中...
      </div>
    )
  }

  return files.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {files.map((file, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {file}
        </Badge>
      ))}
    </div>
  ) : (
    <span className="text-xs text-gray-500">暂无文件</span>
  )
}

const ContentExtraction: React.FC = () => {
  const [isFileListOpen, setIsFileListOpen] = useState(false)
  const [extractionLogs, setExtractionLogs] = useState<ExtractionLog[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const { toast } = useToast()
  const [folders, setFolders] = useState<DecompressedFolder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [filterPdfFolders, setFilterPdfFolders] = useState<FilterPdfFolder[]>(
    []
  )
  const [isLoadingFilterPdf, setIsLoadingFilterPdf] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [extractedFolderInfo, setExtractedFolderInfo] = useState<FolderInfo[]>(
    []
  )

  // 预定义的关键词用于章节提取
  const defaultKeywords = [
    "项目概况",
    "建设内容",
    "环境影响",
    "污染防治",
    "监测方案",
    "结论建议",
    "技术要求",
    "质量控制",
    "风险评估",
    "应急预案",
    "验收标准",
    "整改措施",
  ]

  // 获取文件夹信息的函数 - 直接调用 app.py 的接口
  const fetchDecompressedFolders = async () => {
    setIsLoadingFolders(true)
    try {
      const response = await fetch(
        "http://localhost:8000/downloads/decompressed"
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `HTTP错误! 状态: ${response.status}, 详情: ${errorText}`
        )
      }

      const data = await response.json()

      if (data && Array.isArray(data.folders)) {
        setFolders(data.folders)
      } else {
        console.warn("响应数据结构异常:", data)
        setFolders([])
      }
    } catch (error) {
      console.error("获取文件夹信息出错:", error)
      toast({
        title: "获取文件夹失败",
        description:
          error instanceof Error ? error.message : "无法连接到服务器",
        variant: "destructive",
      })
    } finally {
      setIsLoadingFolders(false)
    }
  }

  // 手动刷新数据,获取已经提取的文件信息
  const handleRefresh = async () => {
    const extractedFolders = await getExtractedFoldersInfo()
    console.log(extractedFolders)

    setExtractedFolderInfo(extractedFolders)
  }

  // 内容提取函数 - 调用 app.py 的提取接口
  const extractContentFromFolder = async (
    folderName: string
  ): Promise<{ content: string; status: string }> => {
    try {
      const response = await fetch("http://localhost:8000/extractor_folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folder_name: folderName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `提取失败: ${response.status}`)
      }

      const result = await response.json()

      // 构建提取内容
      let extractedContent = `【内容提取结果】\n\n`
      extractedContent += `文件夹: ${folderName}\n`
      extractedContent += `处理时间: ${new Date().toLocaleString()}\n`
      extractedContent += `状态: ${result.message}\n\n`

      if (result.folder_info) {
        extractedContent += `处理详情:\n`
        extractedContent += `- 地块编码: ${
          result.folder_info.area_code || folderName
        }\n`
        extractedContent += `- 文件夹名称: ${
          result.folder_info.folder_name || folderName
        }\n`
        extractedContent += `- 更新时间: ${
          result.folder_info.update_time || "未知"
        }\n`
        extractedContent += `- 处理状态: ${
          result.folder_info.status || "未知"
        }\n`
      }

      extractedContent += `\n提取流程:\n`
      extractedContent += `1. 从 downloads 文件夹读取源文件\n`
      extractedContent += `2. 使用 extract_pdf.py 进行内容提取\n`
      extractedContent += `3. 将提取结果保存到 filter_pdf 文件夹\n`
      extractedContent += `4. 状态更新为: ${
        result.folder_info?.status || "completed"
      }`

      return {
        content: extractedContent,
        status: result.folder_info?.status || "completed",
      }
    } catch (error) {
      throw new Error(
        `内容提取失败: ${error instanceof Error ? error.message : "未知错误"}`
      )
    }
  }

  // 执行核心内容提取
  const handleExtractCoreContent = async () => {
    if (!selectedFolder) {
      toast({
        title: "请选择文件夹",
        description: "请先选择要提取内容的文件夹",
        variant: "destructive",
      })
      return
    }

    const selectedFolderObj = folders.find(
      (f) => f.area_code === selectedFolder
    )
    if (!selectedFolderObj) {
      toast({
        title: "文件夹不存在",
        description: "选中的文件夹信息未找到",
        variant: "destructive",
      })
      return
    }

    setIsExtracting(true)

    try {
      const logId = `log-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`

      // 创建处理中的日志
      const processingLog: ExtractionLog = {
        id: logId,
        fileName: selectedFolderObj.folder_name,
        fileId: selectedFolderObj.area_code,
        extractedAt: new Date(),
        status: "processing",
        keywords: defaultKeywords,
      }

      // 更新日志
      const updatedLogs = [...extractionLogs, processingLog]
      saveExtractionLogs(updatedLogs)

      // 调用 app.py 的提取接口
      const extractionResult = await extractContentFromFolder(
        selectedFolderObj.area_code
      )

      // 更新为完成状态
      const completedLog: ExtractionLog = {
        ...processingLog,
        status: "completed",
        content: extractionResult.content,
        chapter: "PDF内容提取",
      }

      const finalLogs = updatedLogs.slice(0, -1).concat(completedLog)
      saveExtractionLogs(finalLogs)

      // 保存到 dataService
      const dataServiceResult: ExtractionResult = {
        id: `result-${Date.now()}`,
        fileId: selectedFolderObj.area_code,
        ruleId: "core-content-rule",
        content: extractionResult.content,
        confidence: 0.95,
        location: {
          page: 1,
          section: "PDF内容提取",
        },
        extractedAt: new Date(),
      }

      dataService.addExtractionResult(dataServiceResult)

      // 提取完成后刷新 filter_pdf 文件夹列表
      handleRefresh()

      toast({
        title: "提取完成",
        description: `已完成文件夹 "${selectedFolderObj.folder_name}" 的内容提取`,
      })
    } catch (error) {
      // 错误处理
      const errorLog: ExtractionLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fileName: selectedFolderObj!.folder_name,
        fileId: selectedFolderObj!.area_code,
        extractedAt: new Date(),
        status: "error",
        errorMessage: error instanceof Error ? error.message : "提取失败",
      }

      const errorLogs = [...extractionLogs, errorLog]
      saveExtractionLogs(errorLogs)

      toast({
        title: "提取失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  // 保存提取日志到localStorage
  const saveExtractionLogs = (logs: ExtractionLog[]) => {
    localStorage.setItem("extraction_logs", JSON.stringify(logs))
    setExtractionLogs(logs)
  }

  // 导出提取结果
  const exportResults = () => {
    const completedLogs = extractionLogs.filter(
      (log) => log.status === "completed" && log.content
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
      ["文档名称", "提取时间", "章节", "关键词", "提取内容"],
      ...completedLogs.map((log) => [
        log.fileName,
        log.extractedAt.toLocaleString(),
        log.chapter || "未知章节",
        log.keywords?.join("、") || "",
        (log.content || "").replace(/\n/g, " ").substring(0, 500) + "...",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `core_content_extraction_${
      new Date().toISOString().split("T")[0]
    }.csv`
    link.click()

    toast({
      title: "导出成功",
      description: "提取结果已导出为CSV文件",
    })
  }

  // 复制内容
  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "已复制",
      description: "内容已复制到剪贴板",
    })
  }

  // 清空日志
  const clearLogs = () => {
    localStorage.removeItem("extraction_logs")
    setExtractionLogs([])
    toast({
      title: "日志已清空",
      description: "所有提取日志已清除",
    })
  }

  // 加载数据 - 只在组件挂载时加载一次
  useEffect(() => {
    const loadData = async () => {
      const savedLogs = localStorage.getItem("extraction_logs")
      const extractedFolders = await getExtractedFoldersInfo()
      setExtractedFolderInfo(extractedFolders)
      if (savedLogs) {
        try {
          const logs = JSON.parse(savedLogs).map((log: any) => ({
            ...log,
            extractedAt: new Date(log.extractedAt),
          }))
          setExtractionLogs(logs)
        } catch (error) {
          console.error("加载提取日志失败:", error)
        }
      }
    }
    fetchDecompressedFolders()
    loadData()
    // 移除自动刷新，改为手动刷新
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和刷新按钮 */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              内容检索与提取
            </h1>
            <p className="text-lg text-gray-600">
              智能提取PDF文档中的核心章节内容
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-4">
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">刷新</span>
          </Button>
        </div>

        {/* 文件选择区域 */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              文件选择
            </CardTitle>
            <CardDescription>选择要进行内容提取的已解压文件夹</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <div
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 ${
                  isLoadingFolders ? "opacity-50 pointer-events-none" : ""
                }`}
                onClick={() =>
                  !isLoadingFolders && setIsFileListOpen(!isFileListOpen)
                }>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {selectedFolder
                      ? folders.find((f) => f.area_code === selectedFolder)
                          ?.folder_name
                      : "选择已解压的文件夹"}
                  </span>
                  {selectedFolder && <Badge variant="secondary">已选择</Badge>}
                </div>
                {isLoadingFolders ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFileListOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>

              {isFileListOpen && !isLoadingFolders && (
                <div className="border-t bg-gray-50">
                  <div className="max-h-60 overflow-y-auto">
                    {folders.length > 0 ? (
                      folders.map((folder) => (
                        <div
                          key={folder.area_code}
                          className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`folder-${folder.area_code}`}
                              checked={selectedFolder === folder.area_code}
                              onCheckedChange={() =>
                                setSelectedFolder(
                                  selectedFolder === folder.area_code
                                    ? null
                                    : folder.area_code
                                )
                              }
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📂</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {folder.folder_name}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>地块编码: {folder.area_code}</span>
                                    <span>
                                      解压时间: {folder.download_time}
                                    </span>
                                    <Badge
                                      variant="default"
                                      className="text-xs">
                                      {folder.status}
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
                        暂无已解压的文件夹
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 操作面板 */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              核心内容提取
            </CardTitle>
            <CardDescription>
              系统将自动调用 extract_pdf.py 提取PDF文档中的关键章节内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  可处理文件夹:{" "}
                  <span className="font-medium text-green-600">
                    {folders.length}
                  </span>{" "}
                  个
                </div>
                <div className="text-sm text-gray-600">
                  已选择:{" "}
                  <span className="font-medium text-green-600">
                    {selectedFolder ? 1 : 0}
                  </span>{" "}
                  个
                </div>
                <div className="text-sm text-gray-600">
                  提取关键词:{" "}
                  <span className="font-medium text-purple-600">
                    {defaultKeywords.length}
                  </span>{" "}
                  个
                </div>
                <div className="text-sm text-gray-600">
                  已提取文件夹:{" "}
                  <span className="font-medium text-blue-600">
                    {filterPdfFolders.length}
                  </span>{" "}
                  个
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExtractCoreContent}
                  disabled={isExtracting || !selectedFolder}
                  className="bg-blue-600 hover:bg-blue-700">
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      提取中...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      提取核心内容
                    </>
                  )}
                </Button>
                {extractionLogs.length > 0 && (
                  <>
                    <Button variant="outline" onClick={exportResults}>
                      <Download className="h-4 w-4 mr-2" />
                      导出结果
                    </Button>
                    <Button variant="outline" onClick={clearLogs}>
                      清空日志
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* 关键词展示 */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                提取关键词
              </label>
              <div className="flex flex-wrap gap-2">
                {defaultKeywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 处理状态 */}
            {isExtracting && (
              <Alert className="mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  正在调用 extract_pdf.py 提取文件内容，请稍候...
                </AlertDescription>
              </Alert>
            )}

            {/* 无文件选择提示 */}
            {!isExtracting && !selectedFolder && folders.length > 0 && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  请先在上方选择要提取内容的文件夹，然后点击"提取核心内容"按钮开始处理
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 提取结果 - 显示 filter_pdf 文件夹信息 */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                提取结果 ({filterPdfFolders.length})
              </span>
              <div className="flex items-center gap-2">
                {isLoadingFilterPdf && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoadingFilterPdf}>
                  <RefreshCw
                    className={`h-3 w-3 ${
                      isLoadingFilterPdf ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              显示已成功提取内容的文件夹信息（从 filter_pdf 获取）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ✅ map 循环生成 */}
            {extractedFolderInfo.map((item) => (
              <FolderCard
                key={item.area_code}
                areaCode={item.area_code}
                folderName="filter_pdf"
                originFolderName={item.origin_folder_name}
              />
            ))}
          </CardContent>
        </Card>

        {/* 保留原有的提取日志部分 */}
        {extractionLogs.length > 0 && (
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                提取日志 ({extractionLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {extractionLogs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {log.fileName}
                            </Badge>
                            <Badge
                              variant={
                                log.status === "completed"
                                  ? "default"
                                  : log.status === "error"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="flex items-center gap-1">
                              {log.status === "completed" && (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              {log.status === "error" && (
                                <AlertCircle className="h-3 w-3" />
                              )}
                              {log.status === "processing" && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              {log.status === "completed"
                                ? "提取完成"
                                : log.status === "error"
                                ? "提取失败"
                                : "提取中"}
                            </Badge>
                            {log.chapter && (
                              <Badge variant="outline">
                                章节: {log.chapter}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mb-2">
                            提取时间: {log.extractedAt.toLocaleString()}
                            {log.keywords && (
                              <span className="ml-4">
                                关键词: {log.keywords.slice(0, 3).join("、")}
                                {log.keywords.length > 3 && "..."}
                              </span>
                            )}
                          </p>
                        </div>
                        {log.content && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyContent(log.content!)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {log.status === "error" && log.errorMessage && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-red-700">
                            错误信息: {log.errorMessage}
                          </p>
                        </div>
                      )}

                      {log.content && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2">
                            提取内容预览:
                          </div>
                          <p className="text-sm whitespace-pre-wrap line-clamp-6">
                            {log.content.length > 500
                              ? log.content.substring(0, 500) + "..."
                              : log.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ContentExtraction
