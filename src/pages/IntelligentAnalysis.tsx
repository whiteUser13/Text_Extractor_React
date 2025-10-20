import React, { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import FolderCard from "@/components/ui/foldercard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Brain,
  Plus,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Filter,
  Settings,
  BarChart3,
  TrendingUp,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { dataService } from "@/services/dataService"
import type { JudgmentRule, JudgmentResult, FileInfo } from "@/types"

import {
  getJudgedFoldersInfo,
  getExtractedFoldersInfo,
  requestAIAnalysis,
  FolderInfo,
} from "@/api/aiAnlysis"

const IntelligentAnalysis: React.FC = () => {
  const [rules, setRules] = useState<JudgmentRule[]>([])
  const [results, setResults] = useState<JudgmentResult[]>([])
  const [files, setFiles] = useState<FileInfo[]>([])
  const [selectedFile, setSelectedFile] = useState<string>("all")
  const [selectedRule, setSelectedRule] = useState<string>("all")
  const [selectedResult, setSelectedResult] = useState<string>("all")
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<JudgmentRule | null>(null)
  const { toast } = useToast()

  const [resultsFolderInfo, setResultsFolderInfo] = useState<FolderInfo[]>([])
  const [extractedFolderInfo, setExtractedFolderInfo] = useState<FolderInfo[]>(
    []
  )

  const form = useForm<Partial<JudgmentRule>>({
    defaultValues: {
      name: "",
      description: "",
      type: "compliance",
      conditions: [],
      actions: [],
      enabled: true,
    },
  })

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setRules(dataService.getAllJudgmentRules())
      setFiles(
        dataService.getAllFiles().filter((f) => f.status === "extracted")
      )
      const extractedFolders = await getExtractedFoldersInfo()
      const judgedFolders = await getJudgedFoldersInfo()
      setExtractedFolderInfo(extractedFolders)
      setResultsFolderInfo(judgedFolders)

      // 加载所有判别结果
      const allResults: JudgmentResult[] = []
      dataService.getAllFiles().forEach((file) => {
        const fileResults = dataService.getJudgmentResults(file.id)
        allResults.push(...fileResults)
      })
      setResults(allResults)
    }

    loadData()
    const interval = setInterval(loadData, 200000)
    return () => clearInterval(interval)
  }, [])

  // 过滤结果
  const filteredResults = results.filter((result) => {
    if (selectedFile !== "all" && result.fileId !== selectedFile) return false
    if (selectedRule !== "all" && result.ruleId !== selectedRule) return false
    if (selectedResult !== "all" && result.result !== selectedResult)
      return false
    return true
  })

  // 统计数据
  const stats = {
    total: results.length,
    pass: results.filter((r) => r.result === "pass").length,
    fail: results.filter((r) => r.result === "fail").length,
    warning: results.filter((r) => r.result === "warning").length,
  }

  // 保存规则
  const saveRule = (data: Partial<JudgmentRule>) => {
    try {
      const ruleData: JudgmentRule = {
        id: editingRule?.id || `judge-${Date.now()}`,
        name: data.name || "",
        description: data.description || "",
        type: data.type || "compliance",
        conditions: data.conditions || [],
        actions: data.actions || [],
        enabled: data.enabled ?? true,
        createdAt: editingRule?.createdAt || new Date(),
        updatedAt: new Date(),
      }

      if (editingRule) {
        dataService.updateJudgmentRule(ruleData.id, ruleData)
        toast({
          title: "规则已更新",
          description: "判别规则更新成功",
        })
      } else {
        dataService.addJudgmentRule(ruleData)
        toast({
          title: "规则已创建",
          description: "新的判别规则创建成功",
        })
      }

      setIsRuleDialogOpen(false)
      setEditingRule(null)
      form.reset()
    } catch (error) {
      toast({
        title: "保存失败",
        description: "规则保存时发生错误",
        variant: "destructive",
      })
    }
  }

  // 删除规则
  const deleteRule = (ruleId: string) => {
    dataService.deleteJudgmentRule(ruleId)
    toast({
      title: "规则已删除",
      description: "判别规则删除成功",
    })
  }

  // 切换规则状态
  const toggleRule = (ruleId: string, enabled: boolean) => {
    dataService.updateJudgmentRule(ruleId, { enabled })
    toast({
      title: enabled ? "规则已启用" : "规则已禁用",
      description: `判别规则${enabled ? "启用" : "禁用"}成功`,
    })
  }

  // ai判别
  const AIAnalysis = (folderName: string) => async () => {
    toast({
      title: "智能判别",
      description: "正在进行智能判别",
    })
    const result = await requestAIAnalysis(folderName)
    if (result.success) {
      // setFiles(result.)
      toast({
        title: "智能判别",
        description: "判别成功",
      })
    } else {
      toast({
        title: "智能判别",
        description: result.error,
      })
    }
    console.log(result)
    //刷新判别结果文件信息
    const judgedFolders = await getJudgedFoldersInfo()
    setResultsFolderInfo(judgedFolders)
  }

  // 获取结果图标和颜色
  const getResultIcon = (result: string) => {
    switch (result) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "fail":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case "pass":
        return "text-green-600 bg-green-50 border-green-200"
      case "fail":
        return "text-red-600 bg-red-50 border-red-200"
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getResultLabel = (result: string) => {
    switch (result) {
      case "pass":
        return "通过"
      case "fail":
        return "不通过"
      case "warning":
        return "警告"
      default:
        return "未知"
    }
  }

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "compliance":
        return "合规性判别"
      case "classification":
        return "等级分类"
      case "interpretation":
        return "含义解释"
      default:
        return type
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            智能判别分析
          </h1>

          <p className="text-lg text-gray-600">
            基于自定义规则进行智能判别，支持合规性检查、等级分类和含义解释
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总判别数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">通过</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.pass}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? ((stats.pass / stats.total) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">不通过</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.fail}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? ((stats.fail / stats.total) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">警告</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.warning}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? ((stats.warning / stats.total) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">判别结果</TabsTrigger>
            <TabsTrigger value="rules">规则管理</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-6">
            {/* 过滤器 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  结果筛选
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      文件筛选
                    </label>
                    <Select
                      value={selectedFile}
                      onValueChange={setSelectedFile}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择文件" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有文件</SelectItem>
                        {extractedFolderInfo.map((file) => (
                          <SelectItem
                            key={file.area_code}
                            value={file.area_code}>
                            {file.origin_folder_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      规则筛选
                    </label>
                    <Select
                      value={selectedRule}
                      onValueChange={setSelectedRule}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择规则" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有规则</SelectItem>
                        {rules.map((rule) => (
                          <SelectItem key={rule.id} value={rule.id}>
                            {rule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      结果筛选
                    </label>
                    <Select
                      value={selectedResult}
                      onValueChange={setSelectedResult}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择结果" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有结果</SelectItem>
                        <SelectItem value="pass">通过</SelectItem>
                        <SelectItem value="fail">不通过</SelectItem>
                        <SelectItem value="warning">警告</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={AIAnalysis(selectedFile)}
                      className="w-full">
                      智能判别
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 判别结果列表 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  判别结果 ({filteredResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* ✅ map 循环生成 */}
                {resultsFolderInfo.map((item) => (
                  <FolderCard
                    key={item.area_code}
                    areaCode={item.area_code}
                    folderName="results"
                    originFolderName={item.origin_folder_name}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            {/* 规则管理 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    判别规则管理
                  </span>
                  <Dialog
                    open={isRuleDialogOpen}
                    onOpenChange={setIsRuleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setEditingRule(null)
                          form.reset()
                        }}>
                        <Plus className="h-4 w-4 mr-2" />
                        新建规则
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRule ? "编辑判别规则" : "新建判别规则"}
                        </DialogTitle>
                        <DialogDescription>
                          配置智能判别规则，系统将根据规则自动分析文档内容
                        </DialogDescription>
                      </DialogHeader>

                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(saveRule)}
                          className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>规则名称</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="输入规则名称"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>规则描述</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="描述规则的用途和功能"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>判别类型</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择判别类型" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="compliance">
                                      合规性判别
                                    </SelectItem>
                                    <SelectItem value="classification">
                                      等级分类判别
                                    </SelectItem>
                                    <SelectItem value="interpretation">
                                      含义解释判别
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  选择规则的判别类型，不同类型有不同的输出格式
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    启用规则
                                  </FormLabel>
                                  <FormDescription>
                                    启用后，系统将自动应用此规则进行智能判别
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsRuleDialogOpen(false)}>
                              取消
                            </Button>
                            <Button type="submit">
                              {editingRule ? "更新规则" : "创建规则"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rules.length > 0 ? (
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <div key={rule.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{rule.name}</h3>
                              <Badge
                                variant={
                                  rule.enabled ? "default" : "secondary"
                                }>
                                {rule.enabled ? "已启用" : "已禁用"}
                              </Badge>
                              <Badge variant="outline">
                                {getRuleTypeLabel(rule.type)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {rule.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              创建时间:{" "}
                              {new Date(rule.createdAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(enabled) =>
                                toggleRule(rule.id, enabled)
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRule(rule)
                                form.reset({
                                  name: rule.name,
                                  description: rule.description,
                                  type: rule.type,
                                  enabled: rule.enabled,
                                })
                                setIsRuleDialogOpen(true)
                              }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRule(rule.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      暂无判别规则
                    </p>
                    <p className="text-sm text-gray-500">
                      请创建判别规则以开始智能分析
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default IntelligentAnalysis
