// src/components/AIResult/ChinaEChartsMap.tsx
import React, { useEffect, useRef } from "react"
import * as echarts from "echarts"

interface ChinaEChartsMapProps {
  data: Array<{
    province: string
    count: number
    illegal_count: number
    legal_count: number
    is_current_task?: boolean // 0316修改：可选（后端返回时可用）
  }>
  loading?: boolean
  currentProvinceFullName?: string // 0316修改：当前任务省份（全称，如“安徽省”）
  autoHighlightCurrent?: boolean // 0317修改：当前任务视图下自动高亮当前省份
  onProvinceClick?: (province: string, data: any) => void
}

// 省份名称映射（全称 -> 简称）
const provinceNameMap: Record<string, string> = {
  北京市: "北京",
  上海市: "上海",
  天津市: "天津",
  重庆市: "重庆",
  河北省: "河北",
  山西省: "山西",
  辽宁省: "辽宁",
  吉林省: "吉林",
  黑龙江省: "黑龙江",
  江苏省: "江苏",
  浙江省: "浙江",
  安徽省: "安徽",
  福建省: "福建",
  江西省: "江西",
  山东省: "山东",
  河南省: "河南",
  湖北省: "湖北",
  湖南省: "湖南",
  广东省: "广东",
  海南省: "海南",
  四川省: "四川",
  贵州省: "贵州",
  云南省: "云南",
  陕西省: "陕西",
  甘肃省: "甘肃",
  青海省: "青海",
  台湾省: "台湾",
  内蒙古自治区: "内蒙古",
  广西壮族自治区: "广西",
  西藏自治区: "西藏",
  宁夏回族自治区: "宁夏",
  新疆维吾尔自治区: "新疆",
  香港特别行政区: "香港",
  澳门特别行政区: "澳门",
}

// 0316修改：简称 -> 全称（反向映射）
const shortToFullProvinceMap: Record<string, string> = Object.entries(
  provinceNameMap,
).reduce(
  (acc, [full, short]) => {
    acc[short] = full
    return acc
  },
  {} as Record<string, string>,
)

// 0316修改：把任意省份字符串归一化为“全称”
function normalizeProvinceToFullName(raw: string): string {
  const s = (raw || "").trim()
  if (!s) return ""

  if (provinceNameMap[s]) return s
  if (shortToFullProvinceMap[s]) return shortToFullProvinceMap[s]

  for (const fullName of Object.keys(provinceNameMap)) {
    if (s.includes(fullName)) return fullName
  }

  for (const shortName of Object.values(provinceNameMap)) {
    if (s.includes(shortName)) return shortToFullProvinceMap[shortName]
  }

  return s
}

const ChinaEChartsMap: React.FC<ChinaEChartsMapProps> = ({
  data,
  loading = false,
  currentProvinceFullName = "",
  autoHighlightCurrent = false, // 0317修改
  onProvinceClick,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const chartInstance = useRef<echarts.EChartsType | null>(null) // 0317修改：补初始值并允许为空
  const [mapLoaded, setMapLoaded] = React.useState<boolean>(false)

  useEffect(() => {
    const loadChinaMap = async () => {
      try {
        const response = await fetch("api/file/get/100000_full_map", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        const chinaJson = await response.json()
        echarts.registerMap("china", chinaJson as any)
        setMapLoaded(true)
      } catch (error) {
        console.error("加载中国地图失败:", error)
      }
    }
    loadChinaMap()
  }, [])

  useEffect(() => {
    if (!chartRef.current || !mapLoaded) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chartInstance.current?.dispose()
      chartInstance.current = null // 0317修改：不要赋 undefined
    }
  }, [mapLoaded])

  useEffect(() => {
    if (!chartInstance.current || loading || !mapLoaded) return

    const normalizedData = Array.isArray(data)
      ? data.map((d) => ({
          ...d,
          province: normalizeProvinceToFullName(d.province),
        }))
      : []

    const dataMap = new Map(
      normalizedData.map((item) => [item.province, item] as const),
    )
    const normalizedCurrent = normalizeProvinceToFullName(
      currentProvinceFullName,
    )

    const mapData = Object.entries(provinceNameMap).map(
      ([fullName, shortName]) => {
        const provinceData = dataMap.get(fullName)
        return {
          name: fullName, // 0317修改：必须使用全称，确保与 GeoJSON 区域名一致
          shortName, // 0317修改：简称单独存，给 tooltip / label 用
          value: provinceData ? provinceData.count : 0,
          total: provinceData?.count || 0,
          illegal: provinceData?.illegal_count || 0,
          legal: provinceData?.legal_count || 0,
          fullName,
          selected: autoHighlightCurrent && fullName === normalizedCurrent, // 0317修改
        }
      },
    )

    const maxValue = Math.max(...mapData.map((item) => item.value || 0), 1) // 0317修改：按真实数据范围计算颜色图例最大值

    const option = {
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const d = params.data
          const displayName =
            d?.shortName || provinceNameMap[params.name] || params.name

          if (!params.value || params.value === 0) {
            return `${displayName}<br/>暂无数据`
          }

          const rateValue = d.total > 0 ? (d.illegal / d.total) * 100 : 0
          const rateFormatted = rateValue.toFixed(1)

          return `
            <div style="padding: 8px; max-width: 200px;">
              <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                ${displayName}
              </div>
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span>文件总数：</span>
                <span style="font-weight: bold;">${d.total}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 4px 0; color: #ef4444;">
                <span>违规文件：</span>
                <span style="font-weight: bold;">${d.illegal}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 4px 0; color: #22c55e;">
                <span>合规文件：</span>
                <span style="font-weight: bold;">${d.legal}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 4px 0; border-top: 1px solid #eee; padding-top: 4px;">
                <span>违规率：</span>
                <span style="font-weight: bold; color: ${
                  rateValue > 50 ? "#ef4444" : "#22c55e"
                }">${rateFormatted}%</span>
              </div>
            </div>
          `
        },
      },
      visualMap: {
        show: true, // 0317修改：显示颜色图例
        min: 0,
        max: maxValue, // 0317修改：按真实数据范围显示
        text: ["高", "低"], // 0317修改：显示“高/低”字样
        textStyle: {
          color: "#475569",
          fontSize: 12,
        },
        left: "left",
        bottom: "6%",
        calculable: true,
      },
      series: [
        {
          name: "地域分布",
          type: "map",
          map: "china",
          selectedMode: "single",
          roam: true,
          scaleLimit: {
            min: 0.8,
            max: 2,
          },
          zoom: 1.2,
          center: [104.0, 35.0],
          label: {
            show: true,
            fontSize: 10,
            color: "#334155",
            formatter: (params: any) => {
              return provinceNameMap[params.name] || params.name // 0317修改：显示简称
            },
          },
          emphasis: {
            label: {
              show: true,
              fontWeight: "bold",
              color: "#000000",
              formatter: (params: any) => {
                return provinceNameMap[params.name] || params.name // 0317修改
              },
            },
            itemStyle: {
              areaColor: "#bfdbfe",
              borderWidth: 2,
              borderColor: "#3b82f6",
            },
          },
          select: {
            label: {
              color: "#ffffff",
              fontWeight: "bold",
              formatter: (params: any) => {
                return provinceNameMap[params.name] || params.name // 0317修改
              },
            },
            itemStyle: {
              areaColor: "#2563eb",
              borderWidth: 3,
              borderColor: "#1d4ed8",
            },
          },
          data: mapData,
          itemStyle: {
            borderColor: "#cbd5e1",
            borderWidth: 0.5,
          },
        },
      ],
    }

    chartInstance.current.setOption(option as any, true) // 0317修改：强制覆盖，避免旧状态残留

    // 0317修改：当前任务视图下自动高亮当前省份
    if (normalizedCurrent && chartInstance.current) {
      requestAnimationFrame(() => {
        Object.keys(provinceNameMap).forEach((fullName) => {
          chartInstance.current?.dispatchAction({
            type: "unselect",
            name: fullName,
          })
          chartInstance.current?.dispatchAction({
            type: "downplay",
            name: fullName,
          })
        })

        if (autoHighlightCurrent) {
          chartInstance.current?.dispatchAction({
            type: "select",
            name: normalizedCurrent, // 0317修改：这里必须用全称
          })
          chartInstance.current?.dispatchAction({
            type: "highlight",
            name: normalizedCurrent, // 0317修改：这里必须用全称
          })
        }
      })
    }

    chartInstance.current.off("click")
    chartInstance.current.on("click", (params: any) => {
      if (params.data && onProvinceClick) {
        onProvinceClick(params.data.fullName || params.name, params.data)
      }
    })
  }, [
    data,
    loading,
    mapLoaded,
    onProvinceClick,
    currentProvinceFullName,
    autoHighlightCurrent,
  ])

  if (loading || !mapLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-slate-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            {loading ? "加载中..." : "加载地图..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[400px] bg-white rounded-lg overflow-hidden border border-slate-200">
      <div ref={chartRef} className="w-full h-full" />

      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm text-xs text-slate-500 border border-slate-200">
        可拖拽缩放 | 点击省份查看详情
      </div>

      {autoHighlightCurrent && currentProvinceFullName && (
        <div className="absolute top-14 right-4 bg-blue-600 text-white px-2 py-1 rounded-lg shadow-sm text-xs">
          已自动定位：{currentProvinceFullName}
        </div>
      )}
    </div>
  )
}

export default ChinaEChartsMap
