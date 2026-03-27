import apiClient from "./index"

// 解析任务信息
export interface ParseTaskInfo {
  parse_id: string
  file_name: string
  status: "pending" | "parsing" | "parsed" | "error"
  created_at: Date
  size: string
  msg: string
  task_id: string
  select_type: "mineru" | "pure_txt"
  used: string
}

interface TaskResult {
  success: boolean
  data: ParseTaskInfo[]
  msg: string
}

// 添加mineru解析任务
export async function addParseTask(
  fileNames: string[],
  taskId: string
): Promise<TaskResult> {
  try {
    const res = await apiClient.post("/api/parse/add/parse/task", {
      file_names: fileNames,
      task_id: taskId,
    })
    if (res.status === 200) {
      return { success: true, data: res.data.tasks, msg: res.data.message }
    } else {
      return { success: false, data: [], msg: res.data.error }
    }
  } catch (error: any) {
    console.log(error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || "网络错误",
    }
  }
}
// 添加纯文本解析任务
export async function addPureTXTParseTask(
  fileNames: string[],
  taskId: string
): Promise<TaskResult> {
  try {
    const res = await apiClient.post("/api/parse/add/pure_txt/task", {
      file_names: fileNames,
      task_id: taskId,
    })
    if (res.status === 200) {
      return { success: true, data: res.data.tasks, msg: res.data.message }
    } else {
      return { success: false, data: [], msg: res.data.error }
    }
  } catch (error: any) {
    console.log(error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || "网络错误",
    }
  }
}
// 获取解析任务信息
export async function getParseTasksInfo(task_id: string): Promise<TaskResult> {
  try {
    const res = await apiClient.get("/api/parse/info", {
      params: {
        task_id: task_id,
      },
    })
    if (res.status === 200) {
      return { success: true, data: res.data.tasks, msg: res.data.message }
    } else {
      return { success: false, data: [], msg: res.data.error }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || "网络错误",
    }
  }
}

// 重试解析错误文件
export async function retryErrorParse(task_id: string): Promise<TaskResult> {
  try {
    const res = await apiClient.get("/api/parse/retry/error", {
      params: {
        task_id: task_id,
      },
    })
    if (res.status === 200) {
      return { success: true, data: res.data.tasks, msg: res.data.message }
    } else {
      return { success: false, data: [], msg: res.data.error }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || "网络错误",
    }
  }
}
