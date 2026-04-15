// pages/TaskManagementPage.tsx
import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreateTaskDialog, TaskList } from "@/components/TaskManagement"
import { dataService } from "@/services/dataService"
import { getTaskList } from "@/api/dashboard"
import { useToast } from "@/hooks/use-toast"
import { useTaskStore } from "@/context/TaskContext"
import { useUserStore } from "@/context/userStore"
import { getTokenStore } from "@/utils/store"
import { validatenull } from "@/utils/validete"
import { redirectToOAuthLogin } from "@/api/auth"

const TaskManagementPage: React.FC = () => {
  const { sceneId } = useParams<{ sceneId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [tasksRefreshKey, setTasksRefreshKey] = useState(0)
  const [isOpenCreateTaskDialog, setIsOpenCreateTaskDialog] = useState(false)
  const [scene, setScene] = useState<any>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { setSelectedTaskId, setSelectedTask } = useTaskStore()
  const initialized = useUserStore((s) => s.initialized)

  // 检查登录状态
  const checkAuth = () => {
    const accessToken = getTokenStore({ name: "access_token" })

    if (validatenull(accessToken)) {
      redirectToOAuthLogin()
      return false
    }
    return true
  }

  useEffect(() => {
    if (initialized) {
      const isAuthed = checkAuth()
      if (isAuthed) {
        setIsCheckingAuth(false)
        loadData()
      }
    }
  }, [initialized, sceneId])

  const loadData = () => {
    // 加载场景信息
    const scenes = dataService.getAllScenes()
    const currentScene = scenes.find((s) => s.id === sceneId)
    if (currentScene) {
      setScene(currentScene)
    } else if (!validatenull(sceneId)) {
      toast({
        title: "场景不存在",
        description: "该场景可能已被删除",
        variant: "destructive",
      })
      navigate("/")
      return
    }

    // 加载任务列表
    const loadTasks = async () => {
      try {
        const result = await getTaskList()
        if (result.success) {
          dataService.clearAll()
          const localTasksId = dataService.getAllTasksId()
          const backendTasks: string[] = []

          result.data.forEach((task: any) => {
            const newTask = {
              id: task.id,
              sceneId: task.sceneId || "default",
              sceneName: task.sceneName || undefined,
              share: task.share,
              name: task.name,
              group_name: task.group_name,
              province: task.province || "",
              description: task.description,
              extractionRules: task.extractionRules,
              judgmentRules: task.judgmentRules,
              createdAt: task.createdAt,
              enabled: true,
            }
            dataService.addTask(newTask)
            backendTasks.push(task.id)
          })

          const difference = localTasksId.filter(
            (id) => !backendTasks.includes(id),
          )
          difference.forEach((id) => dataService.deleteTask(id))
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
  }

  const handleTaskCreated = () => {
    setTasksRefreshKey((prev) => prev + 1)
  }

  // 加载中状态
  if (isCheckingAuth || !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证登录状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/")}>
            返回场景
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {!validatenull(scene?.name) ? scene.name : "任务管理"}
            </h1>
            <p className="text-gray-600">
              {!validatenull(scene?.description) ? scene.description : ""}
            </p>
          </div>
        </div>

        <Card className="bg-white shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>任务管理中心</CardTitle>
                <CardDescription>
                  创建和管理审核任务，配置提取规则和判别规则
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsOpenCreateTaskDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600">
                新建任务
              </Button>
              <CreateTaskDialog
                isOpen={isOpenCreateTaskDialog}
                onOpenChange={setIsOpenCreateTaskDialog}
                onTaskCreated={handleTaskCreated}
                type="create"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px]">
              <TaskList
                key={tasksRefreshKey}
                onTasksChange={handleTaskCreated}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TaskManagementPage
