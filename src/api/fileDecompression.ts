import apiClient from "./index"
const baseURL = apiClient.defaults.baseURL || ""
const api = {
  // getUnDecompressFile: baseURL + "/files_info/zip",
  // zipStream: baseURL + "/files_info/zip/stream",
  // decompression: baseURL + "/extract-by-filename-stream",
  decompressionClassify:
    baseURL + "/api/decompress/extract-and-classify-stream",
  getTasks: baseURL + "/api/task/info",
  decompressionRegister:
    baseURL + "/api/decompress/extract-and-classify-stream/register",
  getFiles: (task_id: string) =>
    baseURL + `/api/decompress/${task_id}/files?folders=downloads,uploads`,
  pdfCut: (
    task_id: string // 新增：PDF剪切接口
  ) => baseURL + `/api/decompress/pdf-cut/${task_id}`,
  finalizeTask: (task_id: string) =>
    apiClient.post(`/api/convert/task/${task_id}/convert`),
}
export default api
