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
import { Trash2, Eye, Calendar, FileText, Edit, Plus } from "lucide-react"
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
import { deleteTaskByID } from "@/api/dashboard"
import { useTaskStore } from "@/context/TaskContext"
interface TaskListProps {
  onTasksChange?: () => void
}

const TaskList: React.FC<TaskListProps> = ({ onTasksChange }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task>({
    id: "",
    name: "",
    share: false,
    description: "",
    extractionRules: [],
    judgmentRules: [],
    createdAt: new Date(),
    enabled: true,
  })
  const { toast } = useToast()
  const [isOpenUpdateTaskDialog, setIsOpenUpdateTaskDialog] = useState(false)
  const [isOpenCreateTaskDialog, setIsOpenCreateTaskDialog] = useState(false)

  const { selectedTaskId } = useTaskStore()
  useEffect(() => {
    loadTasks()
  }, [isOpenUpdateTaskDialog, selectedTask, isOpenCreateTaskDialog])

  const loadTasks = () => {
    try {
      const allTasks = dataService.getAllTasks()
      setTasks(allTasks)
      console.log("loadTasks", allTasks)
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
    if (group == "env_department") {
      return "环境部"
    } else if (group == "soil_department") {
      return "土壤司"
    } else {
      return "未知"
    }
  }

  // 安全的规则渲染函数
  // const renderExtractionRules = (rules: any[]) => {
  //   const safeRules = rules || []

  //   if (safeRules.length === 0) {
  //     return (
  //       <div className="text-center py-4 text-gray-500 text-sm">
  //         暂无提取规则
  //       </div>
  //     )
  //   }

  //   return safeRules.map((rule, index) => {
  //     const safeRule = {
  //       id: rule.id || `rule-${index}`,
  //       name: rule.name || "未命名规则",
  //       description: rule.description || "",
  //       prompt: rule.prompt || "", // 添加提示词字段
  //       keywords: Array.isArray(rule.keywords) ? rule.keywords : [],
  //       sections: Array.isArray(rule.sections) ? rule.sections : [],
  //       pageRange: rule.pageRange || {},
  //     }

  //     return (
  //       <Card key={safeRule.id} className="border-2">
  //         <CardHeader className="pb-3">
  //           <CardTitle className="text-sm">
  //             {index + 1}. {safeRule.name}
  //           </CardTitle>
  //           {safeRule.description && (
  //             <CardDescription className="text-xs">
  //               {safeRule.description}
  //             </CardDescription>
  //           )}
  //         </CardHeader>
  //         <CardContent className="space-y-2 text-sm">
  //           {/* 显示提示词 */}
  //           {safeRule.prompt && (
  //             <div>
  //               <span className="text-gray-600 font-medium">提示词: </span>
  //               <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
  //                 {safeRule.prompt}
  //               </div>
  //             </div>
  //           )}
  //           {safeRule.keywords.length > 0 && (
  //             <div>
  //               <span className="text-gray-600">关键词: </span>
  //               <div className="flex flex-wrap gap-1 mt-1">
  //                 {safeRule.keywords.map((keyword, i) => (
  //                   <Badge key={i} variant="secondary" className="text-xs">
  //                     {keyword}
  //                   </Badge>
  //                 ))}
  //               </div>
  //             </div>
  //           )}
  //           {safeRule.sections.length > 0 && (
  //             <div>
  //               <span className="text-gray-600">目标章节: </span>
  //               <div className="flex flex-wrap gap-1 mt-1">
  //                 {safeRule.sections.map((section, i) => (
  //                   <Badge key={i} variant="outline" className="text-xs">
  //                     {section}
  //                   </Badge>
  //                 ))}
  //               </div>
  //             </div>
  //           )}
  //           {(safeRule.pageRange?.start || safeRule.pageRange?.end) && (
  //             <div>
  //               <span className="text-gray-600">页码范围: </span>
  //               <span>
  //                 {safeRule.pageRange.start || "开始"} -{" "}
  //                 {safeRule.pageRange.end || "结束"}
  //               </span>
  //             </div>
  //           )}
  //         </CardContent>
  //       </Card>
  //     )
  //   })
  // }

  // 安全的判别规则渲染函数
  // const renderJudgmentRules = (rules: any[]) => {
  //   const safeRules = rules || []

  //   if (safeRules.length === 0) {
  //     return (
  //       <div className="text-center py-4 text-gray-500 text-sm">
  //         暂无判别规则
  //       </div>
  //     )
  //   }

  //   return safeRules.map((rule, index) => {
  //     const safeRule = {
  //       id: rule.id || `judgment-${index}`,
  //       name: rule.name || "未命名判别规则",
  //       description: rule.description || "",
  //       prompt: rule.prompt || "", // 添加提示词字段
  //       type: rule.type || "compliance",
  //       conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
  //       actions: Array.isArray(rule.actions) ? rule.actions : [],
  //     }

  //     return (
  //       <Card key={safeRule.id} className="border-2">
  //         <CardHeader className="pb-3">
  //           <div className="flex items-start justify-between">
  //             <div>
  //               <CardTitle className="text-sm">
  //                 {index + 1}. {safeRule.name}
  //               </CardTitle>
  //               {safeRule.description && (
  //                 <CardDescription className="text-xs">
  //                   {safeRule.description}
  //                 </CardDescription>
  //               )}
  //             </div>
  //             <Badge variant="outline">{getTypeLabel(safeRule.type)}</Badge>
  //           </div>
  //         </CardHeader>
  //         <CardContent className="space-y-2 text-sm">
  //           {/* 显示提示词 */}
  //           {safeRule.prompt && (
  //             <div>
  //               <span className="text-gray-600 font-medium">提示词: </span>
  //               <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs">
  //                 {safeRule.prompt}
  //               </div>
  //             </div>
  //           )}
  //           {safeRule.conditions.length > 0 && (
  //             <div>
  //               <span className="text-gray-600">判别条件:</span>
  //               <div className="mt-1 space-y-1">
  //                 {safeRule.conditions.map((condition, i) => {
  //                   const safeCondition = {
  //                     field: condition.field || "未知字段",
  //                     operator: condition.operator || "=",
  //                     value: condition.value || "未知值",
  //                   }
  //                   return (
  //                     <div key={i} className="text-xs bg-gray-50 p-2 rounded">
  //                       {safeCondition.field} {safeCondition.operator}{" "}
  //                       {safeCondition.value}
  //                     </div>
  //                   )
  //                 })}
  //               </div>
  //             </div>
  //           )}
  //           {safeRule.actions.length > 0 && (
  //             <div>
  //               <span className="text-gray-600">判别动作:</span>
  //               <div className="flex flex-wrap gap-1 mt-1">
  //                 {safeRule.actions.map((action, i) => {
  //                   const safeAction = {
  //                     type: action.type || "未知类型",
  //                     value: action.value || "未知值",
  //                   }
  //                   return (
  //                     <Badge key={i} variant="secondary" className="text-xs">
  //                       {safeAction.type}: {safeAction.value}
  //                     </Badge>
  //                   )
  //                 })}
  //               </div>
  //             </div>
  //           )}
  //         </CardContent>
  //       </Card>
  //     )
  //   })
  // }

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
                  <TableHead>任务名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>规则数量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>用户组</TableHead>
                  <TableHead>共享</TableHead>

                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
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
                      {task.group_name}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CreateTaskDialog
          isOpen={isOpenUpdateTaskDialog}
          onOpenChange={setIsOpenUpdateTaskDialog}
          selectedTask={selectedTask}
          type="update"
        />
        <CreateTaskDialog
          isOpen={isOpenCreateTaskDialog}
          onOpenChange={setIsOpenCreateTaskDialog}
          selectedTask={selectedTask}
          type="create"
        />
      </Card>
    </div>
  )
}

export default TaskList
