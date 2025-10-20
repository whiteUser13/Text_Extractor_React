// src/api/folder.ts
import apiClient from "./index"

export interface Files {
  name: string
  download_url: string
}
// 动态获取文件夹中的文件，folderName为filter_pdf或results
export async function getFolderFilesInfo(folderName: string, areaCode: string) {
  const url = `/get_folder_info/${encodeURIComponent(
    folderName
  )}/${encodeURIComponent(areaCode)}`
  const res = await apiClient.get(url)
  let files: Files[] = []
  res.data.files.forEach((filename: string) => {
    files.push({
      name: filename,
      download_url:
        apiClient.defaults.baseURL +
        `/documents/${folderName}/${areaCode}/${filename}`,
    })
  })
  return files as Files[]
}
