export interface Option {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  withCount?: boolean
}

// 文件相关类型
export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  uploadTime: Date
  status:
    | "uploading"
    | "uploaded"
    | "processing"
    | "extracted"
    | "judged"
    | "error"
  progress?: number
  errorMessage?: string
  parseResult?: DocumentParseResult // 添加解析结果
}

// 处理阶段类型
export type ProcessingStage =
  | "upload" // 上传
  | "convert" // 转换
  | "parse" // 解析
  | "extract" // 提取
  | "analyze" // 判别
  | "completed" // 完成

// 处理状态
export interface ProcessingStatus {
  stage: ProcessingStage
  progress: number
  message: string
  error?: string
}

// OCR识别结果
export interface OCRResult {
  log_id: number
  words_result_num: number
  words_result: Array<{
    words: string
    probability?: {
      average: number
      variance: number
      min: number
    }
  }>
  direction?: number
}

// 图像分析结果
export interface ImageAnalysisResult {
  task_id: string
  ret_code: number
  ret_msg: string
  description: string
}

// 内容提取规则
export interface ExtractionRule {
  id: string
  name: string
  description: string
  keywords: string[]
  sections?: string[]
  pageRange?: {
    start?: number
    end?: number
  }
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// 判别规则
export interface JudgmentRule {
  id: string
  name: string
  description: string
  type: "compliance" | "classification" | "interpretation"
  conditions: Array<{
    field: string
    operator: "contains" | "equals" | "greater_than" | "less_than" | "regex"
    value: string
  }>
  actions: Array<{
    type: "flag" | "classify" | "score"
    value: string | number
  }>
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// 提取结果
export interface ExtractionResult {
  id: string
  fileId: string
  ruleId: string
  content: string
  confidence: number
  location: {
    page?: number
    section?: string
    coordinates?: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  extractedAt: Date
}

// 判别结果
export interface JudgmentResult {
  id: string
  fileId: string
  ruleId: string
  result: "pass" | "fail" | "warning"
  score?: number
  classification?: string
  interpretation?: string
  confidence: number
  details: string
  judgedAt: Date
}

// 报告统计
export interface ReportStats {
  totalFiles: number
  processedFiles: number
  errorFiles: number
  processingFiles: number
  stageStats: Record<ProcessingStage, number>
  errorStats: Record<string, number>
}

// 文档解析结果
export interface DocumentParseResult {
  id: string
  fileId: string
  content: {
    text: string
    tables: Array<{
      title?: string
      headers: string[]
      rows: string[][]
      page?: number
    }>
    images: Array<{
      title?: string
      description?: string
      page?: number
      base64?: string
    }>
    structure: {
      title?: string
      sections: Array<{
        title: string
        level: number
        page?: number
        content: string
      }>
      pageCount: number
    }
  }
  parsedAt: Date
}
