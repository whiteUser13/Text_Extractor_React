import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  CheckCircle,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Briefcase,
} from "lucide-react"
import { CreateTaskDialog, TaskList } from "@/components/TaskManagement"
import { dataService } from "@/services/dataService"
import { initializeDemoData } from "@/services/demoData"
import type {
  ReportStats,
  ProcessingStage,
  Task,
  ExtractionRule,
  JudgmentRule,
} from "@/types"
import { getTaskList } from "@/api/dashboard"
import { useToast } from "@/hooks/use-toast"
import { useTaskStore } from "@/context/TaskContext"

const Dashboard: React.FC = () => {
  const { toast } = useToast()
  const { sceneId } = useParams<{ sceneId: string }>()
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(true) // 模拟管理员权限
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [sceneName, setSceneName] = useState<string>("")

  const [isOpenCreateTaskDialog, setIsOpenCreateTaskDialog] = useState(false)
  
  const { selectedTaskId, setSelectedTaskId, selectedTask, setSelectedTask } =
    useTaskStore()

  useEffect(() => {
    if (!sceneId) {
      toast({
        title: "场景未指定",
        description: "请从首页选择一个场景后进入任务管理",
        variant: "destructive",
      })
      navigate("/")
      return
    }

    const scene = dataService.getScene(sceneId)
    if (scene) {
      setSceneName(scene.name)
      localStorage.setItem("current_scene_id", sceneId)
      localStorage.setItem("current_scene_name", scene.name)
    }

    console.log(selectedTaskId, selectedTask)
    // 获取任务列表
    const loadTasks = async () => {
      try {
        const result = await getTaskList()
        if (result.success) {
          dataService.clearAll() //解决别人修改任务后获取不一致的问题
          const localTasksId = dataService.getAllTasksId()
          const backendTasks: string[] = []
          result.data.forEach((task: any) => {
            // 创建任务
            const newTask = {
              id: task.id,
              sceneId: task.sceneId || "default",
              sceneName: task.sceneName || undefined,
              share: task.share,
              name: task.name,
              group_name: task.group_name,
              province: task.province || "", // 0317修改：接收后端返回的任务所属省份
              description: task.description,
              extractionRules: task.extractionRules,
              judgmentRules: task.judgmentRules,
              createdAt: task.createdAt,
              enabled: true,
            } as Task
            dataService.addTask(newTask)
            backendTasks.push(task.id)
          })
          const difference = localTasksId.filter(
            (item) => !backendTasks.includes(item),
          )
          difference.forEach((id) => {
            dataService.deleteTask(id)
          })
          toast({
            title: "获取任务成功",
          })
        } else {
          toast({
            title: "获取任务失败",
            description: result.msg,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("获取任务列表失败:", error)
      }
    }
    loadTasks()
    console.log("加载任务")
  }, [sceneId])

  const handleTaskCreated = () => {
    setTasksRefreshKey((prev) => prev + 1)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}

        {/* 任务管理标签页 */}
        <CardContent className="space-y-6">
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
                  <Button
                    onClick={() => setIsOpenCreateTaskDialog(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    新建任务
                  </Button>
                  <CreateTaskDialog
                    isOpen={isOpenCreateTaskDialog}
                    onOpenChange={setIsOpenCreateTaskDialog}
                    onTaskCreated={handleTaskCreated}
                    type="create"
                    sceneId={sceneId}
                    sceneName={sceneName}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[200px]">
                  <TaskList
                    key={tasksRefreshKey}
                    onTasksChange={handleTaskCreated}
                    sceneId={sceneId}
                    sceneName={sceneName}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </div>
    </div>
  )
}

export default Dashboard
