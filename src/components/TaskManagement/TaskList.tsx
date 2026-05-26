import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Trash2, Eye, Calendar, FileText, Edit, Plus, Download } from "lucide-react"
import type { Task } from "@/types"
import { dataService } from "@/services/dataService"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CreateTaskDialog } from "@/components/TaskManagement"
import { deleteDeletedTaskFiles, deleteTaskByID, getDeletedTaskList } from "@/api/dashboard"
import { useTaskStore } from "@/context/TaskContext"
import { getTokenStore } from "@/utils/store"

interface TaskListProps {
  onTasksChange?: () => void
  sceneId?: string
  sceneName?: string
  isDeletedTasks?: boolean
}

// 扩展Task接口以支持已删除任务的downloadUrl
interface ExtendedTask extends Task {
  downloadUrl?: string;
}

const TaskList: React.FC<TaskListProps> = ({ onTasksChange, sceneId, sceneName, isDeletedTasks = false }) => {
  const [tasks, setTasks] = useState<ExtendedTask[]>([])
  const [selectedTask, setSelectedTask] = useState<Task>({
    id: "",
    name: "",
    share: false,
    description: "",
    extractionRules: [],
    judgmentRules: [],
    createdAt: new Date(),
    enabled: true,
    taskType: "parcel"
  })
  const { toast } = useToast()
  const [isOpenUpdateTaskDialog, setIsOpenUpdateTaskDialog] = useState(false)
  const [isOpenCreateTaskDialog, setIsOpenCreateTaskDialog] = useState(false)

  const { selectedTaskId } = useTaskStore()
  
  useEffect(() => {
    loadTasks()
  }, [isOpenUpdateTaskDialog, selectedTask, isOpenCreateTaskDialog, sceneId, isDeletedTasks])

  const loadTasks = () => {
    try {
      if (isDeletedTasks) {
        // 对于已删除任务，调用 API 获取数据
        getDeletedTaskList(sceneId).then((result) => {
          if (result.success) {
            setTasks(result.data as ExtendedTask[]);
          } else {
            setTasks([])
            toast({
              title: "错误",
              description: "加载已删除任务列表失败: " + result.msg,
              variant: "destructive",
            })
          }
        }).catch((error) => {
          console.error("加载已删除任务失败:", error)
          setTasks([])
          toast({
            title: "错误",
            description: "加载已删除任务列表失败",
            variant: "destructive",
          })
        })
      } else {
        const filteredTasks = sceneId
          ? dataService.getTasksByScene(sceneId)
          : dataService.getAllTasks()
        setTasks(filteredTasks)
        console.log("loadTasks", filteredTasks)
      }
    } catch (error) {
      console.error("加载任务失败:", error)
      setTasks([])
      toast({
        title: "错误",
        description: "加载任务列表失败",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTask = (taskId: string) => {
    if (selectedTaskId === taskId) {
      toast({
        title: "删除任务失败",
        description: "不能删除已选中任务",
        variant: "destructive",
      })
    } else {
      // Check whether task has result files. If none, remove from UI immediately
      // and let backend continue its cleanup asynchronously.
      import("@/api/statistics").then(({ getTaskStatistics }) => {
        getTaskStatistics(taskId).then((stat) => {
          try {
            const hasFiles = stat.success && stat.data && stat.data.total_files > 0

            if (!hasFiles) {
              // Optimistically remove from local store and UI
              dataService.deleteTask(taskId)
              setTasks((prev) => prev.filter((t) => t.id !== taskId))
              if (onTasksChange) onTasksChange()
              toast({ title: "成功", description: "任务已删除" })

              // Fire-and-forget backend delete
              deleteTaskByID(taskId).then((result) => {
                if (!result.success) {
                  toast({
                    title: "后台删除失败",
                    description: result.msg,
                    variant: "destructive",
                  })
                }
              }).catch((err) => {
                console.error("删除任务接口出错:", err)
              })
            } else {
              // Task has result files, perform normal delete flow (wait for server)
              deleteTaskByID(taskId).then((result) => {
                if (result.success) {
                  dataService.deleteTask(taskId)
                  loadTasks()
                  if (onTasksChange) {
                    onTasksChange()
                  }
                  toast({
                    title: "成功",
                    description: "任务已删除",
                  })
                } else {
                  toast({
                    title: "删除任务失败",
                    description: result.msg,
                    variant: "destructive",
                  })
                }
              }).catch((err) => {
                console.error("删除任务接口出错:", err)
                toast({
                  title: "删除任务失败",
                  description: "网络或服务器错误",
                  variant: "destructive",
                })
              })
            }
          } catch (error) {
            console.error("检查任务文件数出错:", error)
            // Fallback to normal delete if stats check fails
            deleteTaskByID(taskId).then((result) => {
              if (result.success) {
                dataService.deleteTask(taskId)
                loadTasks()
                if (onTasksChange) {
                  onTasksChange()
                }
                toast({
                  title: "成功",
                  description: "任务已删除",
                })
              } else {
                toast({
                  title: "删除任务失败",
                  description: result.msg,
                  variant: "destructive",
                })
              }
            }).catch((err) => {
              console.error("删除任务接口出错:", err)
              toast({
                title: "删除任务失败",
                description: "网络或服务器错误",
                variant: "destructive",
              })
            })
          }
        }).catch((err) => {
          console.error("获取统计信息失败:", err)
          // If we can't get stats, fallback to default delete behavior
          deleteTaskByID(taskId).then((result) => {
            if (result.success) {
              dataService.deleteTask(taskId)
              loadTasks()
              if (onTasksChange) {
                onTasksChange()
              }
              toast({
                title: "成功",
                description: "任务已删除",
              })
            } else {
              toast({
                title: "删除任务失败",
                description: result.msg,
                variant: "destructive",
              })
            }
          }).catch((err2) => {
            console.error("删除任务接口出错:", err2)
            toast({
              title: "删除任务失败",
              description: "网络或服务器错误",
              variant: "destructive",
            })
          })
        })
      })
    }
  }
  const handleUpdateClick = (task: Task) => {
    setSelectedTask(task)
    setIsOpenUpdateTaskDialog(true)
  }
  const handlePlusClick = (task: Task) => {
    setSelectedTask(task)
    setIsOpenCreateTaskDialog(true)
  }

  const formatDate = (date: Date) => {
    try {
      return new Date(date).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "日期格式错误"
    }
  }
  const getGroupName = (group: string) => {
    if (!group) {
      return "未知"
    }
    
    // 处理标准代码值
    if (group === "env_department") {
      return "环境部"
    } else if (group === "soil_department") {
      return "土壤司"
    }
    
    // 处理实际部门名称及其简称
    if (group.includes("环境") || group.includes("生态")) {
      return "环境部"
    } else if (group.includes("土壤")) {
      return "土壤司"
    }
    
    // 如果是未知值，返回实际的部门名称而不是"未知"
    return group
  }

  const handleDownloadClick = async (downloadUrl: string, taskName: string) => {
    if (!downloadUrl) {
      toast({
        title: "错误",
        description: "没有找到可下载的文件",
        variant: "destructive",
      });
      return;
    }

    try {
      // 获取认证token
      const token = getTokenStore({ name: "access_token" });
      
      if (!token) {
        toast({
          title: "错误",
          description: "认证令牌缺失，请重新登录",
          variant: "destructive",
        });
        return;
      }

      // 使用fetch API发起带认证的请求
      const response = await fetch(`${window.location.origin}${downloadUrl}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`);
      }

      // 获取文件blob
      const blob = await response.blob();
      
      // 创建下载链接
      const downloadUrlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrlBlob;
      // 使用任务名称作为下载文件名
      link.download = `${taskName}_report.xlsx`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrlBlob);
    } catch (error: any) {
      console.error("下载失败:", error);
      toast({
        title: "下载失败",
        description: error.message || "下载过程中发生错误",
        variant: "destructive",
      });
    }
  }

  const handleDeleteDeletedTaskFiles = async (
    sceneTask: string,
    taskId?: string,
  ) => {
    try {
      const result = await deleteDeletedTaskFiles(sceneTask)
      if (result.success) {
        toast({ title: "已删除", description: "结果文件已永久删除" })
        if (taskId) {
          setTasks((prev) => prev.filter((task) => task.id !== taskId))
        } else {
          loadTasks()
        }
      } else {
        toast({ title: "删除失败", description: result.msg, variant: "destructive" })
      }
    } catch (error) {
      console.error("永久删除已删除任务结果文件失败:", error)
      toast({ title: "删除失败", description: "网络或服务器错误", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>任务管理</CardTitle>
          <CardDescription>
            管理所有审核任务，包括启用、禁用和删除操作
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">暂无任务</p>
              <p className="text-sm">点击"新建任务"按钮创建第一个审核任务</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isDeletedTasks ? (
                    <>
                      <TableHead>任务名称</TableHead>
                      <TableHead>任务ID</TableHead>
                      <TableHead>用户组</TableHead>
                      <TableHead>共享</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>任务名称</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>规则数量</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>用户组</TableHead>
                      <TableHead>共享</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    {isDeletedTasks ? (
                      <>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell>{task.id}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {getGroupName(task.group_name ?? "unknown")}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {task.share ? "共享" : "个人"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {task.downloadUrl ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadClick(task.downloadUrl!, task.name)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-sm text-gray-500">无文件</span>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认永久删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    是否确认永久删除已删除任务 "{task.name}" 的结果文件？
                                    删除后无法恢复。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteDeletedTaskFiles(task.sceneId + "_" + task.id, task.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{task.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {task.description || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              提取: {task.extractionRules.length}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              判别: {task.judgmentRules.length}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(task.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {getGroupName(task.group_name ?? "unknown")}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {task.share ? "共享" : "个人"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlusClick(task)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateClick(task)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    确定要删除任务 "{task.name}"
                                    吗？此操作无法撤销。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="bg-red-600 hover:bg-red-700">
                                    删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {!isDeletedTasks && (
          <>
            <CreateTaskDialog
              isOpen={isOpenUpdateTaskDialog}
              onOpenChange={setIsOpenUpdateTaskDialog}
              selectedTask={selectedTask}
              type="update"
              sceneId={sceneId}
            />
            <CreateTaskDialog
              isOpen={isOpenCreateTaskDialog}
              onOpenChange={setIsOpenCreateTaskDialog}
              selectedTask={selectedTask}
              type="create"
              sceneId={sceneId}
              sceneName={sceneName}
            />
          </>
        )}
      </Card>
    </div>
  )
}

export default TaskList