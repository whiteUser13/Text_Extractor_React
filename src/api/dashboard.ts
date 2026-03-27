import apiClient from "./index"
import type { ExtractionRule, JudgmentRule, Task } from "@/types"

interface TaskResult {
  success: boolean
  data: Task[]
  msg: string
}
interface MessageResult {
  success: boolean
  msg: string
}

// 添加任务
export async function addTask(task: Task): Promise<TaskResult> {
  try {
    const res = await apiClient.post("/api/task/add_task", {
      task,
    })
    if (res.status === 200) {
      return { success: true, data: [res.data.task], msg: res.data.message }
    } else {
      return { success: false, data: [], msg: res.data.error }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.message || "网络错误",
    }
  }
}
// 获取任务列表
export async function getTaskList(): Promise<TaskResult> {
  try {
    const res = await apiClient.get("/api/task/info")
    if (res.status === 200) {
      return { success: true, data: res.data.tasks, msg: res.data.message }
    } else {
      return { success: false, data: [], msg: res.data.error }
    }
  } catch (error: any) {
    // 判断不同的错误状态码
    if (error.response?.status === 401) {
      return {
        success: false,
        data: [],
        msg: "用户未登录或登录已过期",
      }
    } else if (error.response?.status === 403) {
      return {
        success: false,
        data: [],
        msg: "权限不足，无法访问任务列表",
      }
    } else {
      return {
        success: false,
        data: [],
        msg: error.response?.data?.message || "网络错误",
      }
    }
  }
}
// 根据id删除任务
export async function deleteTaskByID(id: string): Promise<MessageResult> {
  try {
    const res = await apiClient.delete(`/api/task/delete/${id}`)
    if (res.status === 200) {
      console.log(res.data.tasks)

      return { success: true, msg: res.data.message }
    } else {
      return { success: false, msg: res.data.error }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.response?.data?.message || "网络错误",
    }
  }
}
// 根据id修改任务
export async function updateTaskByID(
  id: string,
  task: Task,
): Promise<TaskResult> {
  try {
    const res = await apiClient.put(`/api/task/update/${id}`, {
      task,
    })
    if (res.status === 200) {
      return { success: true, data: [res.data.task], msg: res.data.message }
    } else {
      return { success: false, data: [], msg: res.data.error }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.message || "网络错误",
    }
  }
}
