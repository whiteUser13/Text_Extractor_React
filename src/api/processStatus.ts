import apiClient from "./index"
import { StatusReportData } from "@/types/processStatus"

// 定义后端返回的标准信封结构
interface ApiResponse<T> {
  code?: number
  msg?: string
  data: T
}

interface StatusReportResult {
  success: boolean
  data: StatusReportData | null
  msg: string
}

// 获取看板数据
// 1225:增加 status 可选参数，用于筛选 (对应后端 status_filter)
export async function getTaskStatusReport(
  taskId: string,
  page = 1,
  size = 50,
  status?: string
): Promise<StatusReportResult> {
  try {
    // URL 已修正，与后端对齐 ✅
    const res = await apiClient.get<
      ApiResponse<StatusReportData> | StatusReportData
    >(`/api/processStatus/task/${taskId}/processStatus`, {
      params: {
        page,
        size,
        status: status || undefined, // 如果为空则不传
      },
    })

    // 兼容处理：后端可能直接返回数据对象，也可能包裹在 { code: 0, data: {...} } 中
    // 假设后端直接返回的是 StatusReportData 结构（包含 summary 和 files）
    let responseData: StatusReportData

    // 判断逻辑：检查返回对象里是否有 'files' 字段，如果有，说明直接返回了数据
    if ("files" in res.data && "summary" in res.data) {
      responseData = res.data as StatusReportData
      return { success: true, data: responseData, msg: "获取成功" }
    }
    // 否则尝试解包标准结构
    else if ((res.data as any).code === 0 || (res.data as any).data) {
      responseData = (res.data as any).data
      return { success: true, data: responseData, msg: "获取成功" }
    }

    return { success: false, data: null, msg: "数据格式不符合预期" }
  } catch (error: any) {
    console.error("Fetch dashboard error:", error)
    return {
      success: false,
      data: null,
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}

// 导出失败记录
export async function exportFailures(taskId: string) {
  try {
    //  URL 已修正，与后端对齐
    const response = await apiClient.get(
      `/api/processStatus/task/${taskId}/export/failures`,
      {
        responseType: "blob", // 重要：处理文件流
      }
    )

    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement("a")
    link.href = url
    // [优化] 文件名加上时间戳，避免重名
    const timestamp = new Date().getTime()
    link.setAttribute("download", `task_${taskId}_failures_${timestamp}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return { success: true }
  } catch (error: any) {
    console.error("Export error:", error)
    return { success: false, msg: "导出失败" }
  }
}
