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
import type { FileInfo, DocumentParseResult } from "@/types"
import FilePreview from "@/components/FilePreview"
import axios from "axios"

const FileUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    // 移除文件大小限制，允许上传任意大小的文件
    // if (!validateFileSize(file)) {
    //   return '文件大小超过10MB限制';
    // }
    return null
  }

  // 生成模拟解析结果
  const generateMockParseResult = (file: FileInfo): DocumentParseResult => {
    const isImage = isImageFile({ type: file.type } as File)
    const isPdf = isPdfFile({ type: file.type } as File)
    const isWord = isWordFile({ type: file.type } as File)

    // 根据文件类型生成不同的模拟内容
    let mockContent = {
      text: "",
      tables: [] as any[],
      images: [] as any[],
      structure: {
        title: "",
        sections: [] as any[],
        pageCount: 1,
      },
    }

    if (isImage) {
      mockContent = {
        text: "通过OCR识别提取的文本内容：\n\n这是一个示例图片文件，包含了一些文本信息。OCR技术已成功识别出图片中的文字内容，包括标题、正文和其他相关信息。",
        tables: [],
        images: [
          {
            title: "原始图片",
            description: "上传的图片文件",
            page: 1,
          },
        ],
        structure: {
          title: file.name,
          sections: [
            {
              title: "OCR识别结果",
              level: 1,
              page: 1,
              content: "图片中识别出的文本内容",
            },
          ],
          pageCount: 1,
        },
      }
    } else if (isPdf) {
      mockContent = {
        text: `${file.name} - PDF文档解析结果\n\n第一章 概述\n本文档是一个示例PDF文件，包含了多个章节和丰富的内容结构。\n\n第二章 详细内容\n这里是文档的详细内容部分，包含了大量的文本信息、数据表格和图表。\n\n第三章 数据分析\n本章节包含了详细的数据分析结果和相关图表。\n\n第四章 结论\n基于前面的分析，我们得出了以下结论...`,
        tables: [
          {
            title: "数据统计表",
            headers: ["项目", "数值", "单位", "备注"],
            rows: [
              ["总数量", "1,234", "个", "统计截止到当前"],
              ["平均值", "56.78", "%", "计算方法：总和/数量"],
              ["最大值", "99.9", "%", "历史最高记录"],
              ["最小值", "12.3", "%", "历史最低记录"],
            ],
            page: 2,
          },
          {
            title: "分类汇总表",
            headers: ["类别", "数量", "占比"],
            rows: [
              ["类别A", "456", "37%"],
              ["类别B", "389", "31%"],
              ["类别C", "389", "32%"],
            ],
            page: 3,
          },
        ],
        images: [
          {
            title: "图1 趋势分析图",
            description: "显示了过去12个月的数据变化趋势",
            page: 2,
          },
          {
            title: "图2 分布图",
            description: "各类别数据的分布情况",
            page: 3,
          },
        ],
        structure: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          sections: [
            { title: "概述", level: 1, page: 1, content: "文档概述内容" },
            { title: "详细内容", level: 1, page: 1, content: "详细内容描述" },
            { title: "数据分析", level: 1, page: 2, content: "数据分析结果" },
            { title: "统计图表", level: 2, page: 2, content: "各类统计图表" },
            { title: "趋势分析", level: 2, page: 2, content: "数据趋势分析" },
            { title: "结论", level: 1, page: 3, content: "分析结论" },
          ],
          pageCount: 3,
        },
      }
    } else if (isWord) {
      mockContent = {
        text: `${file.name} - Word文档解析结果\n\n标题：报告文档\n\n1. 引言\n本报告旨在分析当前的业务状况并提出改进建议。\n\n2. 现状分析\n通过对现有数据的分析，我们发现了以下几个关键问题：\n- 效率有待提升\n- 成本控制需要加强\n- 质量管理需要完善\n\n3. 改进建议\n基于以上分析，我们提出以下改进建议：\n- 优化工作流程\n- 引入新技术\n- 加强培训\n\n4. 实施计划\n改进措施的具体实施计划如下...`,
        tables: [
          {
            title: "实施计划表",
            headers: ["阶段", "任务", "负责人", "完成时间"],
            rows: [
              ["第一阶段", "需求分析", "张三", "2024-01-15"],
              ["第二阶段", "方案设计", "李四", "2024-02-15"],
              ["第三阶段", "系统开发", "王五", "2024-04-15"],
              ["第四阶段", "测试验收", "赵六", "2024-05-15"],
            ],
            page: 2,
          },
        ],
        images: [
          {
            title: "流程图",
            description: "业务流程优化示意图",
            page: 1,
          },
        ],
        structure: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          sections: [
            { title: "引言", level: 1, page: 1, content: "报告引言部分" },
            { title: "现状分析", level: 1, page: 1, content: "当前状况分析" },
            { title: "改进建议", level: 1, page: 2, content: "具体改进建议" },
            { title: "实施计划", level: 1, page: 2, content: "详细实施计划" },
          ],
          pageCount: 2,
        },
      }
    } else {
      // 其他文件类型的默认内容
      mockContent = {
        text: `${file.name} - 文件解析结果\n\n这是一个通用文件的解析结果。系统已成功提取了文件中的基本信息和内容结构。`,
        tables: [],
        images: [],
        structure: {
          title: file.name,
          sections: [
            {
              title: "文件内容",
              level: 1,
              page: 1,
              content: "解析出的文件内容",
            },
          ],
          pageCount: 1,
        },
      }
    }

    return {
      id: generateFileId(),
      fileId: file.id,
      content: mockContent,
      parsedAt: new Date(),
    }
  }

  // 处理预览
  const handlePreview = (file: FileInfo) => {
    setPreviewFile(file)
    setPreviewOpen(true)
  }

  // 处理文件选择
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
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

      // 显示错误信息
      if (errors.length > 0) {
        toast({
          title: "文件验证失败",
          description: errors.join("\n"),
          variant: "destructive",
        })
      }

      // 处理有效文件
      if (validFiles.length > 0) {
        setIsUploading(true)

        // 创建文件信息并添加到数据服务
        const fileInfos: FileInfo[] = validFiles.map((file) => ({
          id: generateFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadTime: new Date(),
          status: "uploading", // 先设为上传中状态
        }))

        // 添加到数据服务
        fileInfos.forEach((fileInfo) => {
          dataService.addFile(fileInfo)
        })

        // 更新本地状态
        setUploadedFiles((prev) => [...prev, ...fileInfos])

        // 文件上传和处理过程
        for (let i = 0; i < fileInfos.length; i++) {
          toast({
            title: "开始上传文件",
            description: `正在上传 ${i}/${validFiles.length} 文件，请稍候...`,
          })
          const file = validFiles[i]
          const formData = new FormData()
          formData.append("file", file)

          const fileInfo = fileInfos[i]

          // 真实上传
          try {
            // setUploading(true)
            // setResult(null)
            dataService.updateFile(fileInfo.id, { status: "processing" })
            const res = await axios.post(
              "http://localhost:8000/upload",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                  if (progressEvent.total) {
                    const percent = Math.round(
                      (progressEvent.loaded * 100) / progressEvent.total
                    )
                    console.log(percent)

                    // setResult(`正在上传：${percent}%`)
                  }
                },
              }
            )

            // 生成解析结果
            const parseResult = generateMockParseResult(fileInfo)
            // 更新文件状态并添加解析结果
            dataService.updateFile(fileInfo.id, {
              status: "judged",
              parseResult: parseResult,
            })

            // 更新本地状态
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === fileInfo.id
                  ? { ...f, status: "judged", parseResult: parseResult }
                  : f
              )
            )
          } catch (err: any) {
            toast({
              title: "上传失败",
              description: "文件上传过程中发生错误",
              variant: "destructive",
            })
            setIsUploading(false)
          }
          setIsUploading(false)
          toast({
            title: "文件上传完成",
            description: `成功处理 ${validFiles.length} 个文件`,
          })
        }
      }
    },
    [toast]
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
    [handleFiles]
  )

  // 文件输入处理
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  // 删除文件
  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
    dataService.deleteFile(fileId)
    toast({
      title: "文件已删除",
      description: "文件已从列表中移除",
    })
  }

  // 获取所有文件
  React.useEffect(() => {
    const updateFiles = () => {
      const allFiles = dataService.getAllFiles()
      setUploadedFiles(allFiles)
    }

    updateFiles()
    const interval = setInterval(updateFiles, 1000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "bg-green-500"
      case "processing":
        return "bg-blue-500"
      case "error":
        return "bg-red-500"
      case "uploading":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      uploading: "上传中",
      uploaded: "已上传",
      processing: "处理中",
      completed: "已完成",
      error: "错误",
    }
    return labels[status] || status
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

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">文件上传</TabsTrigger>
            <TabsTrigger value="manage">文件管理</TabsTrigger>
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
            </Card>

            {/* 上传进度 */}
            {isUploading && (
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  正在上传和处理文件，请稍候...
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            {/* 文件列表 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    文件列表 ({uploadedFiles.length})
                  </span>
                  {uploadedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedFiles([])
                        dataService.clearAll()
                        toast({
                          title: "已清空",
                          description: "所有文件已清空",
                        })
                      }}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      清空所有
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-4">
                    {uploadedFiles.map((file) => {
                      const processingStatus = dataService.getProcessingStatus(
                        file.id
                      )

                      return (
                        <div key={file.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {getFileIcon(file)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {file.name}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span>{formatFileSize(file.size)}</span>
                                  <Badge variant="outline">
                                    {getFileTypeLabel(file.type)}
                                  </Badge>
                                  <span>
                                    {new Date(file.uploadTime).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${getStatusColor(
                                    file.status
                                  )}`}
                                />
                                <span className="text-sm font-medium">
                                  {getStatusLabel(file.status)}
                                </span>
                              </div>

                              {/* 预览按钮 - 只有在文件处理完成时才显示 */}
                              {file.status === "judged" && file.parseResult && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePreview(file)}
                                  title="预览解析结果">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                                title="删除文件">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* 处理进度 */}
                          {file.status === "processing" && processingStatus && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>{processingStatus.message}</span>
                                <span>{processingStatus.progress}%</span>
                              </div>
                              <Progress
                                value={processingStatus.progress}
                                className="w-full"
                              />
                            </div>
                          )}

                          {/* 错误信息 */}
                          {file.status === "error" && file.errorMessage && (
                            <div className="mt-3">
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  {file.errorMessage}
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}

                          {/* 完成状态 */}
                          {file.status === "judged" && (
                            <div className="mt-3">
                              <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                  文件处理完成，可以查看分析结果
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      暂无上传的文件
                    </p>
                    <p className="text-sm text-gray-500">
                      请先上传文件进行处理
                    </p>
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
