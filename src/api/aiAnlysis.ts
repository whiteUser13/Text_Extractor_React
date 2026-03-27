// src/api/aiAnlysis.ts
import apiClient from "./index"

export interface FolderInfo {
  area_code: string
  folder_name: string
  origin_folder_name: string
  update_time: Date
  status: string
}

export interface JsonFileInfo {
  id: string
  filename: string
  origin_name: string
  size_kb: number
  upload_time: string
  full_path: string
}

interface JudgeResult<T> {
  success: boolean
  data?: T
  error?: string
}

// 获取已提取的文件夹信息 - 修正接口路径
export async function getExtractedFoldersInfo() {
  const res = await apiClient.get("/filter_pdf/extracted/folders_info")
  return res.data.folders as FolderInfo[]
}

// 获取已经判断的文件夹信息
export async function getJudgedFoldersInfo() {
  const res = await apiClient.get("/results/judged/folders_info")
  return res.data.folders as FolderInfo[]
}

// 获取 filter_pdf 文件夹中的 JSON 文件 - 移除参数
export async function getFilterPdfJsonFiles() {
  const res = await apiClient.get("/filter_pdf/json_files")
  return res.data.json_files as JsonFileInfo[]
}

// 判别请求
export async function requestAIAnalysis(
  folderName: string,
  jsonFileName: string = "",
  rulesDescription: string = "",
): Promise<JudgeResult<FolderInfo>> {
  try {
    const res = await apiClient.post("/ai_validator_analysis", {
      folder_name: folderName,
      json_filename: jsonFileName,
      rules_description: rulesDescription,
    })
    if (res.status === 200) {
      return { success: true, data: res.data }
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
