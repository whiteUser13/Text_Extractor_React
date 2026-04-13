// services/dataService.ts
import type {
  FileInfo,
  ProcessingStatus,
  ExtractionRule,
  JudgmentRule,
  ExtractionResult,
  JudgmentResult,
  DocumentParseResult,
  ReportStats,
  Task,
} from "@/types"

// 数据存储服务 - 使用 localStorage 持久化
class DataService {
  private readonly TASKS_STORAGE_KEY = "extraction_tasks"
  private readonly EXTRACTION_RULES_STORAGE_KEY = "extraction_rules"
  private readonly JUDGMENT_RULES_STORAGE_KEY = "judgment_rules"
  private readonly FILES_STORAGE_KEY = "files_data"
  private readonly PROCESSING_STATUS_STORAGE_KEY = "processing_status"
  private readonly EXTRACTION_RESULTS_STORAGE_KEY = "extraction_results"
  private readonly JUDGMENT_RESULTS_STORAGE_KEY = "judgment_results"
  private readonly PARSE_RESULTS_STORAGE_KEY = "parse_results"
  private readonly SCENES_STORAGE_KEY = "scenes"

  constructor() {
    this.initializeDefaultRules()
    this.initializeDefaultScenes()
  }

  // 初始化默认场景
  private initializeDefaultScenes() {
    const existingScenes = this.getFromStorage<any[]>(this.SCENES_STORAGE_KEY)
    if (!existingScenes || existingScenes.length === 0) {
      const defaultScenes = [
        {
          id: "default",
          name: "默认场景",
          description: "默认任务管理场景",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      this.saveToStorage(this.SCENES_STORAGE_KEY, defaultScenes)
    }
  }

  // 初始化默认规则
  private initializeDefaultRules() {
    const existingExtractionRules = this.getAllExtractionRules()
    const existingJudgmentRules = this.getAllJudgmentRules()

    if (existingExtractionRules.length === 0) {
      const defaultExtractionRules: ExtractionRule[] = [
        {
          id: "rule-1",
          name: "地块基本信息提取",
          description: "提取地块编号、位置、面积等基本信息",
          prompt: "请从文档中提取地块编号、地块位置、地块面积、土地性质等基本信息",
          sections: ["基本信息", "地块概况"],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-2",
          name: "污染情况提取",
          description: "提取土壤和水污染相关数据",
          prompt: "请从文档中提取污染物、浓度、超标、检测结果等基本信息",
          sections: ["检测报告", "污染评估"],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-3",
          name: "违规建设提取",
          description: "提取违规建设相关信息",
          prompt: "请从文档中提取污染物、浓度、超标、检测结果等基本信息",
          sections: ["建设情况", "违规记录"],
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      defaultExtractionRules.forEach((rule) => this.addExtractionRule(rule))
    }

    if (existingJudgmentRules.length === 0) {
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

      defaultJudgmentRules.forEach((rule) => this.addJudgmentRule(rule))
    }
  }

  // 场景管理方法
  getAllScenes(): any[] {
    const scenes = this.getFromStorage<any[]>(this.SCENES_STORAGE_KEY) || []
    return scenes.map(scene => ({
      ...scene,
      createdAt: new Date(scene.createdAt),
      updatedAt: new Date(scene.updatedAt),
    }))
  }

  getScene(id: string): any | undefined {
    return this.getAllScenes().find(scene => scene.id === id)
  }

  createScene(scene: Omit<any, "id" | "createdAt" | "updatedAt">): any {
    const scenes = this.getAllScenes()
    
    // 生成简短的唯一场景ID：8位随机字符串（字母+数字）
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let sceneId = ''
    for (let i = 0; i < 8; i++) {
      sceneId += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    const newScene = {
      ...scene,
      id: sceneId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    scenes.push(newScene)
    this.saveToStorage(this.SCENES_STORAGE_KEY, scenes)
    return newScene
  }

  updateScene(id: string, updates: Partial<any>): any | null {
    const scenes = this.getAllScenes()
    const index = scenes.findIndex(s => s.id === id)
    if (index === -1) return null
    
    scenes[index] = {
      ...scenes[index],
      ...updates,
      updatedAt: new Date(),
    }
    this.saveToStorage(this.SCENES_STORAGE_KEY, scenes)
    return scenes[index]
  }

  deleteScene(id: string): boolean {
    const scenes = this.getAllScenes()
    if (scenes.length <= 1) return false
    
    const filtered = scenes.filter(s => s.id !== id)
    this.saveToStorage(this.SCENES_STORAGE_KEY, filtered)
    
    const tasks = this.getAllTasks()
    tasks.forEach(task => {
      if (task.sceneId === id) {
        this.deleteTask(task.id)
      }
    })
    
    return true
  }

  getSceneStats(sceneId: string) {
    const tasks = this.getTasksByScene(sceneId)
    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.enabled).length,
    }
  }

  getTasksByScene(sceneId: string): Task[] {
    const allTasks = this.getAllTasks()
    return allTasks.filter(task => task.sceneId === sceneId)
  }

  // 任务管理
  addTask(task: Task): void {
    const allTasks = this.getFromStorage<Task[]>(this.TASKS_STORAGE_KEY) || []
    if (!allTasks.some((item: any) => item.id === task.id)) {
      allTasks.push(task)
      localStorage.setItem(this.TASKS_STORAGE_KEY, JSON.stringify(allTasks))
    }
  }

  updateTask(id: string, updates: Partial<Task>): void {
    const tasks = this.getAllTasks()
    const taskIndex = tasks.findIndex((task) => task.id === id)
    if (taskIndex !== -1) {
      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updates,
      }
      console.log(tasks[taskIndex])
      this.saveToStorage(this.TASKS_STORAGE_KEY, tasks)
    }
  }

  deleteTask(id: string): void {
    const tasks = this.getAllTasks().filter((task) => task.id !== id)
    this.saveToStorage(this.TASKS_STORAGE_KEY, tasks)
  }

  getTask(id: string): Task | undefined {
    return this.getAllTasks().find((task) => task.id === id)
  }

  getAllTasks(): Task[] {
    const tasks = this.getFromStorage<Task[]>(this.TASKS_STORAGE_KEY) || []
    return tasks.map((task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      extractionRules:
        task.extractionRules?.map((rule) => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
        })) || [],
      judgmentRules:
        task.judgmentRules?.map((rule) => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
        })) || [],
    }))
  }

  getAllTasksId(): string[] {
    const tasks = this.getFromStorage<Task[]>(this.TASKS_STORAGE_KEY) || []
    return tasks.map((task) => task.id)
  }

  getEnabledTasks(): Task[] {
    return this.getAllTasks().filter((task) => task.enabled)
  }

  // 文件管理
  addFile(file: FileInfo): void {
    const files = this.getAllFiles()
    files.push(file)
    this.saveToStorage(this.FILES_STORAGE_KEY, files)

    const statuses = this.getAllProcessingStatus()
    statuses[file.id] = {
      stage: "upload",
      progress: 0,
      message: "文件上传中...",
    }
    this.saveToStorage(this.PROCESSING_STATUS_STORAGE_KEY, statuses)
  }

  getFile(id: string): FileInfo | undefined {
    return this.getAllFiles().find((file) => file.id === id)
  }

  getAllFiles(): FileInfo[] {
    const files = this.getFromStorage<FileInfo[]>(this.FILES_STORAGE_KEY) || []
    return files.map((file) => ({
      ...file,
      uploadTime: new Date(file.uploadTime),
    }))
  }

  updateFile(id: string, updates: Partial<FileInfo>): void {
    const files = this.getAllFiles()
    const fileIndex = files.findIndex((file) => file.id === id)
    if (fileIndex !== -1) {
      files[fileIndex] = { ...files[fileIndex], ...updates }
      this.saveToStorage(this.FILES_STORAGE_KEY, files)
    }
  }

  deleteFile(id: string): void {
    const files = this.getAllFiles().filter((file) => file.id !== id)
    this.saveToStorage(this.FILES_STORAGE_KEY, files)

    const statuses = this.getAllProcessingStatus()
    delete statuses[id]
    this.saveToStorage(this.PROCESSING_STATUS_STORAGE_KEY, statuses)

    const extractionResults = this.getAllExtractionResults()
    delete extractionResults[id]
    this.saveToStorage(this.EXTRACTION_RESULTS_STORAGE_KEY, extractionResults)

    const judgmentResults = this.getAllJudgmentResults()
    delete judgmentResults[id]
    this.saveToStorage(this.JUDGMENT_RESULTS_STORAGE_KEY, judgmentResults)

    const parseResults = this.getAllParseResults()
    delete parseResults[id]
    this.saveToStorage(this.PARSE_RESULTS_STORAGE_KEY, parseResults)
  }

  // 处理状态管理
  updateProcessingStatus(fileId: string, status: ProcessingStatus): void {
    const statuses = this.getAllProcessingStatus()
    statuses[fileId] = status
    this.saveToStorage(this.PROCESSING_STATUS_STORAGE_KEY, statuses)
  }

  getProcessingStatus(fileId: string): ProcessingStatus | undefined {
    const statuses = this.getAllProcessingStatus()
    return statuses[fileId]
  }

  private getAllProcessingStatus(): Record<string, ProcessingStatus> {
    return (
      this.getFromStorage<Record<string, ProcessingStatus>>(
        this.PROCESSING_STATUS_STORAGE_KEY
      ) || {}
    )
  }

  // 提取规则管理
  addExtractionRule(rule: ExtractionRule): void {
    const rules = this.getAllExtractionRules()
    rules.push(rule)
    this.saveToStorage(this.EXTRACTION_RULES_STORAGE_KEY, rules)
  }

  getExtractionRule(id: string): ExtractionRule | undefined {
    return this.getAllExtractionRules().find((rule) => rule.id === id)
  }

  getAllExtractionRules(): ExtractionRule[] {
    const rules =
      this.getFromStorage<ExtractionRule[]>(
        this.EXTRACTION_RULES_STORAGE_KEY
      ) || []
    return rules.map((rule) => ({
      ...rule,
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt),
    }))
  }

  updateExtractionRule(id: string, updates: Partial<ExtractionRule>): void {
    const rules = this.getAllExtractionRules()
    const ruleIndex = rules.findIndex((rule) => rule.id === id)
    if (ruleIndex !== -1) {
      rules[ruleIndex] = {
        ...rules[ruleIndex],
        ...updates,
        updatedAt: new Date(),
      }
      this.saveToStorage(this.EXTRACTION_RULES_STORAGE_KEY, rules)
    }
  }

  deleteExtractionRule(id: string): void {
    const rules = this.getAllExtractionRules().filter((rule) => rule.id !== id)
    this.saveToStorage(this.EXTRACTION_RULES_STORAGE_KEY, rules)
  }

  // 判别规则管理
  addJudgmentRule(rule: JudgmentRule): void {
    const rules = this.getAllJudgmentRules()
    rules.push(rule)
    this.saveToStorage(this.JUDGMENT_RULES_STORAGE_KEY, rules)
  }

  getJudgmentRule(id: string): JudgmentRule | undefined {
    return this.getAllJudgmentRules().find((rule) => rule.id === id)
  }

  getAllJudgmentRules(): JudgmentRule[] {
    const rules =
      this.getFromStorage<JudgmentRule[]>(this.JUDGMENT_RULES_STORAGE_KEY) || []
    return rules.map((rule) => ({
      ...rule,
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt),
    }))
  }

  updateJudgmentRule(id: string, updates: Partial<JudgmentRule>): void {
    const rules = this.getAllJudgmentRules()
    const ruleIndex = rules.findIndex((rule) => rule.id === id)
    if (ruleIndex !== -1) {
      rules[ruleIndex] = {
        ...rules[ruleIndex],
        ...updates,
        updatedAt: new Date(),
      }
      this.saveToStorage(this.JUDGMENT_RULES_STORAGE_KEY, rules)
    }
  }

  deleteJudgmentRule(id: string): void {
    const rules = this.getAllJudgmentRules().filter((rule) => rule.id !== id)
    this.saveToStorage(this.JUDGMENT_RULES_STORAGE_KEY, rules)
  }

  // 提取结果管理
  addExtractionResult(result: ExtractionResult): void {
    const results = this.getAllExtractionResults()
    if (!results[result.fileId]) {
      results[result.fileId] = []
    }
    results[result.fileId].push({
      ...result,
      extractedAt: new Date(result.extractedAt),
    })
    this.saveToStorage(this.EXTRACTION_RESULTS_STORAGE_KEY, results)
  }

  getExtractionResults(fileId: string): ExtractionResult[] {
    const results = this.getAllExtractionResults()
    return results[fileId] || []
  }

  private getAllExtractionResults(): Record<string, ExtractionResult[]> {
    const results =
      this.getFromStorage<Record<string, ExtractionResult[]>>(
        this.EXTRACTION_RESULTS_STORAGE_KEY
      ) || {}
    Object.keys(results).forEach((fileId) => {
      results[fileId] = results[fileId].map((result) => ({
        ...result,
        extractedAt: new Date(result.extractedAt),
      }))
    })
    return results
  }

  // 判别结果管理
  addJudgmentResult(result: JudgmentResult): void {
    const results = this.getAllJudgmentResults()
    if (!results[result.fileId]) {
      results[result.fileId] = []
    }
    results[result.fileId].push({
      ...result,
      judgedAt: new Date(result.judgedAt),
    })
    this.saveToStorage(this.JUDGMENT_RESULTS_STORAGE_KEY, results)
  }

  getJudgmentResults(fileId: string): JudgmentResult[] {
    const results = this.getAllJudgmentResults()
    return results[fileId] || []
  }

  private getAllJudgmentResults(): Record<string, JudgmentResult[]> {
    const results =
      this.getFromStorage<Record<string, JudgmentResult[]>>(
        this.JUDGMENT_RESULTS_STORAGE_KEY
      ) || {}
    Object.keys(results).forEach((fileId) => {
      results[fileId] = results[fileId].map((result) => ({
        ...result,
        judgedAt: new Date(result.judgedAt),
      }))
    })
    return results
  }

  // 解析结果管理
  setParseResult(result: DocumentParseResult): void {
    const results = this.getAllParseResults()
    results[result.fileId] = {
      ...result,
      parsedAt: new Date(result.parsedAt),
    }
    this.saveToStorage(this.PARSE_RESULTS_STORAGE_KEY, results)
  }

  getParseResult(fileId: string): DocumentParseResult | undefined {
    const results = this.getAllParseResults()
    return results[fileId]
  }

  private getAllParseResults(): Record<string, DocumentParseResult> {
    const results =
      this.getFromStorage<Record<string, DocumentParseResult>>(
        this.PARSE_RESULTS_STORAGE_KEY
      ) || {}
    Object.keys(results).forEach((fileId) => {
      results[fileId] = {
        ...results[fileId],
        parsedAt: new Date(results[fileId].parsedAt),
      }
    })
    return results
  }

  // 统计信息
  getReportStats(): ReportStats {
    const files = this.getAllFiles()
    const statuses = this.getAllProcessingStatus()

    const stageStats = Object.values(statuses).reduce((acc, status) => {
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
    localStorage.removeItem(this.FILES_STORAGE_KEY)
    localStorage.removeItem(this.PROCESSING_STATUS_STORAGE_KEY)
    localStorage.removeItem(this.EXTRACTION_RESULTS_STORAGE_KEY)
    localStorage.removeItem(this.JUDGMENT_RESULTS_STORAGE_KEY)
    localStorage.removeItem(this.PARSE_RESULTS_STORAGE_KEY)
    localStorage.removeItem(this.TASKS_STORAGE_KEY)
    localStorage.removeItem(this.EXTRACTION_RULES_STORAGE_KEY)
    localStorage.removeItem(this.JUDGMENT_RULES_STORAGE_KEY)
  }

  // 辅助方法
  private getFromStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error(`从 localStorage 获取数据失败 (${key}):`, error)
      return null
    }
  }

  private saveToStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`保存数据到 localStorage 失败 (${key}):`, error)
    }
  }
}

export const dataService = new DataService()