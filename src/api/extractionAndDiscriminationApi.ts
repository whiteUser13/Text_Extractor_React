// extractionAndDiscriminationApi.ts
import apiClient from "./index"

const baseURL = apiClient.defaults.baseURL || ""

const extractionAndDiscriminationApi = {
  // 文件夹信息相关
  getDecompressedFolders: baseURL + "/downloads/decompressed",
  getExtractedFoldersInfo: baseURL + "/filter_pdf/extracted/folders_info",
  getJudgedFoldersInfo: baseURL + "/api/judge/results/validated/folders_info",

  // 文件内容相关
  getMarkdownExtractionResults: (areaCode: string) =>
    baseURL + `/markdown_extraction/results?area_code=${areaCode}`,
  getMarkdownExtractionJsonFiles:
    baseURL + "/api/judge/markdown_extraction/json_files",
  getFolderDetailedInfo: (folderName: string) =>
    baseURL + `/get_folder_info/results/${folderName}`,

  // 文件下载相关
  getMarkdownExtractionFile: (areaCode: string, filename: string) =>
    baseURL + `/documents/markdown_extraction/${areaCode}/${filename}`,
  getResultsFile: (folderName: string, filename: string) =>
    baseURL + `/documents/results/${folderName}/${filename}`,
  getFileInfo: (folderName: string, filename: string) =>
    baseURL + `/file_info/results/${folderName}/${filename}`,

  // 操作相关
  extractContent: baseURL + "/extractor_folder",
  analyzeWithAI: baseURL + "/ai_validator_analysis",

  // 其他工具接口
  getJsonFiles: baseURL + "/api/judge/markdown_extraction/json_files",

  // 任务相关接口 - 修正：确保使用baseURL
  getTaskChunkedFiles: (taskId: string) =>
    `${baseURL}/api/extract/task/${taskId}/chunked/files`,
  taskExtractContent: (taskId: string) =>
    `${baseURL}/api/extract/task/${taskId}/extract`,
  getTaskExtractionResults: (taskId: string) =>
    `${baseURL}/api/extract/task/${taskId}/extraction_results`,
  taskDiscriminateContent: (taskId: string) =>
    `${baseURL}/api/judge/task/${taskId}/discriminate`,
  getTaskDiscriminationResults: (taskId: string) =>
    `${baseURL}/api/judge/task/${taskId}/discrimination_results`,

  // 任务目录列表接口 - 新增
  getTaskChunkedResults: (taskId: string) =>
    `${baseURL}/api/extract/task/${taskId}/chunked/files`,
  getTaskExtractedResults: (taskId: string) =>
    `${baseURL}/api/extract/task/${taskId}/extraction_results`,

  // 下载接口 - 修正：确保使用baseURL
  downloadTaskChunkedFile: (taskId: string, filename: string) =>
    `${baseURL}/api/file/task-chunked/${taskId}/${filename}`,
  downloadTaskExtractionFile: (taskId: string, filename: string) =>
    `${baseURL}/api/file/task-extraction-results/${taskId}/${filename}`,
  downloadTaskDiscriminationFile: (taskId: string, filename: string) =>
    `${baseURL}/api/file/task-discrimination-results/${taskId}/${filename}`,
  downloadTaskResultsFile: (taskId: string, filename: string) =>
    `${baseURL}/api/file/task-results/${taskId}/${filename}`,

  // 生成Excel报告
  taskGenerateExcel: (taskId: string) =>
    `${baseURL}/task/${taskId}/generate_excel`,

  // 新增：任务文件下载接口（匹配后端路由）
  getTaskFile: (taskId: string, fileType: string, filename: string) => {
    const fileTypeMap: Record<string, string> = {
      chunked: "task-chunked",
      extraction: "task-extraction-results",
      discrimination: "task-discrimination-results",
      results: "task-results",
      uploads: "task-uploads",
      downloads: "task-downloads",
      extracted: "task-extracted",
      parsed: "task-parsed",
    }

    const route = fileTypeMap[fileType] || "task-files"
    return `${baseURL}/${route}/${taskId}/${filename}`
  },

  // 新增：简化的下载接口
  downloadTaskFile: (taskId: string, fileType: string, filename: string) =>
    extractionAndDiscriminationApi.getTaskFile(taskId, fileType, filename),
}

export default extractionAndDiscriminationApi
