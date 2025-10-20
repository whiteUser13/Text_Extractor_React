import type {
  FileInfo,
  ProcessingStatus,
  ExtractionRule,
  JudgmentRule,
  ExtractionResult,
  JudgmentResult,
  DocumentParseResult,
  ReportStats,
} from "@/types"

// 模拟数据存储服务
class DataService {
  private files: Map<string, FileInfo> = new Map()
  private processingStatus: Map<string, ProcessingStatus> = new Map()
  private extractionRules: Map<string, ExtractionRule> = new Map()
  private judgmentRules: Map<string, JudgmentRule> = new Map()
  private extractionResults: Map<string, ExtractionResult[]> = new Map()
  private judgmentResults: Map<string, JudgmentResult[]> = new Map()
  private parseResults: Map<string, DocumentParseResult> = new Map()

  constructor() {
    this.initializeDefaultRules()
  }

  // 初始化默认规则
  private initializeDefaultRules() {
    // 默认提取规则
    const defaultExtractionRules: ExtractionRule[] = [
      {
        id: "rule-1",
        name: "地块基本信息提取",
        description: "提取地块编号、位置、面积等基本信息",
        keywords: ["地块编号", "地块位置", "地块面积", "土地性质"],
        sections: ["基本信息", "地块概况"],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-2",
        name: "污染情况提取",
        description: "提取土壤和水污染相关数据",
        keywords: ["污染物", "浓度", "超标", "检测结果"],
        sections: ["检测报告", "污染评估"],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-3",
        name: "违规建设提取",
        description: "提取违规建设相关信息",
        keywords: ["违规建设", "未批先建", "超面积", "违法建筑"],
        sections: ["建设情况", "违规记录"],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    // 默认判别规则
    const defaultJudgmentRules: JudgmentRule[] = [
      {
        id: "judge-1",
        name: "合规性判别",
        description: "判断地块是否符合相关法规要求",
        type: "compliance",
        conditions: [
          { field: "content", operator: "contains", value: "违规" },
          { field: "content", operator: "contains", value: "超标" },
        ],
        actions: [{ type: "flag", value: "non_compliant" }],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "judge-2",
        name: "污染等级分类",
        description: "根据污染程度进行等级分类",
        type: "classification",
        conditions: [
          { field: "content", operator: "contains", value: "重度污染" },
        ],
        actions: [{ type: "classify", value: "高风险" }],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    defaultExtractionRules.forEach((rule) =>
      this.extractionRules.set(rule.id, rule)
    )
    defaultJudgmentRules.forEach((rule) =>
      this.judgmentRules.set(rule.id, rule)
    )
  }

  // 文件管理
  addFile(file: FileInfo): void {
    this.files.set(file.id, file)
    this.processingStatus.set(file.id, {
      stage: "upload",
      progress: 0,
      message: "文件上传中...",
    })
  }

  getFile(id: string): FileInfo | undefined {
    return this.files.get(id)
  }

  getAllFiles(): FileInfo[] {
    return Array.from(this.files.values()).sort(
      (a, b) => b.uploadTime.getTime() - a.uploadTime.getTime()
    )
  }

  updateFile(id: string, updates: Partial<FileInfo>): void {
    const file = this.files.get(id)
    if (file) {
      this.files.set(id, { ...file, ...updates })
    }
  }

  deleteFile(id: string): void {
    this.files.delete(id)
    this.processingStatus.delete(id)
    this.extractionResults.delete(id)
    this.judgmentResults.delete(id)
    this.parseResults.delete(id)
  }

  // 处理状态管理
  updateProcessingStatus(fileId: string, status: ProcessingStatus): void {
    this.processingStatus.set(fileId, status)
  }

  getProcessingStatus(fileId: string): ProcessingStatus | undefined {
    return this.processingStatus.get(fileId)
  }

  // 提取规则管理
  addExtractionRule(rule: ExtractionRule): void {
    this.extractionRules.set(rule.id, rule)
  }

  getExtractionRule(id: string): ExtractionRule | undefined {
    return this.extractionRules.get(id)
  }

  getAllExtractionRules(): ExtractionRule[] {
    return Array.from(this.extractionRules.values())
  }

  updateExtractionRule(id: string, updates: Partial<ExtractionRule>): void {
    const rule = this.extractionRules.get(id)
    if (rule) {
      this.extractionRules.set(id, {
        ...rule,
        ...updates,
        updatedAt: new Date(),
      })
    }
  }

  deleteExtractionRule(id: string): void {
    this.extractionRules.delete(id)
  }

  // 判别规则管理
  addJudgmentRule(rule: JudgmentRule): void {
    this.judgmentRules.set(rule.id, rule)
  }

  getJudgmentRule(id: string): JudgmentRule | undefined {
    return this.judgmentRules.get(id)
  }

  getAllJudgmentRules(): JudgmentRule[] {
    return Array.from(this.judgmentRules.values())
  }

  updateJudgmentRule(id: string, updates: Partial<JudgmentRule>): void {
    const rule = this.judgmentRules.get(id)
    if (rule) {
      this.judgmentRules.set(id, { ...rule, ...updates, updatedAt: new Date() })
    }
  }

  deleteJudgmentRule(id: string): void {
    this.judgmentRules.delete(id)
  }

  // 提取结果管理
  addExtractionResult(result: ExtractionResult): void {
    const results = this.extractionResults.get(result.fileId) || []
    results.push(result)
    this.extractionResults.set(result.fileId, results)
  }

  getExtractionResults(fileId: string): ExtractionResult[] {
    return this.extractionResults.get(fileId) || []
  }

  // 判别结果管理
  addJudgmentResult(result: JudgmentResult): void {
    const results = this.judgmentResults.get(result.fileId) || []
    results.push(result)
    this.judgmentResults.set(result.fileId, results)
  }

  getJudgmentResults(fileId: string): JudgmentResult[] {
    return this.judgmentResults.get(fileId) || []
  }

  // 解析结果管理
  setParseResult(result: DocumentParseResult): void {
    this.parseResults.set(result.fileId, result)
  }

  getParseResult(fileId: string): DocumentParseResult | undefined {
    return this.parseResults.get(fileId)
  }

  // 统计信息
  getReportStats(): ReportStats {
    const files = Array.from(this.files.values())
    const statuses = Array.from(this.processingStatus.values())

    const stageStats = statuses.reduce((acc, status) => {
      acc[status.stage] = (acc[status.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const errorStats = files
      .filter((file) => file.status === "error")
      .reduce((acc, file) => {
        const error = file.errorMessage || "Unknown Error"
        acc[error] = (acc[error] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return {
      totalFiles: files.length,
      processedFiles: files.filter((f) => f.status === "judged").length,
      errorFiles: files.filter((f) => f.status === "error").length,
      processingFiles: files.filter((f) => f.status === "processing").length,
      stageStats: stageStats as any,
      errorStats,
    }
  }

  // 清空所有数据
  clearAll(): void {
    this.files.clear()
    this.processingStatus.clear()
    this.extractionResults.clear()
    this.judgmentResults.clear()
    this.parseResults.clear()
  }
}

export const dataService = new DataService()
