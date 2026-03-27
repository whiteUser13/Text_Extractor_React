import apiClient from "./index"

// 下载任务信息
export interface DownloadTaskInfo {
  area_code: string
  file_name: string
  status: "pending" | "downloading" | "downloaded" | "error"
  created_at: string  // 修改为 string 类型，方便前端显示
  size: number  // 修改为 number 类型
  err_msg?: string  // 改为可选
  task_id?: string  // 添加可选的任务ID
}

// 上传文件信息
export interface UploadFileInfo {
  id: string
  origin_name: string
  size: number  // 修改为 number 类型
  type: string
  upload_time: string  // 修改为 string 类型
  status: string
  task_id: string
  user_id: string
}

// 通用响应接口
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  msg?: string
  error?: string
}

// 上传文件响应
export interface UploadResponse {
  success: boolean
  data?: UploadFileInfo
  msg?: string
}

// 任务列表响应
export interface TaskListResponse {
  success: boolean
  data: DownloadTaskInfo[]
  msg?: string
}

// 文件列表响应
export interface FileListResponse {
  success: boolean
  data: UploadFileInfo[]
  msg?: string
}

// 上传文件
export async function uploadFile(
  formData: FormData,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> {
  try {
    const res = await apiClient.post("/api/upload/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (!event.total) return
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress?.(percent)
      },
    })

    // 处理后端返回的数据格式
    if (res.status === 200) {
      // 假设后端返回 { success: true, data: {...}, msg: "..." } 或直接返回数据
      if (res.data.success !== undefined) {
        return {
          success: res.data.success,
          data: res.data.data,
          msg: res.data.msg || res.data.message,
        }
      } else {
        // 如果后端直接返回文件信息
        return {
          success: true,
          data: res.data,
          msg: "上传成功",
        }
      }
    } else {
      return {
        success: false,
        msg: res.data?.error || res.data?.msg || "上传失败",
      }
    }
  } catch (error: any) {
    console.error("上传文件错误:", error)
    return {
      success: false,
      msg: error.response?.data?.error || error.response?.data?.msg || error.message || "网络错误",
    }
  }
}

// 添加下载任务
export async function addDownloadTask(
  codes: string[],
  taskId: string
): Promise<TaskListResponse> {
  try {
    const res = await apiClient.post("/api/download/add_download_task", {
      area_codes: codes,
      task_id: taskId,
    })

    if (res.status === 200) {
      // 处理后端返回格式
      if (res.data.success !== undefined) {
        return {
          success: res.data.success,
          data: res.data.data || res.data.tasks || [],
          msg: res.data.msg || res.data.message,
        }
      } else {
        return {
          success: true,
          data: res.data.tasks || res.data.data || [],
          msg: res.data.message || "添加下载任务成功",
        }
      }
    } else {
      return {
        success: false,
        data: [],
        msg: res.data?.error || res.data?.msg || "添加下载任务失败",
      }
    }
  } catch (error: any) {
    console.error("添加下载任务错误:", error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || error.response?.data?.msg || error.message || "网络错误",
    }
  }
}

// 获取下载所有文件下载信息
export async function getDownloadTasksInfo(
  task_id: string
): Promise<TaskListResponse> {
  try {
    const res = await apiClient.get("/api/download/info", {
      params: {
        task_id: task_id,
      },
    })

    if (res.status === 200) {
      // 处理后端返回格式
      if (res.data.success !== undefined) {
        return {
          success: res.data.success,
          data: res.data.data || res.data.tasks || [],
          msg: res.data.msg || res.data.message,
        }
      } else {
        return {
          success: true,
          data: res.data.tasks || res.data.data || [],
          msg: res.data.message || "获取成功",
        }
      }
    } else {
      return {
        success: false,
        data: [],
        msg: res.data?.error || res.data?.msg || "获取下载任务信息失败",
      }
    }
  } catch (error: any) {
    console.error("获取下载任务信息错误:", error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || error.response?.data?.msg || error.message || "网络错误",
    }
  }
}

// 获取上传文件信息
export async function getUploadFileInfo(task_id: string): Promise<FileListResponse> {
  try {
    const res = await apiClient.get("/api/upload/get_info/by_id", {
      params: {
        task_id: task_id,
      },
    })

    if (res.status === 200) {
      // 处理后端返回格式
      if (res.data.success !== undefined) {
        return {
          success: res.data.success,
          data: res.data.data || res.data.files || [],
          msg: res.data.msg || res.data.message,
        }
      } else {
        return {
          success: true,
          data: res.data.files || res.data.data || [],
          msg: res.data.message || "获取成功",
        }
      }
    } else {
      return {
        success: false,
        data: [],
        msg: res.data?.error || res.data?.msg || "获取上传文件信息失败",
      }
    }
  } catch (error: any) {
    console.error("获取上传文件信息错误:", error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || error.response?.data?.msg || error.message || "网络错误",
    }
  }
}

// 重试下载错误文件
export async function retryErrorDownload(task_id: string): Promise<TaskListResponse> {
  try {
    const res = await apiClient.get("/api/download/retry/error", {
      params: {
        task_id: task_id,
      },
    })

    if (res.status === 200) {
      // 处理后端返回格式
      if (res.data.success !== undefined) {
        return {
          success: res.data.success,
          data: res.data.data || res.data.tasks || [],
          msg: res.data.msg || res.data.message,
        }
      } else {
        return {
          success: true,
          data: res.data.tasks || res.data.data || [],
          msg: res.data.message || "重试成功",
        }
      }
    } else {
      return {
        success: false,
        data: [],
        msg: res.data?.error || res.data?.msg || "重试下载失败",
      }
    }
  } catch (error: any) {
    console.error("重试下载错误:", error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.error || error.response?.data?.msg || error.message || "网络错误",
    }
  }
}

// 删除上传文件（新增）
export async function deleteUploadFile(
  task_id: string,
  file_id: string
): Promise<ApiResponse> {
  try {
    const res = await apiClient.delete("/api/upload/delete", {
      params: {
        task_id: task_id,
        file_id: file_id,
      },
    })

    if (res.status === 200) {
      if (res.data.success !== undefined) {
        return {
          success: res.data.success,
          msg: res.data.msg || res.data.message || "删除成功",
        }
      } else {
        return {
          success: true,
          msg: res.data.message || "删除成功",
        }
      }
    } else {
      return {
        success: false,
        msg: res.data?.error || res.data?.msg || "删除失败",
      }
    }
  } catch (error: any) {
    console.error("删除上传文件错误:", error)
    return {
      success: false,
      msg: error.response?.data?.error || error.response?.data?.msg || error.message || "网络错误",
    }
  }
}

// 批量删除上传文件（新增）
export async function batchDeleteUploadFile(
  task_id: string,
  file_ids: string[]
): Promise<ApiResponse> {
  try {
    const res = await apiClient.post("/api/upload/batch_delete", {
      task_id: task_id,
      file_ids: file_ids,
    })

    if (res.status === 200) {
      if (res.data.success !== undefined) {
        return {
          success: res.data.success,
          msg: res.data.msg || res.data.message || "批量删除成功",
        }
      } else {
        return {
          success: true,
          msg: res.data.message || "批量删除成功",
        }
      }
    } else {
      return {
        success: false,
        msg: res.data?.error || res.data?.msg || "批量删除失败",
      }
    }
  } catch (error: any) {
    console.error("批量删除上传文件错误:", error)
    return {
      success: false,
      msg: error.response?.data?.error || error.response?.data?.msg || error.message || "网络错误",
    }
  }
}