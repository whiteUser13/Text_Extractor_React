import React, { useState, useCallback, useRef, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import ProgressBar from "@/components/ui/progressbar"
import DataList from "@/components/FileUpload/DataList"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Eye,
  Clock,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { dataService } from "@/services/dataService"
import { processingService } from "@/services/processingService"
import {
  getSupportedFileTypes,
  formatFileSize,
  generateFileId,
  isImageFile,
  isPdfFile,
  isWordFile,
} from "@/utils/fileUtils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { FileInfo, DocumentParseResult, Task } from "@/types"
import FilePreview from "@/components/FilePreview"
import {
  addDownloadTask,
  DownloadTaskInfo,
  getDownloadTasksInfo,
  UploadFileInfo,
  getUploadFileInfo,
  uploadFile,
  retryErrorDownload,
  deleteUploadFile,
} from "@/api/fileUpload"
import axios from "axios"
import { parseExcel, ParsedExcelResult } from "../utils/parseExcel"
import { useTaskStore } from "@/context/TaskContext"

const FileUpload: React.FC = () => {
  const [taskStats, setTaskStats] = useState<any[]>([])

  // 任务选择
  const [tasks, setTasks] = useState<Task[]>([]) //所有任务
  const { selectedTaskId, setSelectedTaskId, selectedTask, setSelectedTask } =
    useTaskStore()

  const handleSelectTask = (taskId: string) => {
    console.log(tasks)
    setSelectedTaskId(taskId)
    const task = tasks.find((t) => t.id === taskId) || null
    setSelectedTask(task)
  }

  // 让切换功能受控
  const [activeTab, setActiveTab] = useState<string>("upload")

  // 1.文件上传
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileCounts, setFileCounts] = useState(0)
  const [completedFileCounts, setCompletedFileCounts] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadTotal, setDownloadTotal] = useState(0)
  const [downloadCompleted, setDownloadCompleted] = useState(0)
  const [downloadError, setDownloadError] = useState(0)

  // 2.上传文件管理
  const [uploadFilesInfo, setUploadFilesInfo] = useState<UploadFileInfo[]>([])
  const uploadFileTabColumns = [
    { key: "origin_name", label: "文件名" },
    { key: "size", label: "大小" },
    { key: "type", label: "类型" },
    { key: "upload_time", label: "上传时间" },
    { key: "task_id", label: "任务" },
    { key: "user_id", label: "上传用户" },
  ]

  // 3.台账表格上传与下载
  const excelFileInputRef = useRef<HTMLInputElement>(null)
  const [selectedCol, setSelectedCol] = useState<string>("")
  const [excelData, setExcelData] = useState<ParsedExcelResult | null>(null)
  const [selectedAreaCode, setSelectedAreaCode] = useState<string>("")

  // 12.9修改
  const [checkAll, setCheckAll] = useState<boolean | "indeterminate">(false)
  const [selectedAreaCodeArr, setSelectedAreaCodeArr] = useState<string[]>([])
  const [codeArr, setCodeArr] = useState<string[]>([])

  // 4.下载文件管理
  const [downloadTasks, setDownloadTasks] = useState<DownloadTaskInfo[]>([])
  const downloadTaskTabColumns = [
    { key: "area_code", label: "地块编码" },
    { key: "file_name", label: "文件名" },
    { key: "size", label: "大小" },
    {
      key: "status",
      label: "状态",
      render: (value: string) => {
        return (
          <div className="flex items-center gap-2">
            <div
              className={`inline-block w-3 h-3 rounded-full ${getStatusColor(
                value,
              )}`}
            />
            <span>{getStatusLabel(value)}</span>
          </div>
        )
      },
    },
    { key: "created_at", label: "创建时间" },
    { key: "task_id", label: "任务" },
    {
      key: "err_msg",
      label: "错误信息",
      render: (value: string) => {
        if (value) {
          return (
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-red-500" />
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
  ]

  useEffect(() => {
    setTasks(dataService.getAllTasks())
    console.log("selectedTask", selectedTask, selectedTaskId)

    if (selectedAreaCodeArr.length === codeArr.length && codeArr.length > 0) {
      setCheckAll(true)
    } else {
      setCheckAll(false)
    }
  }, [selectedAreaCodeArr, codeArr, selectedTask, selectedTaskId])

  // 获取文件图标
  const getFileIcon = (file: File | FileInfo) => {
    const type = file.type

    if (isImageFile({ type } as File)) {
      return <Image className="h-8 w-8 text-blue-500" />
    } else if (isPdfFile({ type } as File)) {
      return <FileText className="h-8 w-8 text-red-500" />
    } else if (isWordFile({ type } as File)) {
      return <FileText className="h-8 w-8 text-blue-600" />
    }
    return <File className="h-8 w-8 text-gray-500" />
  }

  // 获取文件类型标签
  const getFileTypeLabel = (type: string): string => {
    if (type.includes("pdf")) return "PDF"
    if (type.includes("word") || type.includes("document")) return "Word"
    if (type.includes("image")) return "图片"
    if (type.includes("zip")) return "压缩包"
    return "其他"
  }

  // 验证文件
  const validateFile = (file: File): string | null => {
    const supportedTypes = getSupportedFileTypes()

    if (!supportedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type}`
    }
    return null
  }

  // 处理预览
  const handlePreview = (file: FileInfo) => {
    setPreviewFile(file)
    setPreviewOpen(true)
  }

  // 处理文件上传
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!selectedTaskId) {
        toast({
          title: "请先选择任务",
          description: "请在选择任务后再上传文件",
          variant: "destructive",
        })
        return
      }

      const fileArray = Array.from(files)
      const validFiles: File[] = []
      const errors: string[] = []

      // 验证文件
      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          errors.push(`${file.name}: ${error}`)
        } else {
          validFiles.push(file)
        }
      }

      if (errors.length > 0) {
        toast({
          title: "文件验证失败",
          description: errors.join("\n"),
          variant: "destructive",
        })
      }

      if (validFiles.length > 0) {
        setIsUploading(true)
        setFileCounts(validFiles.length)
        setCompletedFileCounts(0)

        let successCount = 0
        let failCount = 0
        const failedFiles: string[] = []

        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i]
          const formData = new FormData()
          formData.append("file", file)

          // 确保任务ID被正确传递
          formData.append(
            "data",
            new Blob(
              [
                JSON.stringify({
                  task_id: selectedTaskId,
                  user_id: "current_user", // 这里可以从用户系统获取
                }),
              ],
              {
                type: "application/json",
              },
            ),
          )

          try {
            const result = await uploadFile(formData, (percent) => {
              // 更新整体进度
              const overallProgress =
                ((i + percent / 100) / validFiles.length) * 100
              setCompletedFileCounts(Math.round(overallProgress))
            })

            if (result.success) {
              successCount++
              toast({
                title: "文件上传成功",
                description: `文件 ${file.name} 已保存到任务【${selectedTaskId}】`,
              })
            } else {
              failCount++
              failedFiles.push(file.name)
              toast({
                title: "上传失败",
                description: result.msg || `文件 ${file.name} 上传失败`,
                variant: "destructive",
              })
            }
          } catch (error: any) {
            failCount++
            failedFiles.push(file.name)
            toast({
              title: "上传失败",
              description: `文件 ${file.name} 上传过程中发生错误: ${error.message || "未知错误"}`,
              variant: "destructive",
            })
          }

          // 更新完成计数
          setCompletedFileCounts(
            Math.round(((i + 1) / validFiles.length) * 100),
          )
        }

        setIsUploading(false)

        // 显示上传总结
        if (failCount > 0) {
          toast({
            title: "上传完成（部分失败）",
            description: `成功: ${successCount} 个, 失败: ${failCount} 个\n失败文件: ${failedFiles.join(", ")}`,
            variant: "destructive",
          })
        } else {
          toast({
            title: "上传完成",
            description: `所有 ${successCount} 个文件上传成功`,
          })
        }

        // 刷新上传文件列表
        if (selectedTaskId) {
          await handleUploadMangeTabsPoint()
        }
      }
    },
    [selectedTaskId, toast],
  )

  // 拖拽处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  // 文件输入处理
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  // 删除文件
  const removeFile = async (fileId: string) => {
    if (!selectedTaskId) return

    try {
      const result = await deleteUploadFile(selectedTaskId, fileId)
      if (result.success) {
        toast({
          title: "文件已删除",
          description: "文件已从列表中移除",
        })
        // 刷新列表
        handleUploadMangeTabsPoint()
      } else {
        toast({
          title: "删除失败",
          description: result.msg || "文件删除失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "删除过程中发生错误",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "downloaded":
        return "bg-green-500"
      case "pending":
        return "bg-blue-500"
      case "error":
        return "bg-red-500"
      case "downloading":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      downloading: "下载中",
      pending: "待下载",
      downloaded: "已下载",
      error: "错误",
    }
    return labels[status] || status
  }

  // 上传文件管理
  const handleUploadMangeTabsPoint = async () => {
    if (selectedTaskId) {
      try {
        const result = await getUploadFileInfo(selectedTaskId)
        if (result.success) {
          const sortedData = result.data.sort((a, b) => {
            return (
              new Date(b.upload_time).getTime() -
              new Date(a.upload_time).getTime()
            )
          })
          setUploadFilesInfo(sortedData)
        } else {
          toast({
            title: "获取上传文件信息失败",
            description: result.msg,
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "获取上传文件信息失败",
          description: "请求过程中发生错误",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "请选择任务信息",
        variant: "destructive",
      })
    }
  }

  // excel文件上传
  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await parseExcel(file)
      result.rows.map((r, i) => ({
        ...r,
        _rowId:
          globalThis.crypto && "randomUUID" in globalThis.crypto
            ? (globalThis.crypto as Crypto).randomUUID()
            : `${Date.now()}-${Math.random()}-${i}`,
      }))
      setExcelData(result)

      // 设置默认列和编码
      setSelectedCol("地块编码")
      const codes: Set<string> = new Set()
      result.rows.map((item) => {
        console.log(String(item["地块编码"]))
        codes.add(String(item["地块编码"]))
      })
      setCodeArr([...codes])

      toast({
        title: "文件解析成功",
        description: `成功解析 ${result.rows.length} 行数据`,
      })
    } catch (err) {
      toast({
        title: "文件解析失败",
        description: "错误信息: " + err,
        variant: "destructive",
      })
    }
  }

  // 全选切换
  const toggleAll = () => {
    if (checkAll) {
      setSelectedAreaCodeArr([])
      setCheckAll(false)
    } else {
      setSelectedAreaCodeArr(codeArr)
      setCheckAll(true)
    }
  }

  // 点击复选框时更新数组
  const handleToggle = (value: string) => {
    setSelectedAreaCodeArr((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    )
  }

  // 文件下载
  const downloadFile = async () => {
    if (selectedAreaCodeArr.length > 0) {
      setDownloadTotal(selectedAreaCodeArr.length)
      try {
        const result = await addDownloadTask(
          selectedAreaCodeArr,
          selectedTaskId || "",
        )
        if (result.success) {
          toast({
            title: "添加后台下载任务成功",
            description: `已添加 ${selectedAreaCodeArr.length} 个下载任务`,
          })
          // 切换到下载管理标签页
          setActiveTab("manage")
          // 刷新下载任务列表
          setTimeout(() => {
            handleMangeTabsPoint()
          }, 500)
        } else {
          toast({
            title: "添加后台下载任务失败",
            description: result.msg,
            variant: "destructive",
          })
        }
      } catch (err: any) {
        toast({
          title: "请求出错",
          description: err.message || "未知错误",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "未选择地块编码",
        description: "请选择要下载的地块编码",
        variant: "destructive",
      })
    }
  }

  const pollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    // 只有在“下载管理”tab 且 已选择任务时才轮询
    if (activeTab !== "manage" || !selectedTaskId) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    // 立刻请求一次
    handleMangeTabsPoint()

    // 每 3s 轮询
    pollTimerRef.current = window.setInterval(() => {
      handleMangeTabsPoint()
    }, 3000)

    // 清理定时器
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [activeTab, selectedTaskId])

  // 下载重试
  const retryError = async () => {
    if (selectedTaskId) {
      try {
        const result = await retryErrorDownload(selectedTaskId)
        if (result.success) {
          toast({
            title: "重试成功",
            description: "已开始重新下载失败的任务",
          })
          handleMangeTabsPoint()
        } else {
          toast({
            title: "重试失败",
            description: result.msg,
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "重试失败",
          description: "请求过程中发生错误",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "请先选择任务",
        variant: "destructive",
      })
    }
  }

  // 下载文件管理
  const handleMangeTabsPoint = async () => {
    if (selectedTaskId) {
      try {
        const result = await getDownloadTasksInfo(selectedTaskId)
        if (result.success) {
          const sortedData = result.data.sort((a, b) => {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            )
          })
          setDownloadTasks(sortedData)

          let errorCounts = 0
          let successCounts = 0
          setDownloadTotal(sortedData.length)

          sortedData.forEach((task) => {
            if (task.status === "error") {
              errorCounts++
            } else if (task.status === "downloaded") {
              successCounts++
            }
          })

          setDownloadCompleted(successCounts)
          setDownloadError(errorCounts)
          console.log(sortedData)
        } else {
          toast({
            title: "获取下载任务信息失败",
            description: result.msg,
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "获取下载任务信息失败",
          description: "请求过程中发生错误",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "请先选择任务",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            文件上传与管理
          </h1>
          <p className="text-lg text-gray-600">
            支持PDF、Word、图片等多种格式，无文件大小限制
          </p>
        </div>

        <Card className="border py-6 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              处理任务选择
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedTaskId || ""}
              onValueChange={handleSelectTask}>
              <SelectTrigger>
                <SelectValue placeholder="选择任务" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 任务状态卡片 */}
        {selectedTaskId && (
          <Card className="border py-4 bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                当前任务：{selectedTask?.name || selectedTaskId}
                <Badge variant="secondary">{selectedTaskId}</Badge>
              </CardTitle>
              <CardDescription>
                所有上传、下载和处理的文件都将保存到此任务目录下
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">文件上传</TabsTrigger>
            <TabsTrigger
              onClick={handleUploadMangeTabsPoint}
              value="upload-manage">
              上传文件管理
            </TabsTrigger>
            <TabsTrigger value="download">文件下载</TabsTrigger>
            <TabsTrigger onClick={handleMangeTabsPoint} value="manage">
              下载管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* 上传区域 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  批量文件上传
                </CardTitle>
                <CardDescription>
                  拖拽文件到此区域或点击选择文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}>
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    拖拽文件到此处上传
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    或者点击下方按钮选择文件
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.bmp,.zip"
                    onChange={handleFileInput}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? "上传中..." : "选择文件"}
                  </Button>
                </div>

                {/* 支持的文件类型 */}
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">支持的文件类型：</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">PDF</Badge>
                    <Badge variant="outline">Word (doc/docx)</Badge>
                    <Badge variant="outline">图片 (jpg/png/bmp)</Badge>
                    <Badge variant="outline">压缩包 (zip)</Badge>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    ✓ 无文件大小限制
                  </p>
                </div>
              </CardContent>
              {isUploading && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>上传进度</span>
                      <span>
                        第{" "}
                        {Math.round((completedFileCounts / 100) * fileCounts)} /{" "}
                        {fileCounts} 个文件
                      </span>
                    </div>
                    <Progress value={completedFileCounts} />
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="upload-manage" className="space-y-6">
            {/* 文件列表 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    上传文件 ({uploadFilesInfo.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataList
                  data={uploadFilesInfo}
                  columns={uploadFileTabColumns}
                  onDelete={removeFile}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="download" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    台账表格上传
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                      dragActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}>
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900">
                      拖拽文件到此处上传
                      <span className="block text-sm text-gray-600 mb-2">
                        支持的文件类型：
                        <Badge variant="outline">csv</Badge>
                        <Badge variant="outline">Excel (xlsx)</Badge>
                      </span>
                      <span className="text-xs text-green-600 mt-2">
                        文件大小小于10Mb
                      </span>
                    </p>

                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleExcelChange}
                      className="hidden"
                      ref={excelFileInputRef}
                    />
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      disabled={isUploading}
                      onClick={() => excelFileInputRef.current?.click()}>
                      {isUploading ? "上传中..." : "选择文件"}
                    </Button>
                  </div>
                </CardContent>
                {isUploading && (
                  <Alert>
                    <Upload className="h-4 w-4" />
                    <AlertDescription>正在解析文件，请稍候...</AlertDescription>
                  </Alert>
                )}
              </Card>

              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    文件下载
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {codeArr.length > 0 ? (
                    <>
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="select-all"
                          checked={checkAll}
                          onCheckedChange={toggleAll}
                        />
                        <Label htmlFor="select-all" className="font-medium">
                          全选 ({codeArr.length} 个地块)
                        </Label>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto p-2 border rounded">
                        {codeArr.map((code) => (
                          <div
                            key={code}
                            className="flex items-center space-x-2">
                            <Checkbox
                              id={`code-${code}`}
                              checked={selectedAreaCodeArr.includes(code)}
                              onCheckedChange={() => handleToggle(code)}
                            />
                            <Label
                              htmlFor={`code-${code}`}
                              className="text-sm truncate">
                              {code}
                            </Label>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end mt-4">
                        <Button
                          onClick={downloadFile}
                          disabled={selectedAreaCodeArr.length === 0}>
                          <Download className="mr-2 h-4 w-4" />
                          下载 ({selectedAreaCodeArr.length})
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      请先上传台账表格文件
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            {/* 下载任务列表 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    下载任务 ({downloadTasks.length})
                  </span>
                  <Button onClick={retryError} variant="outline" size="sm">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    错误重新下载
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataList
                  data={downloadTasks}
                  columns={downloadTaskTabColumns}
                />

                {/* 下载任务进度条 */}
                {downloadTotal > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>下载进度</span>
                      <span>
                        已完成: {downloadCompleted} / 总计: {downloadTotal}
                        {downloadError > 0 && ` (失败: ${downloadError})`}
                      </span>
                    </div>
                    <ProgressBar
                      total={downloadTotal}
                      downloaded={downloadCompleted}
                      error={downloadError}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 文件预览对话框 */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </div>
  )
}

export default FileUpload
