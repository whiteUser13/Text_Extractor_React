// src/api/folder.ts
import apiClient from "./index"

export interface FolderInfo {
  area_code: string
  folder_name: string
  origin_folder_name: string
  update_time: Date
  status: string
}

interface JudgeResult<T> {
  success: boolean
  data?: T
  error?: string
}

// 获取已提取的文件夹信息
export async function getExtractedFoldersInfo() {
  const res = await apiClient.get("/downloads/extracteds")
  return res.data.folders as FolderInfo[]
}
// 获取已经判断的文件夹信息
export async function getJudgedFoldersInfo() {
  const res = await apiClient.get("/results/judged/folders_info")
  return res.data.folders as FolderInfo[]
}
//判别请求
export async function requestAIAnalysis(
  folderName: string
): Promise<JudgeResult<FolderInfo>> {
  try {
    const res = await apiClient.post("/ai_analysis", {
      folder_name: folderName,
    })
    if (res.status === 200) {
      return { success: true, data: res.data.results_folder_info }
    } else {
      return { success: false, error: `状态码: ${res.status}` }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || "网络错误",
    }
  }
}
