import React, { useState } from "react"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import ReactECharts from "echarts-for-react"
interface CustomField {
  key: string
  value: string
}
import { getAIStatistics } from "@/api/aiResult"
import { useToast } from "@/hooks/use-toast"
const AIStatisticsPanel: React.FC<{ task_id: string }> = ({ task_id }) => {
  const { toast } = useToast()
  const [statType, setStatType] = useState("all")
  const [chartType, setChartType] = useState("pie")
  const [model, setModel] = useState("online")
  const [prompt, setPrompt] = useState("")
  const [fields, setFields] = useState<CustomField[]>([{ key: "", value: "" }])
  const [loading, setLoading] = useState(false)

  const [chartData, setChartData] = useState<any[]>([])
  const getPieOption = () => ({
    tooltip: {
      trigger: "item",
    },
    legend: {
      bottom: 0,
    },
    series: [
      {
        name: "统计结果",
        type: "pie",
        radius: "50%",
        data: chartData,
      },
    ],
  })
  const getBarOption = () => ({
    tooltip: {},
    xAxis: {
      type: "category",
      data: chartData.map((item) => item.name),
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "数量",
        type: "bar",
        data: chartData.map((item) => item.value),
      },
    ],
  })
  // 添加字段
  const addField = () => {
    setFields([...fields, { key: "", value: "" }])
  }

  // 删除字段
  const removeField = (index: number) => {
    const newFields = [...fields]
    newFields.splice(index, 1)
    setFields(newFields)
  }

  // 修改字段
  const updateField = (index: number, type: "key" | "value", val: string) => {
    const newFields = [...fields]
    newFields[index][type] = val
    setFields(newFields)
  }

  // 提交
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await getAIStatistics(
        model,
        task_id,
        statType,
        prompt,
        fields.filter((f) => f.key).map((f) => f.key),
      )
      if (res.success) {
        setChartData(
          res.data.map((item: any) => ({ name: item.name, value: item.value })),
        )
        toast({
          title: "获取统计数据成功",
        })
      } else {
        toast({
          title: "获取统计数据失败",
          description: res.msg,
          variant: "destructive",
        })
      }

      // 假设后端返回格式
    } catch (err) {
      console.error("请求失败:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold mb-4">AI统计分析</h3>

      {/* 左右布局 */}
      <div className="flex gap-6">
        {/* 左侧：配置区域 */}
        <div className="w-1/3">
          {/* 选择项 */}
          <div className="flex gap-4 mb-4 flex-wrap">
            <div>
              <span className="block text-sm mb-1">统计类型</span>
              <Select value={statType} onValueChange={setStatType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择统计类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="judge">判别结果</SelectItem>
                  <SelectItem value="extract">提取结果</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <span className="block text-sm mb-1">统计图表</span>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="图表类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">饼图</SelectItem>
                  <SelectItem value="bar">柱状图</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="block text-sm mb-1">使用模型</span>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="模型类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">deepseek在线模型</SelectItem>
                  <SelectItem value="guangzhou">广州模型</SelectItem>
                  <SelectItem value="env">环境部模型</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 提示词 */}
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">统计提示词</div>
            <Textarea
              placeholder="请输入统计提示词，例如：统计不同违规类型的数量分布"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* 自定义字段 */}
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="font-medium">自定义统计字段</span>
              <Button onClick={addField}>添加字段</Button>
            </div>

            {fields.map((field, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="字段名"
                  value={field.key}
                  onChange={(e) => updateField(index, "key", e.target.value)}
                />
                {/* <Input
                  placeholder="字段值"
                  value={field.value}
                  onChange={(e) => updateField(index, "value", e.target.value)}
                /> */}
                <Button
                  variant="destructive"
                  onClick={() => removeField(index)}>
                  删除
                </Button>
              </div>
            ))}
          </div>

          {/* 提交 */}
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "提交中..." : "提交统计"}
            </Button>
          </div>
        </div>

        {/* 右侧：图表区域 */}
        <div className="w-2/3">
          <div className="bg-gray-50 p-4 rounded-xl h-full flex flex-col">
            <h4 className="text-md font-semibold mb-4">统计图表</h4>

            {/* loading */}
            {loading && (
              <div className="text-center text-gray-400 mt-10">
                图表加载中...
              </div>
            )}

            {/* 空数据 */}
            {!loading && chartData.length === 0 && (
              <div className="text-center text-gray-400 mt-10">
                暂无统计数据
              </div>
            )}

            {/* 图表 */}
            {!loading && chartData.length > 0 && (
              <ReactECharts
                option={chartType === "pie" ? getPieOption() : getBarOption()}
                style={{ height: 400 }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIStatisticsPanel
