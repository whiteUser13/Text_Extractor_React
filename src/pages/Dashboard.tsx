import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Upload,
  Search,
  Settings,
  BarChart3,
  RefreshCw,
  Briefcase,
} from "lucide-react"
import {
  CreateTaskDialog,
  TaskSelector,
  TaskList,
} from "@/components/TaskManagement"
import { Link } from "react-router-dom"
import { dataService } from "@/services/dataService"
import { initializeDemoData, clearDemoData } from "@/services/demoData"
import type { ReportStats, ProcessingStage, Task } from "@/types"

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ReportStats>({
    totalFiles: 0,
    processedFiles: 0,
    errorFiles: 0,
    processingFiles: 0,
    stageStats: {} as Record<ProcessingStage, number>,
    errorStats: {},
  })

  const [recentFiles, setRecentFiles] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(true) // 模拟管理员权限
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0)

  useEffect(() => {
    const updateStats = () => {
      const currentStats = dataService.getReportStats()
      setStats(currentStats)

      const files = dataService.getAllFiles().slice(0, 5)
      setRecentFiles(files)
    }

    // 初始化演示数据（如果没有数据的话）
    const load = async () => {
      await initializeDemoData()
    }
    load()
    // if (dataService.getAllFiles().length === 0) {
    //   initializeDemoData().then(() => console.log("初始化完成"))
    // }

    updateStats()
    const interval = setInterval(updateStats, 2000)
    return () => clearInterval(interval)
  }, [])

  const getStageLabel = (stage: ProcessingStage): string => {
    const labels: Record<ProcessingStage, string> = {
      upload: "上传",
      convert: "转换",
      parse: "解析",
      extract: "提取",
      analyze: "判别",
      completed: "完成",
    }
    return labels[stage] || stage
  }

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
  const handleTaskCreated = () => {
    setTasksRefreshKey((prev) => prev + 1)
  }

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            报告文件智能化审核系统
          </h1>
          <p className="text-lg text-gray-600">
            智能化报告审核平台，支持多格式文件处理、OCR识别、内容分析和自定义规则判别
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总文件数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">已下载的报告文件</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.processedFiles}
              </div>
              <p className="text-xs text-muted-foreground">处理完成的文件</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">错误文件</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.errorFiles}
              </div>
              <p className="text-xs text-muted-foreground">处理失败的文件</p>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tasks">任务管理</TabsTrigger>
            <TabsTrigger value="overview">系统概览</TabsTrigger>
            <TabsTrigger value="errors">错误统计</TabsTrigger>
            <TabsTrigger value="recent">最近文件</TabsTrigger>
          </TabsList>

          {/* 任务管理标签页 */}
          <TabsContent value="tasks" className="space-y-6">
            {/* 管理员视图 - 新建任务和任务列表 */}
            {isAdmin && (
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        任务管理中心
                      </CardTitle>
                      <CardDescription>
                        创建和管理审核任务，配置提取规则和判别规则
                      </CardDescription>
                    </div>
                    <CreateTaskDialog onTaskCreated={handleTaskCreated} />
                  </div>
                </CardHeader>
                <CardContent>
                  <TaskList
                    key={tasksRefreshKey}
                    onTasksChange={handleTaskCreated}
                  />
                </CardContent>
              </Card>
            )}

            {/* 用户视图 - 选择任务 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  选择审核任务
                </CardTitle>
                <CardDescription>
                  选择一个任务来处理您的报告文件，系统将自动应用该任务的提取和判别规则
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaskSelector
                  key={tasksRefreshKey}
                  selectedTaskId={selectedTask?.id}
                  onTaskSelect={handleTaskSelect}
                />

                {selectedTask && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          已选择任务: {selectedTask.name}
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          {selectedTask.description ||
                            "该任务将应用预设的提取和判别规则"}
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {selectedTask.extractionRules.length} 条提取规则
                          </Badge>
                          <Badge variant="secondary">
                            {selectedTask.judgmentRules.length} 条判别规则
                          </Badge>
                        </div>
                        <div className="mt-4">
                          <Link to="/upload">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Upload className="h-4 w-4 mr-2" />
                              上传文件并开始处理
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 处理阶段统计 */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    处理阶段分布
                  </CardTitle>
                  <CardDescription>各处理阶段的文件数量分布</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(stats.stageStats).map(([stage, count]) => (
                    <div
                      key={stage}
                      className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {getStageLabel(stage as ProcessingStage)}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                stats.totalFiles > 0
                                  ? (count / stats.totalFiles) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 快速操作 */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    快速操作
                  </CardTitle>
                  <CardDescription>常用功能快速入口</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link to="/upload">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <Upload className="h-8 w-8 text-blue-600 mb-2" />
                        <span className="text-sm font-medium">上传文件</span>
                      </button>
                    </Link>
                    <Link to="/decompression">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <FileText className="h-8 w-8 text-indigo-600 mb-2" />
                        <span className="text-sm font-medium">解压缩处理</span>
                      </button>
                    </Link>
                    <Link to="/extraction">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <Search className="h-8 w-8 text-green-600 mb-2" />
                        <span className="text-sm font-medium">内容提取</span>
                      </button>
                    </Link>
                    <Link to="/analysis">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <Settings className="h-8 w-8 text-purple-600 mb-2" />
                        <span className="text-sm font-medium">智能判别</span>
                      </button>
                    </Link>
                    <Link to="/results">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <BarChart3 className="h-8 w-8 text-emerald-600 mb-2" />
                        <span className="text-sm font-medium">成果表格</span>
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>错误统计分析</CardTitle>
                <CardDescription>
                  处理过程中遇到的错误类型和频次
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.errorStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.errorStats).map(([error, count]) => (
                      <div
                        key={error}
                        className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <span className="font-medium">{error}</span>
                        </div>
                        <Badge variant="destructive">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无错误记录
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>最近处理的文件</CardTitle>
                <CardDescription>最近上传和处理的文件列表</CardDescription>
              </CardHeader>
              <CardContent>
                {recentFiles.length > 0 ? (
                  <div className="space-y-4">
                    {recentFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(file.uploadTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无文件记录
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Dashboard
