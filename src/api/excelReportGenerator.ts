import apiClient from "./index"

const API_BASE = apiClient.defaults.baseURL || ""

export default {
  // 修改：获取任务相关的结果文件夹
  getResultFolders: `${API_BASE}/results/validated/folders_info`,

  // 新增：任务相关接口
  getTaskExtractionResults: (taskId: string) =>
    `${API_BASE}/task/${taskId}/extraction_results`,
  getTaskDiscriminationResults: (taskId: string) =>
    `${API_BASE}/task/${taskId}/discrimination_results`,

  // 新增：任务文件访问接口
  getTaskExtractionFile: (taskId: string, filePath: string) =>
    `/api/file/task-extraction-results/${taskId}/${filePath}`,
  getTaskDiscriminationFile: (taskId: string, filePath: string) =>
    `/api/file/task-discrimination-results/${taskId}/${filePath}`,
  getTaskResultsFile: (taskId: string, filename: string) =>
    `/api/file/task-results/${taskId}/${filename}`,

  // 原有接口（兼容）
  getExtractionResults: (folderName: string) =>
    `${API_BASE}/markdown_extraction/results?area_code=${folderName}`,
  getValidationResults: (folderName: string) =>
    `${API_BASE}/results/detailed_files/${folderName}`,
  getMarkdownExtractionFile: (filePart: string) =>
    `/documents/markdown_extraction/${filePart}`,
  getResultsFile: (filePart: string) => `/documents/results/${filePart}`,

  // Excel生成接口
  generateExcel: `${API_BASE}/api/result/generate-excel`,

  // 任务Excel生成
  generateTaskExcel: (taskId: string) =>
    `${API_BASE}/task/${taskId}/generate_excel`,
}
