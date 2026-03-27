// api/statistics.ts
import apiClient from "./index"

// 统计数据类型定义
export interface ViolationTypeStat {
  type: string      // 违规类型名称
  count: number     // 违规数量
}

export interface FieldExtractionRate {
  field_name: string  // 字段名称
  rate: number       // 提取率（百分比）
  found_count?: number  // 实际有值的文件数（可选）
  total_files?: number  // 总文件数（可选）
}

export interface TaskStatistics {
  total_files: number           // 文件总数
  extracted_files: number       // 已提取数量
  judged_files: number         // 已判别数量
  reviewed_files: number       // 已核查数量
  violation_types: ViolationTypeStat[]     // 违规类型统计
  field_extraction_rate: FieldExtractionRate[]  // 字段提取率
}

export interface StatisticsResponse {
  success: boolean
  data: TaskStatistics
  msg: string
}

// 线索清单项接口
export interface ClueItem {
  id: string
  file_name: string
  violation_type: string
  field_name: string
  confidence: number
  created_at: string
}

export interface ClueListResponse {
  success: boolean
  data: {
    total: number
    items: ClueItem[]
  }
  msg: string
}

// 地域分布数据类型 - 修改后
export interface RegionDistribution {
  province: string      // 省份名称
  count: number        // 当前任务在该省份的文件数量
  illegal_count: number // 当前任务在该省份的违规文件数量
  legal_count: number  // 当前任务在该省份的合规文件数量
  is_current_task: boolean // 标记是否有当前任务的文件
}

export interface RegionDistributionResponse {
  success: boolean
  data: RegionDistribution[]
  msg: string
}

// 获取任务统计数据
export async function getTaskStatistics(task_id: string): Promise<StatisticsResponse> {
  try {
    console.log("正在请求统计数据, task_id:", task_id)
    
    const res = await apiClient.get("/api/airesult/statistics/overview", {
      params: {
        task_id: task_id
      }
    })
    
    console.log("getTaskStatistics 响应:", res)
    
    if (res.data?.code === 0) {
      return { 
        success: true, 
        data: res.data.data, 
        msg: "获取成功" 
      }
    } else {
      return {
        success: false,
        data: {
          total_files: 0,
          extracted_files: 0,
          judged_files: 0,
          reviewed_files: 0,
          violation_types: [],
          field_extraction_rate: []
        },
        msg: res.data?.msg || "获取失败"
      }
    }
  } catch (error: any) {
    console.error("获取统计数据失败:", error)
    console.error("错误详情:", {
      message: error.message,
      response: error.response,
      config: error.config
    })
    return {
      success: false,
      data: {
        total_files: 0,
        extracted_files: 0,
        judged_files: 0,
        reviewed_files: 0,
        violation_types: [],
        field_extraction_rate: []
      },
      msg: error.response?.data?.message || error.message || "网络错误"
    }
  }
}

// 获取违规类型统计
export async function getViolationTypeStats(task_id: string): Promise<{
  success: boolean
  data: ViolationTypeStat[]
  msg: string
}> {
  try {
    const res = await apiClient.get("/api/airesult/statistics/violation-types", {
      params: {
        task_id: task_id
      }
    })
    
    if (res.data?.code === 0) {
      return { 
        success: true, 
        data: res.data.data, 
        msg: "获取成功" 
      }
    } else {
      return { 
        success: false, 
        data: [], 
        msg: res.data?.msg || "获取失败" 
      }
    }
  } catch (error: any) {
    console.error("获取违规类型统计失败:", error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.message || "网络错误"
    }
  }
}

// 获取字段提取率统计
export async function getFieldExtractionRate(
  task_id: string
): Promise<{
  success: boolean
  data: FieldExtractionRate[]
  msg: string
}> {
  try {
    const res = await apiClient.get("/api/airesult/statistics/field-rate", {
      params: {
        task_id: task_id
      }
    })
    
    if (res.data?.code === 0) {
      return { 
        success: true, 
        data: res.data.data, 
        msg: "获取成功" 
      }
    } else {
      return { 
        success: false, 
        data: [], 
        msg: res.data?.msg || "获取失败" 
      }
    }
  } catch (error: any) {
    console.error("获取字段提取率失败:", error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.message || "网络错误"
    }
  }
}

// 获取线索清单列表
export async function getClueList(
  task_id: string, 
  page: number = 1, 
  pageSize: number = 10
): Promise<ClueListResponse> {
  try {
    const res = await apiClient.get("/api/airesult/statistics/clues", {
      params: {
        task_id: task_id,
        page: page,
        page_size: pageSize
      }
    })
    
    if (res.data?.code === 0) {
      return { 
        success: true, 
        data: res.data.data, 
        msg: "获取成功" 
      }
    } else {
      return {
        success: false,
        data: {
          total: 0,
          items: []
        },
        msg: res.data?.msg || "获取失败"
      }
    }
  } catch (error: any) {
    console.error("获取线索清单失败:", error)
    return {
      success: false,
      data: {
        total: 0,
        items: []
      },
      msg: error.response?.data?.message || "网络错误"
    }
  }
}

// 获取地域分布数据
export async function getRegionDistribution(task_id: string): Promise<RegionDistributionResponse> {
  try {
    const res = await apiClient.get("/api/airesult/statistics/region-distribution", {
      params: {
        task_id: task_id
      }
    })
    
    console.log("getRegionDistribution 响应:", res)
    
    if (res.data?.code === 0) {
      return { 
        success: true, 
        data: res.data.data, 
        msg: "获取成功" 
      }
    } else {
      return {
        success: false,
        data: [],
        msg: res.data?.msg || "获取失败"
      }
    }
  } catch (error: any) {
    console.error("获取地域分布失败:", error)
    return {
      success: false,
      data: [],
      msg: error.response?.data?.message || "网络错误"
    }
  }
}