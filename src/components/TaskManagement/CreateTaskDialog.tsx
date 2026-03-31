import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Task, ExtractionRule, JudgmentRule } from "@/types"
import { useUserStore } from "@/context/userStore"
import { Switch } from "@/components/ui/switch"
// 添加知识库
type KnowledgeBaseOption = "none" | "industry_category"
type JudgmentRuleExt = JudgmentRule & {
  knowledgeBase?: KnowledgeBaseOption
  sourceFields?: string[]
}
// 12.30修改：为提取规则扩展 title 排除关键词字段（仅在本组件内扩展，避免全局改动 types）
type ExtractionRuleExt = ExtractionRule & {
  /** 仅在 title 匹配章节时生效：当 title 包含任一关键词时跳过该 title 命中 */
  title_exclude_keywords?: string[]
}

import { dataService } from "@/services/dataService"
import { useToast } from "@/hooks/use-toast"
import { addTask, updateTaskByID } from "@/api/dashboard"
const PROVINCE_OPTIONS = [
  "北京市",
  "天津市",
  "上海市",
  "重庆市",
  "河北省",
  "山西省",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "江苏省",
  "浙江省",
  "安徽省",
  "福建省",
  "江西省",
  "山东省",
  "河南省",
  "湖北省",
  "湖南省",
  "广东省",
  "海南省",
  "四川省",
  "贵州省",
  "云南省",
  "陕西省",
  "甘肃省",
  "青海省",
  "台湾省",
  "内蒙古自治区",
  "广西壮族自治区",
  "西藏自治区",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "香港特别行政区",
  "澳门特别行政区",
]

interface CreateTaskDialogProps {
  onTaskCreated?: (task: Task) => void
  selectedTask?: Task
  isOpen: boolean // 父组件传入的 open 状态
  onOpenChange: (open: boolean) => void // 通知父组件的 setter
  type: "create" | "update"
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  onTaskCreated,
  selectedTask,
  isOpen,
  onOpenChange,
  type,
}) => {
  const [open, setOpen] = useState(false)
  const [taskName, setTaskName] = useState("")
  const [province, setProvince] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const { toast } = useToast()
  // 是否共享
  const [shareMode, setShareMode] = useState(false)
  //用户信息
  const user = useUserStore((state) => state.user)

  useEffect(() => {
    console.log("useEffect")
    if (selectedTask) {
      setTaskName(selectedTask.name)
      setShareMode(selectedTask.share)
      setTaskDescription(selectedTask.description ?? "")
      setProvince((selectedTask as any).province ?? "") // 0317修改：编辑任务时回填省份
      setExtractionRules(selectedTask.extractionRules as ExtractionRuleExt[]) // 12.30修改
      setJudgmentRules(selectedTask.judgmentRules)
    } else if (isOpen && type === "create") {
      // 0317修改：创建任务时打开弹窗，重置基本信息
      setTaskName("")
      setTaskDescription("")
      setProvince("")
    }
  }, [isOpen, selectedTask, type])

  // 提取规则状态
  const [extractionRules, setExtractionRules] = useState<ExtractionRuleExt[]>([
    // 12.30修改
    {
      id: `rule-${Date.now()}`,
      name: "",
      description: "",
      prompt: "", // 默认不使用知识库
      sections: [],
      title_exclude_keywords: [], // 12.30修改
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])

  // 判别规则状态
  const [judgmentRules, setJudgmentRules] = useState<JudgmentRuleExt[]>([
    {
      id: `judge-${Date.now()}`,
      name: "",
      description: "",
      type: "compliance",
      conditions: [],
      actions: [],
      // 添加知识库
      knowledgeBase: "none", // 默认值
      sourceFields: [], // 新增字段
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])

  // 添加提取规则
  const addExtractionRule = () => {
    setExtractionRules([
      ...extractionRules,
      {
        id: `rule-${Date.now()}`,
        name: "",
        description: "",
        prompt: "",
        sections: [],
        title_exclude_keywords: [], // 12.30修改
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  }

  // 删除提取规则
  const removeExtractionRule = (index: number) => {
    setExtractionRules(extractionRules.filter((_, i) => i !== index))
  }

  // 更新提取规则
  const updateExtractionRule = (index: number, field: string, value: any) => {
    const newRules = [...extractionRules]
    newRules[index] = {
      ...newRules[index],
      [field]: value,
      updatedAt: new Date(),
    }
    setExtractionRules(newRules)
  }

  // 添加章节
  const addSection = (ruleIndex: number, section: string) => {
    if (!section.trim()) return
    const newRules = [...extractionRules]
    if (!newRules[ruleIndex].sections) {
      newRules[ruleIndex].sections = []
    }
    newRules[ruleIndex].sections!.push(section.trim())
    setExtractionRules(newRules)
  }

  // 删除章节
  const removeSection = (ruleIndex: number, sectionIndex: number) => {
    console.log("delete")

    const newRules = [...extractionRules]
    newRules[ruleIndex].sections = newRules[ruleIndex].sections?.filter(
      (_, i) => i !== sectionIndex,
    )
    setExtractionRules(newRules)
  }

  // 12.30修改：添加 title 排除关键词（回车添加，Badge 展示）
  const addTitleExcludeKeyword = (ruleIndex: number, kw: string) => {
    const v = kw.trim()
    if (!v) return
    const newRules = [...extractionRules]
    const arr = newRules[ruleIndex].title_exclude_keywords || []
    // 去重（不区分大小写） // 12.30修改
    const exists = arr.some((x) => x.trim().toLowerCase() === v.toLowerCase())
    if (!exists) {
      newRules[ruleIndex].title_exclude_keywords = [...arr, v] // 12.30修改
      setExtractionRules(newRules)
    }
  }

  // 12.30修改：删除 title 排除关键词
  const removeTitleExcludeKeyword = (ruleIndex: number, kwIndex: number) => {
    const newRules = [...extractionRules]
    newRules[ruleIndex].title_exclude_keywords = (
      newRules[ruleIndex].title_exclude_keywords || []
    ).filter((_, i) => i !== kwIndex) // 12.30修改
    setExtractionRules(newRules)
  }

  // 添加判别规则
  const addJudgmentRule = () => {
    setJudgmentRules([
      ...judgmentRules,
      {
        id: `judge-${Date.now()}`,
        name: "",
        description: "",
        type: "compliance",
        // 添加知识库
        knowledgeBase: "none", // 默认不使用知识库
        sourceFields: [], // 新增字段
        conditions: [],
        actions: [],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  }

  // 删除判别规则
  const removeJudgmentRule = (index: number) => {
    setJudgmentRules(judgmentRules.filter((_, i) => i !== index))
  }

  // 更新判别规则
  const updateJudgmentRule = (index: number, field: string, value: any) => {
    const newRules = [...judgmentRules]
    newRules[index] = {
      ...newRules[index],
      [field]: value,
      updatedAt: new Date(),
    }
    setJudgmentRules(newRules)
  }

  // 添加判别条件
  const addCondition = (ruleIndex: number) => {
    const newRules = [...judgmentRules]
    newRules[ruleIndex].conditions.push({
      field: "",
      operator: "contains",
      value: "",
    })
    setJudgmentRules(newRules)
  }

  // 删除判别条件
  const removeCondition = (ruleIndex: number, conditionIndex: number) => {
    const newRules = [...judgmentRules]
    newRules[ruleIndex].conditions = newRules[ruleIndex].conditions.filter(
      (_, i) => i !== conditionIndex,
    )
    setJudgmentRules(newRules)
  }

  // 更新判别条件
  const updateCondition = (
    ruleIndex: number,
    conditionIndex: number,
    field: string,
    value: any,
  ) => {
    const newRules = [...judgmentRules]
    newRules[ruleIndex].conditions[conditionIndex] = {
      ...newRules[ruleIndex].conditions[conditionIndex],
      [field]: value,
    }
    setJudgmentRules(newRules)
  }

  // 添加判别动作
  const addAction = (ruleIndex: number) => {
    const newRules = [...judgmentRules]
    newRules[ruleIndex].actions.push({
      type: "flag",
      value: "",
    })
    setJudgmentRules(newRules)
  }

  // 删除判别动作
  const removeAction = (ruleIndex: number, actionIndex: number) => {
    const newRules = [...judgmentRules]
    newRules[ruleIndex].actions = newRules[ruleIndex].actions.filter(
      (_, i) => i !== actionIndex,
    )
    setJudgmentRules(newRules)
  }

  // 更新判别动作
  const updateAction = (
    ruleIndex: number,
    actionIndex: number,
    field: string,
    value: any,
  ) => {
    const newRules = [...judgmentRules]
    newRules[ruleIndex].actions[actionIndex] = {
      ...newRules[ruleIndex].actions[actionIndex],
      [field]: value,
    }
    setJudgmentRules(newRules)
  }

  //验证
  const validateTask = () => {
    // 验证
    if (!taskName.trim()) {
      toast({
        title: "错误",
        description: "请输入任务名称",
        variant: "destructive",
      })
      return false
    }
    if (!province.trim()) {
      // 0317修改：省份必填，避免后续统计页高亮失败
      toast({
        title: "错误",
        description: "请选择所属省份",
        variant: "destructive",
      })
      return false
    }
    // 验证提取规则
    const validExtractionRules = extractionRules.filter(
      (rule) => rule.name.trim() && rule.prompt.trim(),
    )
    if (validExtractionRules.length === 0) {
      toast({
        title: "错误",
        description: "请至少添加一条有效的提取规则（包含名称和提示词）",
        variant: "destructive",
      })
      return false
    }

    // 验证判别规则
    const validJudgmentRules = judgmentRules.filter((rule) => rule.name.trim())
    if (validJudgmentRules.length === 0) {
      toast({
        title: "错误",
        description: "请至少添加一条有效的判别规则",
        variant: "destructive",
      })
      return false
    }
    return true
  }

  // 保存任务
  const handleSaveTask = () => {
    // 验证
    if (!validateTask()) {
      return
    }
    const validExtractionRules = extractionRules.filter(
      (rule) => rule.name.trim() && rule.prompt.trim(),
    )
    const validJudgmentRules = judgmentRules.filter((rule) => rule.name.trim())
    // 创建任务
    const newTask = {
      id: `task-${Date.now()}`,
      share: shareMode,
      group_name: user ? user.group_name : "unknown",
      name: taskName.trim(),
      province: province.trim(), // 0317修改：创建任务时保存所属省份
      description: taskDescription.trim(),
      extractionRules: validExtractionRules,
      judgmentRules: validJudgmentRules,
      createdBy: user?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      enabled: true,
    } as Task
    // 保存到数据服务
    addTask(newTask).then((result) => {
      if (result.success) {
        toast({
          title: "保存任务成功",
          description: `任务"${newTask.name}"已成功创建`,
        })
        dataService.addTask(newTask)

        // 回调
        if (onTaskCreated) {
          onTaskCreated(newTask)
        }

        // 触发自定义事件，让其他页面知道任务已创建
        const taskCreatedEvent = new CustomEvent("task-created", {
          detail: {
            taskId: newTask.id,
            taskName: newTask.name,
          },
        })
        window.dispatchEvent(taskCreatedEvent)
        console.log("已触发任务创建事件:", newTask.id)

        // 重置表单
        setTaskName("")
        setTaskDescription("")
        setExtractionRules([
          {
            id: `rule-${Date.now()}`,
            name: "",
            description: "",
            prompt: "",
            sections: [],
            title_exclude_keywords: [], // 12.30修改
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        setJudgmentRules([
          {
            id: `judge-${Date.now()}`,
            name: "",
            description: "",
            type: "compliance",
            knowledgeBase: "none",
            conditions: [],
            actions: [],
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])

        // 关闭对话框
        onOpenChange(false)
      } else {
        toast({
          title: "保存失败",
          description: result.msg,
          variant: "destructive",
        })
      }
    })
  }

  // 修改任务
  const handleUpdateTask = () => {
    // 验证
    if (!validateTask()) {
      return
    }
    const validExtractionRules = extractionRules.filter(
      (rule) => rule.name.trim() && rule.prompt.trim(),
    )
    const validJudgmentRules = judgmentRules.filter((rule) => rule.name.trim())
    let task_id = selectedTask ? selectedTask.id : ""
    const updateTask = {
      id: task_id,
      name: taskName.trim(),
      share: shareMode,
      province: province.trim(),
      description: taskDescription.trim(),
      extractionRules: validExtractionRules,
      judgmentRules: validJudgmentRules,
      createdAt: selectedTask ? selectedTask.createdAt : new Date(),
      updatedAt: new Date(),
      enabled: true,
    } as Task
    updateTaskByID(task_id, updateTask).then((result) => {
      if (result.success) {
        toast({
          title: "任务更新成功",
          description: `任务"${updateTask.name}"已成功更新`,
        })
        dataService.updateTask(task_id, updateTask)
        onOpenChange(false)
      } else {
        toast({
          title: "更新失败",
          description: result.msg,
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{/*  */}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">新建审核任务</DialogTitle>
          <DialogDescription>
            创建新的报告审核任务，配置提取规则和判别规则
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">共享模式</p>
            <p className="text-sm text-gray-500">任务在工作组是否可见</p>
          </div>
          <Switch checked={shareMode} onCheckedChange={setShareMode} />
        </div>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="taskName">任务名称 *</Label>
              <Input
                id="taskName"
                placeholder="例如：地块违规建设审核"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="province">所属省份 *</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="请选择任务所属省份" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCE_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="taskDescription">任务描述</Label>
              <Textarea
                id="taskDescription"
                placeholder="描述此任务的用途和适用场景..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* 提取规则配置 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>提取规则配置</CardTitle>
                  <CardDescription>设置从报告中提取内容的规则</CardDescription>
                </div>
                <Button onClick={addExtractionRule} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  添加规则
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractionRules.map((rule, ruleIndex) => (
                <Card key={rule.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        规则 {ruleIndex + 1}
                      </CardTitle>
                      {extractionRules.length > 1 && (
                        <Button
                          onClick={() => removeExtractionRule(ruleIndex)}
                          size="sm"
                          variant="ghost">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>规则名称 *</Label>
                      <Input
                        placeholder="例如：地块基本信息提取"
                        value={rule.name}
                        onChange={(e) =>
                          updateExtractionRule(
                            ruleIndex,
                            "name",
                            e.target.value,
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>规则描述</Label>
                      <Input
                        placeholder="描述此规则的作用..."
                        value={rule.description}
                        onChange={(e) =>
                          updateExtractionRule(
                            ruleIndex,
                            "description",
                            e.target.value,
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>提示词 *</Label>
                      <Textarea
                        placeholder="请输入提取内容的提示词（一段话），例如：请从文档中提取项目名称、项目地点、项目规模等基本信息"
                        value={rule.prompt}
                        onChange={(e) =>
                          updateExtractionRule(
                            ruleIndex,
                            "prompt",
                            e.target.value,
                          )
                        }
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>目标章节</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="输入章节名称后按回车添加"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addSection(ruleIndex, e.currentTarget.value)
                              e.currentTarget.value = ""
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rule.sections?.map((section, sectionIndex) => (
                          <Badge
                            key={sectionIndex}
                            variant="secondary"
                            className="gap-1">
                            {section}

                            <button
                              className="h-3 w-3 cursor-pointer"
                              onClick={() =>
                                removeSection(ruleIndex, sectionIndex)
                              }
                              type="button">
                              <X className="h-3 w-3 cursor-pointer"></X>
                            </button>
                          </Badge>
                        ))}
                      </div>

                      {/* 12.30修改：仅在 title 匹配章节时生效的排除关键词配置*/}
                      <div className="mt-3">
                        <Label>章节标题不包含以下关键词</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder="输入关键词后按回车添加（例如：周围）"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addTitleExcludeKeyword(
                                  ruleIndex,
                                  e.currentTarget.value,
                                ) // 12.30修改
                                e.currentTarget.value = "" // 12.30修改
                              }
                            }}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {(rule.title_exclude_keywords || []).map(
                            (kw, kwIndex) => (
                              <Badge
                                key={kwIndex}
                                variant="secondary"
                                className="gap-1">
                                {kw}
                                <button
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={() =>
                                    removeTitleExcludeKeyword(
                                      ruleIndex,
                                      kwIndex,
                                    )
                                  } // 12.30修改
                                  type="button">
                                  <X className="h-3 w-3 cursor-pointer" />
                                </button>
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* 判别规则配置 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>判别规则配置</CardTitle>
                  <CardDescription>设置对提取内容的判别规则</CardDescription>
                </div>
                <Button onClick={addJudgmentRule} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  添加规则
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {judgmentRules.map((rule, ruleIndex) => (
                <Card key={rule.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        规则 {ruleIndex + 1}
                      </CardTitle>
                      {judgmentRules.length > 1 && (
                        <Button
                          onClick={() => removeJudgmentRule(ruleIndex)}
                          size="sm"
                          variant="ghost">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>规则名称 *</Label>
                      <Input
                        placeholder="例如：违规建设判别"
                        value={rule.name}
                        onChange={(e) =>
                          updateJudgmentRule(ruleIndex, "name", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>提示词 *</Label>
                      <Textarea
                        placeholder="请输入提取内容的提示词（一段话），例如：请从文档中提取项目名称、项目地点、项目规模等基本信息"
                        value={rule.description}
                        onChange={(e) =>
                          updateJudgmentRule(
                            ruleIndex,
                            "description",
                            e.target.value,
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    {/* 新增知识库选项 */}
                    <div>
                      <Label>知识库支持</Label>
                      <Select
                        value={rule.knowledgeBase || "none"}
                        onValueChange={(value) =>
                          updateJudgmentRule(
                            ruleIndex,
                            "knowledgeBase",
                            value as KnowledgeBaseOption,
                          )
                        }>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">不使用</SelectItem>
                          <SelectItem value="industry_category">
                            国民经济行业类别
                          </SelectItem>
                          <SelectItem value="landuse_type">用地类型</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* 条件渲染：仅当选择知识库时显示 sourceField */}
                    {rule.knowledgeBase && rule.knowledgeBase !== "none" && (
                      <div>
                        <Label>关联提取规则</Label>
                        <div className="mt-1 space-y-2">
                          {extractionRules.map((extractionRule) => (
                            <div
                              key={extractionRule.id}
                              className="flex items-center">
                              <input
                                type="checkbox"
                                id={`${extractionRule.id}-${ruleIndex}`}
                                checked={
                                  rule.sourceFields?.includes(
                                    extractionRule.name,
                                  ) || false
                                }
                                onChange={(e) => {
                                  const isChecked = e.target.checked
                                  const currentSourceFields =
                                    rule.sourceFields || []
                                  let newSourceFields: string[]

                                  if (isChecked) {
                                    // 添加提取规则的名称到数组
                                    newSourceFields = [
                                      ...currentSourceFields,
                                      extractionRule.name,
                                    ]
                                  } else {
                                    // 从数组中移除提取规则的名称
                                    newSourceFields =
                                      currentSourceFields.filter(
                                        (name) => name !== extractionRule.name,
                                      )
                                  }

                                  updateJudgmentRule(
                                    ruleIndex,
                                    "sourceFields",
                                    newSourceFields,
                                  )
                                }}
                              />
                              <Label
                                htmlFor={`${extractionRule.id}-${ruleIndex}`}
                                className="ml-2">
                                {extractionRule.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label>判别类型</Label>
                      <Select
                        value={rule.type}
                        onValueChange={(value) =>
                          updateJudgmentRule(ruleIndex, "type", value)
                        }>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compliance">合规性判别</SelectItem>
                          <SelectItem value="classification">
                            等级分类判别
                          </SelectItem>
                          <SelectItem value="interpretation">
                            含义解释判别
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 判别条件 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>判别条件</Label>
                        <Button
                          onClick={() => addCondition(ruleIndex)}
                          size="sm"
                          variant="outline">
                          <Plus className="h-3 w-3 mr-1" />
                          添加条件
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {rule.conditions.map((condition, conditionIndex) => (
                          <div
                            key={conditionIndex}
                            className="flex gap-2 items-start p-2 border rounded">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <Input
                                placeholder="字段名"
                                value={condition.field}
                                onChange={(e) =>
                                  updateCondition(
                                    ruleIndex,
                                    conditionIndex,
                                    "field",
                                    e.target.value,
                                  )
                                }
                              />
                              <Select
                                value={condition.operator}
                                onValueChange={(value) =>
                                  updateCondition(
                                    ruleIndex,
                                    conditionIndex,
                                    "operator",
                                    value,
                                  )
                                }>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">包含</SelectItem>
                                  <SelectItem value="equals">等于</SelectItem>
                                  <SelectItem value="greater_than">
                                    大于
                                  </SelectItem>
                                  <SelectItem value="less_than">
                                    小于
                                  </SelectItem>
                                  <SelectItem value="regex">
                                    正则匹配
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="值"
                                value={condition.value}
                                onChange={(e) =>
                                  updateCondition(
                                    ruleIndex,
                                    conditionIndex,
                                    "value",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <Button
                              onClick={() =>
                                removeCondition(ruleIndex, conditionIndex)
                              }
                              size="sm"
                              variant="ghost">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 判别动作 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>判别动作</Label>
                        <Button
                          onClick={() => addAction(ruleIndex)}
                          size="sm"
                          variant="outline">
                          <Plus className="h-3 w-3 mr-1" />
                          添加动作
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {rule.actions.map((action, actionIndex) => (
                          <div
                            key={actionIndex}
                            className="flex gap-2 items-start p-2 border rounded">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Select
                                value={action.type}
                                onValueChange={(value) =>
                                  updateAction(
                                    ruleIndex,
                                    actionIndex,
                                    "type",
                                    value,
                                  )
                                }>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="flag">标记</SelectItem>
                                  <SelectItem value="classify">分类</SelectItem>
                                  <SelectItem value="score">评分</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="值"
                                value={action.value}
                                onChange={(e) =>
                                  updateAction(
                                    ruleIndex,
                                    actionIndex,
                                    "value",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <Button
                              onClick={() =>
                                removeAction(ruleIndex, actionIndex)
                              }
                              size="sm"
                              variant="ghost">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            {type == "create" && (
              <Button
                onClick={handleSaveTask}
                className="bg-gradient-to-r from-blue-600 to-indigo-600">
                保存任务
              </Button>
            )}
            {type == "update" && (
              <Button
                onClick={handleUpdateTask}
                className="bg-gradient-to-r from-blue-600 to-indigo-600">
                修改任务
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateTaskDialog
