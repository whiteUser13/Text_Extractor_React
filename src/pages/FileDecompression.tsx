import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"

import {
  Archive,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Zap,
  CheckSquare,
  Square,
  FolderOpen,
} from "lucide-react"

import type { FileInfo } from "@/types"
import axios from "axios"

interface DecompressionLog {
  id: string
  fileName: string
  status: "success" | "failed" | "warning" | "processing" | "skipped"
  message: string
  timestamp: Date
  fileSize: number
}

const FileDecompression: React.FC = () => {
  const [allFiles, setAllFiles] = useState<FileInfo[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [logs, setLogs] = useState<DecompressionLog[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // 从dataService获取所有已上传的文件
  useEffect(() => {
    const loadFiles = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/files_info/zip")
        console.log("接口返回：", res.data)

        if (res.data.status === "success") {
          const files: FileInfo[] = res.data.zip_files.map((item: any) => ({
            id: item.id,
            name: item.origin_name,
            size: item.size,
            type: item.type,
            uploadTime: item.upload_time,
            status: item.status,
          }))
          setAllFiles(files)
        } else {
          console.error("获取文件列表失败:", res.data.message)
        }
      } catch (err) {
        console.error("请求文件列表出错:", err)
      }
    }

    // 初始加载（保证首次展示）
    loadFiles()

    // 优先使用 SSE 订阅后端变化；若 SSE 不可用则回退到轮询
    let eventSource: EventSource | null = null
    let pollingInterval: number | null = null

    const startSSE = () => {
      try {
        eventSource = new EventSource('http://127.0.0.1:8000/files_info/zip/stream')

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            // 如果后端发送整个响应体（与 /files_info/zip 一致）
            if (data && data.status === 'success' && Array.isArray(data.zip_files)) {
              const files: FileInfo[] = data.zip_files.map((item: any) => ({
                id: item.id,
                name: item.origin_name,
                size: item.size_kb || item.size || 0,
                type: item.type,
                uploadTime: item.upload_time,
                status: item.status,
              }))
              setAllFiles(files)
            } else if (data && data.zip_files && Array.isArray(data.zip_files)) {
              // 某些情况下后端返回不含 status 字段
              const files: FileInfo[] = data.zip_files.map((item: any) => ({
                id: item.id,
                name: item.origin_name,
                size: item.size_kb || item.size || 0,
                type: item.type,
                uploadTime: item.upload_time,
                status: item.status,
              }))
              setAllFiles(files)
            }
          } catch (err) {
            console.error('解析 SSE 数据失败', err)
          }
        }

        eventSource.onerror = (err) => {
          console.warn('SSE 连接发生错误，回退到轮询：', err)
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }
          // 启动轮询作为回退
          if (!pollingInterval) {
            pollingInterval = window.setInterval(loadFiles, 5000)
          }
        }
      } catch (err) {
        console.error('无法建立 SSE 连接，启用轮询：', err)
        pollingInterval = window.setInterval(loadFiles, 5000)
      }
    }

    startSSE()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [])
  const handleStartDecompression = async () => {
    setIsProcessing(true)
    setLogs([])

    try {
      // const response = await axios.get("http://127.0.0.1:8000/files_info/zip")
      // const zipFiles = response.data.zip_files || []

      for (const fileId of selectedFiles) {
        // console.log(file)

        // 从后端返回的结构中取出文件标识（id 或 origin_name 或 fileName）
        // const filename = file.id

        await new Promise<void>((resolve) => {
          const eventSource = new EventSource(
            `http://127.0.0.1:8000/extract-by-filename-stream?filename=${encodeURIComponent(
              fileId
            )}`
          )

          eventSource.onmessage = (event) => {
            const message = event.data
            console.log("收到日志:", message)

            setLogs((prev) => [
              ...prev,
              {
                id: `sse-${Date.now()}`,
                fileName: fileId,
                message,
                timestamp: new Date(),
                status: message.includes("出错") ? "failed" : "processing",
                fileSize: 0,
              },
            ])

            if (message.includes("处理结束") || message.includes("完成")) {
              eventSource.close()
              resolve() // ✅ 正常结束
            }
          }

          eventSource.onerror = (err) => {
            console.error("SSE 错误:", err)
            eventSource.close()
            resolve() // 即使出错也继续处理下一个
          }
        })
      }
    } catch (error) {
      console.error("请求出错:", error)
    }

    setIsProcessing(false)
  }

  const handleFileSelect = (fileId: string, checked: boolean) => {
    const newSelectedFiles = new Set(selectedFiles)
    if (checked) {
      newSelectedFiles.add(fileId)
    } else {
      newSelectedFiles.delete(fileId)
    }
    setSelectedFiles(newSelectedFiles)
  }

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFileIds = new Set(allFiles.map((file) => file.id))
      setSelectedFiles(allFileIds)
    } else {
      setSelectedFiles(new Set())
    }
  }

  // 检查是否全选
  const isAllSelected =
    allFiles.length > 0 && selectedFiles.size === allFiles.length
  const isPartialSelected =
    selectedFiles.size > 0 && selectedFiles.size < allFiles.length

  // 开始解压缩处理

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 获取文件类型图标
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

  // 获取日志状态图标
  const getLogIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  // 获取日志状态颜色
  const getLogColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200"
      case "failed":
        return "text-red-600 bg-red-50 border-red-200"
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "processing":
        return "text-blue-600 bg-blue-50 border-blue-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  // 统计信息
  const stats = {
    total: allFiles.length,
    selected: selectedFiles.size,
    compressed: allFiles.filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase()
      return ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")
    }).length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            文件解压缩处理
          </h1>
          <p className="text-lg text-gray-600">
            选择需要解压缩的文件，支持批量处理和实时日志监控
          </p>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总文件数</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">已上传的所有文件</p>
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
              <CardTitle className="text-sm font-medium">压缩文件</CardTitle>
              <Archive className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.compressed}
              </div>
              <p className="text-xs text-muted-foreground">可解压缩的文件</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 文件列表和选择 */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="h-5 w-5" />
                  <span>所有文档</span>
                  <Badge variant="secondary">{allFiles.length}</Badge>
                </div>
                {allFiles.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">
                      已选择 {selectedFiles.size} / {allFiles.length}
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {allFiles.length > 0 ? (
                <>
                  {/* 全选控制 */}
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                    <Checkbox
                      id="select-all"
                      checked={isAllSelected}
                      onCheckedChange={(checked) =>
                        handleSelectAll(checked as boolean)
                      }
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium cursor-pointer flex items-center space-x-2 flex-1">
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-500" />
                      )}
                      <span>
                        {isAllSelected ? "取消全选" : "全选文件"}
                        {isPartialSelected &&
                          !isAllSelected &&
                          ` (${selectedFiles.size}/${allFiles.length})`}
                      </span>
                    </label>
                    <Button
                      onClick={() => handleSelectAll(!isAllSelected)}
                      variant="outline"
                      size="sm"
                      disabled={isProcessing}>
                      {isAllSelected ? "取消全选" : "全选"}
                    </Button>
                  </div>

                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {allFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                            selectedFiles.has(file.id)
                              ? "border-blue-300 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}>
                          <div className="flex items-center space-x-3 flex-1">
                            <Checkbox
                              id={`file-${file.id}`}
                              checked={selectedFiles.has(file.id)}
                              onCheckedChange={(checked) =>
                                handleFileSelect(file.id, checked as boolean)
                              }
                              className="data-[state=checked]:bg-blue-600"
                            />
                            {getFileIcon(file.name)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {file.name}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {/* <span>{formatFileSize(file.size)}</span> */}
                                {/* <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {file.type}
                                </Badge> */}
                                {/* <span>•</span>
                                <Badge 
                                  variant={file.status === 'completed' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {file.status === 'completed' ? '已处理' : '处理中'}
                                </Badge> */}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <Separator />

                  <div className="space-y-3">
                    {isProcessing && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>解压缩进度</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="w-full" />
                      </div>
                    )}

                    <Button
                      onClick={handleStartDecompression}
                      disabled={isProcessing || selectedFiles.size === 0}
                      className="w-full"
                      size="lg">
                      {isProcessing ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          解压缩中...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          开始解压缩 ({selectedFiles.size})
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    暂无文件
                  </p>
                  <p className="text-sm text-gray-500">
                    请先在文件上传页面上传文件
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 解压缩日志 */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>解压缩日志</span>
                <Badge variant="secondary">{logs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg border ${getLogColor(
                          log.status
                        )} ${
                          log.message.includes("文件可能下载不完整")
                            ? "text-red-600 font-semibold"
                            : ""
                        }`}>
                        <div className="flex items-start space-x-2">
                          {getLogIcon(log.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm truncate">
                                {log.fileName}
                              </p>
                              <span className="text-xs text-gray-500">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{log.message}</p>
                            {/* <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                              <span>大小: {formatFileSize(log.fileSize)}</span>
                            </div> */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <Zap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    暂无日志
                  </p>
                  <p className="text-sm text-gray-500">
                    开始解压缩后将显示处理日志
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default FileDecompression
