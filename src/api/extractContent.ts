// src/api/folder.ts
import apiClient from "./index"

export interface FolderInfo {
  area_code: string
  folder_name: string
  origin_folder_name: string
  update_time: Date
  status: string
}

// 获取已提取的文件夹信息
export async function getExtractedFoldersInfo() {
  const res = await apiClient.get("/downloads/extracteds")
  return res.data.folders as FolderInfo[]
}
//提取请求处理
