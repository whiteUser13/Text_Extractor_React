import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import DataList from "@/components/FileUpload/DataList"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Eye,
  PieChart,
  TrendingUp,
  AlertTriangle,
  MapPin,
  ListChecks,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { useTaskStore } from "@/context/TaskContext"
import {
  PDFFileInfo,
  getFilesInfo,
  getFileDetailsByName,
  getPdfPath,
} from "@/api/aiResult"
import FileDetailDialog, {
  PDFDetailInfo,
} from "@/components/AIResult/FileDetailDialog"
import EditDetailDialog from "@/components/AIResult/EditDetailDialog"
import ChinaEChartsMap from "@/components/AIResult/ChinaEChartsMap"
import AIStatisticsPanel from "@/components/AIResult/AIStatisticsPanel"
import AIStatisticsPreview from "@/components/AIResult/AIStatisticsPreview"
import {
  getTaskStatistics,
  getClueList,
  getRegionDistribution,
  type TaskStatistics,
  type ClueItem,
  type RegionDistribution,
} from "@/api/statistics"

const SimplePieChart: React.FC<{
  data: Array<{ name: string; value: number; color: string }>
  title: string
  total?: number
}> = ({ data, total }) => {
  const safeData = Array.isArray(data) ? data : []
  const totalValue =
    total || safeData.reduce((sum, item) => sum + (item.value || 0), 0)
  const validData = safeData.filter((item) => item.value > 0)

  if (validData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <PieChart className="h-12 w-12 mb-2" />
        <p className="text-sm">暂无违规数据</p>
      </div>
    )
  }

  let cumulativePercentage = 0
  const segments = validData.map((item) => {
    const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0
    const startPercentage = cumulativePercentage
    cumulativePercentage += percentage
    return { ...item, percentage, startPercentage }
  })

  const conicGradient = segments
    .map(
      (seg) =>
        `${seg.color} ${seg.startPercentage}% ${
          seg.startPercentage + seg.percentage
        }%`,
    )
    .join(", ")

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div
          className="w-32 h-32 rounded-full shadow-sm"
          style={{ background: `conic-gradient(${conicGradient})` }}
        />
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
        {validData.map((item, idx) => (
          <div
            key={`legend-${item.name}-${idx}`}
            className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span
                className="text-slate-600 truncate max-w-[100px]"
                title={item.name}>
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-900 font-medium">{item.value}</span>
              <span className="text-slate-500 w-12 text-right">
                {totalValue > 0
                  ? ((item.value / totalValue) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SimpleBarChart: React.FC<{
  data: Array<{
    name: string
    value: number
    color?: string
    foundCount?: number
    totalFiles?: number
  }>
  title: string
}> = ({ data }) => {
  const safeData = Array.isArray(data) ? data : []
  const maxValue = Math.max(...safeData.map((item) => item.value), 1)

  if (safeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <TrendingUp className="h-12 w-12 mb-2" />
        <p className="text-sm">暂无字段数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
      {safeData.map((item, idx) => (
        <div key={`bar-${item.name}-${idx}`} className="space-y-1">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="text-slate-600 truncate max-w-[120px]"
                title={item.name}>
                {item.name}
              </span>
              {item.value === 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-gray-50 text-gray-500">
                  未提取到
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-medium ${
                  item.value === 0 ? "text-gray-400" : "text-slate-900"
                }`}>
                {item.value}%
              </span>
              {item.foundCount !== undefined &&
                item.totalFiles !== undefined &&
                item.totalFiles > 0 && (
                  <span className="text-xs text-slate-400">
                    ({item.foundCount}/{item.totalFiles})
                  </span>
                )}
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                item.value === 0 ? "bg-gray-300" : ""
              }`}
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor:
                  item.value === 0 ? "#d1d5db" : item.color || "#3b82f6",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

const AIResult: React.FC = () => {
  const { toast } = useToast()
  const { selectedTaskId, selectedTask } = useTaskStore()

  const [savedStatsRefreshTick, setSavedStatsRefreshTick] = useState(0)
  const handleStatsSavedSuccess = () => {
    setSavedStatsRefreshTick((v) => v + 1)
  }
  const [activeTab, setActiveTab] = useState<string>("preview")
  const [filelist, setFilelist] = useState<PDFFileInfo[]>([])
  const [allFilelist, setAllFilelist] = useState<PDFFileInfo[]>([])
  const [keyword, setKeyword] = useState<string>("")
  const [violationFilter, setViolationFilter] = useState<string>("all")
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editDetailOpen, setEditDetailOpen] = useState(false)
  const [editDetailLoading, setEditDetailLoading] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<PDFDetailInfo | null>(
    null,
  )

  const [statistics, setStatistics] = useState<TaskStatistics>({
    total_files: 0,
    extracted_files: 0,
    judged_files: 0,
    reviewed_files: 0,
    violation_types: [],
    field_extraction_rate: [],
  })
  const [clueList, setClueList] = useState<ClueItem[]>([])
  const [clueTotal, setClueTotal] = useState(0)
  const [cluePage, setCluePage] = useState(1)
  const [regionData, setRegionData] = useState<RegionDistribution[]>([])
  const [currentTaskRegionData, setCurrentTaskRegionData] = useState<
    RegionDistribution[]
  >([]) // 0317修改：单独保存当前任务地域数据
  const [currentTaskProvince, setCurrentTaskProvince] = useState<string>("") // 0317修改：不再依赖 regionData.find 猜当前省份
  const [regionViewMode, setRegionViewMode] = useState<"all" | "current">("all") // 0317修改：响应领导建议，增加任务数据视图切换
  const [loading, setLoading] = useState({
    statistics: false,
    clues: false,
    region: false,
    files: false,
  })

  const pieColors = [
    "#f87171",
    "#fbbf24",
    "#60a5fa",
    "#34d399",
    "#a78bfa",
    "#f472b6",
    "#94a3b8",
    "#fb923c",
    "#a3e635",
    "#38bdf8",
  ]

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "judged":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      judged: "已判别",
      unjudge: "未判别",
    }
    return labels[status] || status || "-"
  }

  const getValidStatusBgcolor = (status: string): string => {
    switch (status) {
      case "legal":
        return "bg-green-100 text-green-700 hover:bg-green-200"
      case "illegal":
        return "bg-red-100 text-red-700 hover:bg-red-200"
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }
  }

  const getValidStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      legal: "合规",
      illegal: "违规",
      unknown: "未知",
    }
    return labels[status] || status || "-"
  }

  const getFileDetail = async (fileName: string, task_id: string) => {
    try {
      const details = await getFileDetailsByName(fileName, task_id)
      if (details.success) {
        const detail = {
          file_name: details.data.file_name,
          extracted_fields: details.data.extraction_result || {},
          ai_extracted_fields: details.data.ai_extraction_results || {},
          page_idx: details.data.page_idx || {},
          judge_result: details.data.judge_result || {},
          ai_judged_fields: details.data.ai_judged_results || {},
        }
        const pdfDetail: PDFDetailInfo = {
          file_name: details.data.file_name,
          pdf_url: "",
          extracted_fields: [],
          ai_extracted_fields: [],
          judged_fields: [],
          ai_judged_fields: [],
        }
        Object.keys(detail.extracted_fields).forEach((el) => {
          pdfDetail.extracted_fields?.push({
            field_name: el,
            field_value: detail.extracted_fields[el],
            page_num: detail.page_idx[el],
          })
        })
        Object.keys(detail.ai_extracted_fields).forEach((el) => {
          pdfDetail.ai_extracted_fields?.push({
            extract_name: el,
            extract_value: detail.ai_extracted_fields[el],
          })
        })
        Object.keys(detail.ai_judged_fields).forEach((el) => {
          pdfDetail.ai_judged_fields?.push({
            judged_name: el,
            judged_value: detail.ai_judged_fields[el],
          })
        })
        Object.keys(detail.judge_result).forEach((el) => {
          pdfDetail.judged_fields?.push({
            judged_name: el,
            judged_value: detail.judge_result[el],
          })
        })
        return pdfDetail
      } else {
        console.error("获取文件详情失败:", details.msg)
        return null
      }
    } catch (error) {
      console.error("获取文件详情出错:", error)
      return null
    }
  }

  const previewDetails = async (
    file_name: string,
    mode: "preview" | "edit" = "preview",
  ) => {
    try {
      if (mode === "preview") {
        setDetailOpen(true)
        setDetailLoading(true)
      } else {
        setEditDetailOpen(true)
        setEditDetailLoading(true)
      }

      const detail = await getFileDetail(file_name, selectedTaskId)
      if (detail) {
        const pdf_path = await getPdfPath(file_name, selectedTaskId)
        if (pdf_path.success && pdf_path.path) {
          if (pdf_path.path.startsWith("pdf_cut")) {
            detail.pdf_url =
              "/api/file/task-cut/" +
              selectedTaskId +
              "/" +
              pdf_path.path +
              "?task_id=" +
              selectedTaskId
          } else if (pdf_path.path.startsWith("downloads")) {
            detail.pdf_url =
              "/api/file/task-downloads/" +
              selectedTaskId +
              "/" +
              pdf_path.path +
              "?task_id=" +
              selectedTaskId
          } else {
            detail.pdf_url = pdf_path.path
          }
        }
        setSelectedDetail(detail)
      }
    } catch (error) {
      toast({
        title: "获取详情失败",
        variant: "destructive",
      })
    } finally {
      if (mode === "preview") {
        setDetailLoading(false)
      } else {
        setEditDetailLoading(false)
      }
    }
  }

  const fileTabColumns = [
    { key: "file_name", label: "文件名" },
    {
      key: "status",
      label: "判别状态",
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(value)}`} />
          <span className="text-sm">{getStatusLabel(value)}</span>
        </div>
      ),
    },
    {
      key: "valid",
      label: "是否违规",
      render: (value: string) => (
        <Badge className={getValidStatusBgcolor(value)}>
          {getValidStatusLabel(value)}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "操作",
      render: (_: any, record: PDFFileInfo) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => previewDetails(record.file_name, "preview")}
            className="text-blue-500 hover:text-blue-600">
            查看详情
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => previewDetails(record.file_name, "edit")}
            className="text-blue-500 hover:text-blue-600">
            复核信息
          </Button>
        </div>
      ),
    },
  ]

  const handleFilterChange = (value: string) => {
    setViolationFilter(value)
    filterFiles(keyword, value)
  }

  const handleSearch = () => {
    filterFiles(keyword, violationFilter)
  }

  const cancelInput = () => {
    setKeyword("")
    setViolationFilter("all")
    setFilelist(allFilelist)
  }

  const filterFiles = (searchKeyword: string, filterValue: string) => {
    const trimmedKeyword = searchKeyword.trim().toLowerCase()
    const safeFilelist = Array.isArray(allFilelist) ? allFilelist : []

    const filteredList = safeFilelist.filter((item) => {
      const fileName = item.file_name || ""
      const matchKeyword =
        !trimmedKeyword || fileName.toLowerCase().includes(trimmedKeyword)
      const matchViolation =
        filterValue === "all" ||
        (filterValue === "true" && item.valid === "illegal") ||
        (filterValue === "false" && item.valid === "legal")
      return matchKeyword && matchViolation
    })

    setFilelist(filteredList)
  }

  const filterButtonClass = (value: string) => {
    const base =
      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border"
    const activeMap: Record<string, string> = {
      all: "bg-blue-500 text-white border-blue-500 shadow-sm",
      true: "bg-red-500 text-white border-red-500 shadow-sm",
      false: "bg-green-500 text-white border-green-500 shadow-sm",
    }
    return violationFilter === value
      ? `${base} ${activeMap[value]}`
      : `${base} bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300`
  }

  const getViolationPieData = () => {
    if (
      !Array.isArray(statistics.violation_types) ||
      statistics.violation_types.length === 0
    )
      return []
    return statistics.violation_types.map((item, index) => ({
      name: item.type || "未知",
      value: item.count || 0,
      color: pieColors[index % pieColors.length],
    }))
  }

  const getFieldRateData = () => {
    if (!Array.isArray(statistics.field_extraction_rate)) return []
    return statistics.field_extraction_rate.map((item, index) => ({
      name: item.field_name || "未知字段",
      value: item.rate || 0,
      foundCount: item.found_count,
      totalFiles: item.total_files,
      color: pieColors[index % pieColors.length],
    }))
  }

  const totalViolations = Array.isArray(statistics.violation_types)
    ? statistics.violation_types.reduce(
        (sum, item) => sum + (item.count || 0),
        0,
      )
    : 0

  const extractProvinceFromFileName = (fileName: string): string => {
    const provinces = [
      "北京",
      "上海",
      "天津",
      "重庆",
      "河北",
      "山西",
      "辽宁",
      "吉林",
      "黑龙江",
      "江苏",
      "浙江",
      "安徽",
      "福建",
      "江西",
      "山东",
      "河南",
      "湖北",
      "湖南",
      "广东",
      "海南",
      "四川",
      "贵州",
      "云南",
      "陕西",
      "甘肃",
      "青海",
      "台湾",
      "内蒙古",
      "广西",
      "西藏",
      "宁夏",
      "新疆",
      "香港",
      "澳门",
    ]
    for (const p of provinces) {
      if (fileName.includes(p)) {
        if (p === "香港") return "香港特别行政区"
        if (p === "澳门") return "澳门特别行政区"
        if (p === "台湾") return "台湾省"
        if (["内蒙古", "广西", "西藏", "宁夏", "新疆"].includes(p)) {
          const suffix =
            p === "新疆"
              ? "维吾尔自治区"
              : p === "内蒙古"
                ? "自治区"
                : p === "广西"
                  ? "壮族自治区"
                  : p === "西藏"
                    ? "自治区"
                    : p === "宁夏"
                      ? "回族自治区"
                      : ""
          return p + suffix
        }
        return p + "省"
      }
    }
    return "其他地区"
  }

  const calculateRegionDistribution = (
    files: PDFFileInfo[],
  ): RegionDistribution[] => {
    const regionMap = new Map<
      string,
      { count: number; illegal: number; legal: number }
    >()
    files.forEach((file) => {
      const province = extractProvinceFromFileName(file.file_name)
      const current = regionMap.get(province) || {
        count: 0,
        illegal: 0,
        legal: 0,
      }
      current.count += 1
      if (file.valid === "illegal") current.illegal += 1
      else if (file.valid === "legal") current.legal += 1
      regionMap.set(province, current)
    })
    return Array.from(regionMap.entries()).map(([province, stats]) => ({
      province,
      count: stats.count,
      illegal_count: stats.illegal,
      legal_count: stats.legal,
      is_current_task: false,
      industry_violation_count: 0,
    }))
  }

  const loadAllStatistics = async (
    taskId: string,
    files: PDFFileInfo[],
    sceneId?: string,
    viewMode: "current" | "all" = "all",
  ) => {
    try {
      await Promise.all([
        (async () => {
          setLoading((prev) => ({ ...prev, statistics: true }))
          try {
            // 根据视图模式决定传递哪个参数
            const statsResult =
              viewMode === "current"
                ? await getTaskStatistics(taskId)
                : await getTaskStatistics(undefined, sceneId)
            if (statsResult.success && statsResult.data) {
              setStatistics({
                total_files: statsResult.data.total_files || 0,
                extracted_files: statsResult.data.extracted_files || 0,
                judged_files: statsResult.data.judged_files || 0,
                reviewed_files: statsResult.data.reviewed_files || 0,
                violation_types: Array.isArray(statsResult.data.violation_types)
                  ? statsResult.data.violation_types
                  : [],
                field_extraction_rate: Array.isArray(
                  statsResult.data.field_extraction_rate,
                )
                  ? statsResult.data.field_extraction_rate
                  : [],
              })
            }
          } catch (error) {
            console.error("获取统计数据出错:", error)
          } finally {
            setLoading((prev) => ({ ...prev, statistics: false }))
          }
        })(),
        (async () => {
          setLoading((prev) => ({ ...prev, clues: true }))
          try {
            // 根据视图模式决定传递哪个参数
            const clueResult =
              viewMode === "current"
                ? await getClueList(taskId, undefined, 1, 10)
                : await getClueList(undefined, sceneId, 1, 10)
            if (clueResult.success && clueResult.data) {
              setClueList(
                Array.isArray(clueResult.data.items)
                  ? clueResult.data.items
                  : [],
              )
              setClueTotal(clueResult.data.total || 0)
              setCluePage(1)
            }
          } catch (error) {
            console.error("获取线索清单出错:", error)
            setClueList([])
            setClueTotal(0)
          } finally {
            setLoading((prev) => ({ ...prev, clues: false }))
          }
        })(),
        (async () => {
          setLoading((prev) => ({ ...prev, region: true }))
          try {
            // 根据视图模式决定传递哪个参数
            const regionResult =
              viewMode === "current"
                ? await getRegionDistribution(taskId)
                : await getRegionDistribution(undefined, sceneId)
            if (regionResult.success && regionResult.data) {
              const regionPayload = regionResult.data as any

              if (Array.isArray(regionPayload)) {
                // 0317修改：兼容旧接口
                setRegionData(regionPayload)
                const current = regionPayload.find(
                  (r: any) => r.is_current_task,
                )
                setCurrentTaskProvince(current?.province || "")
                setCurrentTaskRegionData(
                  current
                    ? [
                        {
                          province: current.province,
                          count: current.count,
                          illegal_count: current.illegal_count,
                          legal_count: current.legal_count,
                          is_current_task: true,
                          industry_violation_count:
                            current.industry_violation_count || 0,
                        },
                      ]
                    : [],
                )
              } else {
                // 0317修改：新接口，直接读取 current_task_province / current_task_stat / regions
                setRegionData(
                  Array.isArray(regionPayload.regions)
                    ? regionPayload.regions
                    : [],
                )
                setCurrentTaskProvince(
                  regionPayload.current_task_province || "",
                )
                setCurrentTaskRegionData(
                  regionPayload.current_task_stat
                    ? [
                        {
                          ...regionPayload.current_task_stat,
                          industry_violation_count:
                            regionPayload.current_task_stat
                              .industry_violation_count || 0,
                        },
                      ]
                    : [],
                )
              }
            } else {
              console.warn("地域分布API失败，从文件列表计算")
              const fallbackData = calculateRegionDistribution(files)
              setRegionData(fallbackData)
              setCurrentTaskRegionData([])
              setCurrentTaskProvince("")
            }
          } catch (error) {
            console.error("获取地域分布失败，从文件列表计算:", error)
            const fallbackData = calculateRegionDistribution(files)
            setRegionData(fallbackData)
            setCurrentTaskRegionData([])
            setCurrentTaskProvince("")
          } finally {
            setLoading((prev) => ({ ...prev, region: false }))
          }
        })(),
      ])
    } catch (error) {
      console.error("加载统计数据整体失败:", error)
    }
  }

  const loadMoreClues = async () => {
    if (!selectedTaskId) return
    try {
      setLoading((prev) => ({ ...prev, clues: true }))
      const nextPage = cluePage + 1
      // 获取当前任务的sceneId
      const currentSceneId = selectedTask?.sceneId || "default"
      // 根据当前视图模式加载更多线索
      const result =
        regionViewMode === "current"
          ? await getClueList(selectedTaskId, undefined, nextPage, 10)
          : await getClueList(undefined, currentSceneId, nextPage, 10)
      if (result.success && result.data) {
        setClueList((prev) => [
          ...prev,
          ...(Array.isArray(result.data.items) ? result.data.items : []),
        ])
        setClueTotal(result.data.total || 0)
        setCluePage(nextPage)
      }
    } catch (error) {
      console.error("加载更多线索失败:", error)
    } finally {
      setLoading((prev) => ({ ...prev, clues: false }))
    }
  }

  const currentProvinceFullName = currentTaskProvince // 0317修改：高亮来源改为显式 state
  const displayedRegionData =
    regionViewMode === "current" ? currentTaskRegionData : regionData // 0317修改：统计页增加“当前任务/全部任务”视图

  useEffect(() => {
    const loadFilesInfo = async (task_id: string) => {
      try {
        setLoading((prev) => ({ ...prev, files: true }))
        const result = await getFilesInfo(task_id)
        if (result.success && Array.isArray(result.data)) {
          setAllFilelist(result.data)
          setFilelist(result.data)
        } else {
          console.error("获取任务列表失败:", result.msg)
          setAllFilelist([])
          setFilelist([])
        }
      } catch (error) {
        console.error("获取文件列表出错:", error)
        setAllFilelist([])
        setFilelist([])
      } finally {
        setLoading((prev) => ({ ...prev, files: false }))
      }
    }
    if (activeTab == "preview") {
      if (selectedTaskId) {
        loadFilesInfo(selectedTaskId)
      }
    }

    if (activeTab == "statistic") {
      // 获取当前任务的sceneId
      const currentSceneId = selectedTask?.sceneId
      // 如果sceneId无效（空、undefined、"default"等），则只使用taskId进行单任务统计
      const validSceneId =
        currentSceneId && currentSceneId.trim() ? currentSceneId : undefined
      loadAllStatistics(selectedTaskId, filelist, validSceneId, regionViewMode)
    }
  }, [selectedTaskId, activeTab, regionViewMode])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6">
          <TabsList className="grid w-full max-w-[360px] grid-cols-2">
            <TabsTrigger value="preview">结果预览</TabsTrigger>
            <TabsTrigger value="statistic">结果统计</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    className="w-72"
                    placeholder="请输入文件名进行查询"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch}>查询</Button>
                  <Button onClick={cancelInput} variant="outline">
                    清空
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-700">
                    是否违规：
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFilterChange("all")}
                      className={filterButtonClass("all")}>
                      全部
                    </button>
                    <button
                      onClick={() => handleFilterChange("true")}
                      className={filterButtonClass("true")}>
                      违规
                    </button>
                    <button
                      onClick={() => handleFilterChange("false")}
                      className={filterButtonClass("false")}>
                      合规
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-6">
                {loading.files ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                  </div>
                ) : (
                  <DataList
                    key="file-list"
                    data={filelist}
                    columns={fileTabColumns}
                  />
                )}
              </CardContent>
            </Card>
            <AIStatisticsPanel
              task_id={selectedTaskId}
              onSavedSuccess={handleStatsSavedSuccess}
            />
            <AIStatisticsPreview
              task_id={selectedTaskId}
              refreshTick={savedStatsRefreshTick}
            />
          </TabsContent>

          <TabsContent value="statistic" className="space-y-6">
            <Card className="bg-white/90 backdrop-blur shadow-md border-0 rounded-2xl">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-4 w-1 rounded-full bg-blue-500" />
                  <h3 className="text-base font-semibold text-slate-800">
                    文件处理概览统计
                  </h3>
                  {loading.statistics && (
                    <span className="text-sm text-slate-400 ml-2">
                      加载中...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {statistics.total_files}
                    </div>
                    <div className="mt-1 text-sm text-blue-700">文件总数</div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {statistics.extracted_files}
                    </div>
                    <div className="mt-1 text-sm text-green-700">
                      已提取数量
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-6 text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {statistics.judged_files}
                    </div>
                    <div className="mt-1 text-sm text-purple-700">
                      已判别数量
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6 text-center">
                    <div className="text-3xl font-bold text-amber-600">
                      {statistics.reviewed_files}
                    </div>
                    <div className="mt-1 text-sm text-amber-700">
                      已核查数量
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-2">
                <Card className="bg-white/90 backdrop-blur shadow-md border-0 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      违规问题占比
                      {totalViolations > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          总计 {totalViolations} 条
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading.statistics ? (
                      <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                      </div>
                    ) : (
                      <SimplePieChart
                        data={getViolationPieData()}
                        title="违规问题占比"
                        total={totalViolations}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/90 backdrop-blur shadow-md border-0 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      字段提取率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading.statistics ? (
                      <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                      </div>
                    ) : (
                      <SimpleBarChart
                        data={getFieldRateData()}
                        title="字段提取率"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-6">
                <Card className="bg-white/90 backdrop-blur shadow-md border-0 rounded-2xl h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-purple-500" />
                        中国地域分布
                        {loading.region && (
                          <span className="text-xs text-slate-400 ml-2">
                            加载中...
                          </span>
                        )}
                        {!loading.region && displayedRegionData.length > 0 && (
                          <Badge variant="outline" className="text-xs ml-2">
                            覆盖{" "}
                            {
                              displayedRegionData.filter((r) => r.count > 0)
                                .length
                            }{" "}
                            个省份
                          </Badge>
                        )}
                        {currentProvinceFullName && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs ml-2">
                            当前任务：{currentProvinceFullName}
                          </Badge>
                        )}
                      </CardTitle>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={
                            regionViewMode === "all" ? "default" : "outline"
                          }
                          onClick={() => setRegionViewMode("all")}
                          className="h-8">
                          全部任务
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            regionViewMode === "current" ? "default" : "outline"
                          }
                          onClick={() => setRegionViewMode("current")}
                          className="h-8">
                          当前任务
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {!loading.region && displayedRegionData.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-3 bg-slate-50 rounded-lg p-2">
                        <div className="text-center">
                          <div className="text-xs text-slate-500">覆盖省份</div>
                          <div className="text-base font-bold text-blue-600">
                            {
                              displayedRegionData.filter((r) => r.count > 0)
                                .length
                            }
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">文件总数</div>
                          <div className="text-base font-bold text-green-600">
                            {displayedRegionData.reduce(
                              (sum, r) => sum + r.count,
                              0,
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">违规总数</div>
                          <div className="text-base font-bold text-red-600">
                            {displayedRegionData.reduce(
                              (sum, r) => sum + r.illegal_count,
                              0,
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500">
                            违规中重点行业数量
                          </div>
                          <div className="text-base font-bold text-orange-600">
                            {displayedRegionData.reduce(
                              (sum, r) =>
                                sum + (r.industry_violation_count || 0),
                              0,
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="h-[450px]">
                      <ChinaEChartsMap
                        data={displayedRegionData}
                        // loading={loading.region}
                        currentProvinceFullName={currentProvinceFullName}
                        autoHighlightCurrent={regionViewMode === "current"} // 0317修改：当前任务视图下自动高亮当前省份
                        onProvinceClick={(province, data) =>
                          console.log("点击省份:", province, data)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4">
                <Card className="bg-white/90 backdrop-blur shadow-md border-0 rounded-2xl h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-green-500" />
                        线索清单
                        {loading.clues && (
                          <span className="text-xs text-slate-400 ml-2">
                            加载中...
                          </span>
                        )}
                        {!loading.clues && clueTotal > 0 && (
                          <Badge variant="outline" className="text-xs">
                            共 {clueTotal} 条
                          </Badge>
                        )}
                      </CardTitle>
                      {!loading.clues &&
                        clueList.length < clueTotal &&
                        clueTotal > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadMoreClues}
                            className="text-blue-500 hover:text-blue-600 text-xs">
                            更多 &gt;&gt;
                          </Button>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[450px] max-h-[500px] overflow-y-auto">
                      {loading.clues ? (
                        <div className="flex items-center justify-center h-[450px]">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                      ) : clueList.length > 0 ? (
                        <div className="space-y-3">
                          {clueList.map((clue) => (
                            <div
                              key={`clue-${clue.id || clue.file_name}`}
                              className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-slate-700">
                                  {clue.file_name || "-"}
                                </span>
                                <Badge
                                  variant="destructive"
                                  className="bg-red-100 text-red-700">
                                  {clue.violation_type || "未知"}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center text-xs text-slate-500">
                                <span>违规字段：{clue.field_name || "-"}</span>
                                {/* <span>置信度：{clue.confidence || 0}%</span> */}
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-slate-400">
                                  {clue.created_at || "-"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => previewDetails(clue.file_name)}
                                  className="text-blue-500 hover:text-blue-600 h-6 px-2 text-xs">
                                  <Eye className="h-4 w-4 mr-1" />
                                  查看详情
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[450px] text-slate-400">
                          <ListChecks className="h-12 w-12 mb-2" />
                          <p className="text-sm">暂无线索数据</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <FileDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          loading={detailLoading}
          detail={selectedDetail}
        />
        <EditDetailDialog
          open={editDetailOpen}
          onOpenChange={setEditDetailOpen}
          loading={editDetailLoading}
          detail={selectedDetail}
          taskId={selectedTaskId || ""}
        />
      </div>
    </div>
  )
}

export default AIResult
