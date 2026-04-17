import React, { useCallback, useEffect, useState } from "react"
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
import { useTaskStore } from "@/context/TaskContext"
import ReactECharts from "echarts-for-react"
interface CustomField {
  key: string
  value: string
}
interface StatsItem {
  stats_name: string
  stats_prompt: string
  stats_result: { name: string; value: number }[]
}
interface AIStatisticsPreviewProps {
  task_id: string
  refreshTick?: number
}
import {
  getSavedStatsInScene,
  getSavedStatsInTask,
  generateWordBaseTaskStats,
  generateWordBaseSceneStats,
} from "@/api/aiResult"
import { useToast } from "@/hooks/use-toast"
import AIStatsCard from "@/components/AIResult/AIStatsCard"
const AIStatisticsPreview: React.FC<AIStatisticsPreviewProps> = ({
  task_id,
  refreshTick = 0,
}) => {
  const { toast } = useToast()
  const { selectedTask } = useTaskStore()

  const [taskStatsList, setTaskStatsList] = useState<StatsItem[]>([])
  const [sceneStatsList, setSceneStatsList] = useState<StatsItem[]>([])
  const [selectedStats, setSelectedStats] = useState<StatsItem | null>(null)
  const [selectedStatsName, setSelectedStatsName] = useState<string>("")
  const [selectedChartData, setSelectedChartData] = useState<any[]>([])

  const getPieOption = () => ({
    title: {
      text: selectedStatsName || "统计结果", // 主标题
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
      },
    },
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
        data: selectedChartData,
      },
    ],
  })
  const getBarOption = () => ({
    title: {
      text: selectedStatsName || "统计结果", // 主标题
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
      },
    },
    tooltip: {},
    xAxis: {
      type: "category",
      data: selectedChartData.map((item) => item.name),
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        name: "数量",
        type: "bar",
        data: selectedChartData.map((item) => item.value),
      },
    ],
  })

  const fetchStats = useCallback(async () => {
    if (!selectedTask) return
    const res1 = await getSavedStatsInTask(task_id)
    // 处理返回的统计数据
    if (res1.success) {
      setTaskStatsList(res1.data)
    } else {
      toast({
        title: "获取任务统计数据失败",
        variant: "destructive",
      })
    }
    const res2 = await getSavedStatsInScene(selectedTask.sceneId || "")
    if (res2.success) {
      setSceneStatsList(res2.data)
    } else {
      toast({
        title: "获取场景统计数据失败",
        variant: "destructive",
      })
    }
  }, [selectedTask])
  useEffect(() => {
    fetchStats()
  }, [fetchStats, refreshTick])

  const handleUseStats = (item: StatsItem) => {
    console.log("使用统计:", item)
    setSelectedStats(item)
    setSelectedStatsName(item.stats_name)
    setSelectedChartData(item.stats_result) // 更新图表数据
  }

  const handleTaskStatsExport = () => {
    // 导出当前任务的统计数据为json，不要乱码
    if (taskStatsList.length === 0) {
      toast({
        title: "没有统计数据可供导出",
        variant: "destructive",
      })
      return
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(taskStatsList, null, 2))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "task_stats.json")
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }
  const handleSceneStatsExport = () => {
    // 导出当前任务的统计数据
    if (sceneStatsList.length === 0) {
      toast({
        title: "没有统计数据可供导出",
        variant: "destructive",
      })
      return
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(sceneStatsList, null, 2))
    const downloadAnchorNode = document.createElement("a")
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", "scene_stats.json")
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }
  const handleTaskStats2Word = async () => {
    // 生成当前任务的统计数据为Word文档
    if (taskStatsList.length === 0) {
      toast({
        title: "没有统计数据可供生成",
        variant: "destructive",
      })
      return
    }
    const res = await generateWordBaseTaskStats(task_id)
    if (res.success) {
      toast({
        title: "生成Word文档成功",
      })
      const link = document.createElement("a")
      link.href = `/api/file/task-results/${task_id}/${res.data.filename}?token=${localStorage.getItem("token")}`
      link.setAttribute("download", res.data.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } else {
      toast({
        title: "生成Word文档失败",
        variant: "destructive",
      })
    }
  }

  const handleSceneStats2Word = async () => {
    // 生成当前场景的统计数据为Word文档
    if (sceneStatsList.length === 0) {
      toast({
        title: "没有统计数据可供生成",
        variant: "destructive",
      })
      return
    }
    //
    const res = await generateWordBaseSceneStats(
      selectedTask?.sceneId || "",
      task_id,
    )
    if (res.success) {
      toast({
        title: "生成Word文档成功",
      })
      //根据res.data.filename下载文件,需要携带身份认证和task_id,
      const link = document.createElement("a")
      link.href = `/api/file/task-results/${task_id}/${res.data.filename}?token=${localStorage.getItem("token")}`
      link.setAttribute("download", res.data.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } else {
      toast({
        title: "生成Word文档失败",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="mt-6 bg-white p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold mb-4">已保存统计信息</h3>

      {/* 左右布局 */}
      <div className="flex gap-3 h-[600px]">
        {/* 左侧：配置区域 */}
        <div className="w-1/3">
          {/* 统计卡片列表 */}
          <div className="h-[550px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 overflow-y-auto pr-2">
            {taskStatsList.map((item, index) => (
              <div className="mt-1">
                <AIStatsCard key={index} data={item} onUse={handleUseStats} />
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button
              variant="ghost"
              className="text-blue-500 hover:text-blue-600"
              onClick={() => handleTaskStatsExport()}>
              导出数据
            </Button>
            <Button
              variant="ghost"
              className="text-blue-500 hover:text-blue-600"
              onClick={() => handleTaskStats2Word()}>
              生成word文档
            </Button>
          </div>
        </div>

        <div className="w-1/3 flex flex-col gap-2">
          <div className="bg-gray-50 p-4 rounded-xl flex flex-col flex-1">
            <h4 className="text-md font-semibold mb-4">柱状图</h4>
            {/* 图表 */}
            {selectedStats && selectedStats.stats_result.length > 0 && (
              <ReactECharts
                option={getBarOption()}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-xl flex flex-col flex-1">
            <h4 className="text-md font-semibold mb-4">饼图</h4>
            {/* 图表 */}
            {selectedStats && selectedStats.stats_result.length > 0 && (
              <ReactECharts
                option={getPieOption()}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>
        </div>
        <div className="w-1/3">
          {/* 统计卡片列表 */}
          <div className="h-[550px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 overflow-y-auto pr-2">
            {sceneStatsList.map((item, index) => (
              <div className="mt-1">
                <AIStatsCard key={index} data={item} onUse={handleUseStats} />
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button
              variant="ghost"
              className="text-blue-500 hover:text-blue-600"
              onClick={() => handleSceneStatsExport()}>
              导出json数据
            </Button>
            <Button
              variant="ghost"
              className="text-blue-500 hover:text-blue-600"
              onClick={() => handleSceneStats2Word()}>
              生成word文档
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIStatisticsPreview
