import React from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Eye } from "lucide-react"

interface StatsItem {
  stats_name: string
  stats_prompt: string
  stats_result: { name: string; value: number }[]
}

interface Props {
  data: StatsItem
  onUse: (item: StatsItem) => void
}

const AIStatsCard: React.FC<Props> = ({ data, onUse }) => {
  return (
    <div className="flex items-center justify-between pl-4 pr-4 p-1 border rounded-lg bg-white shadow-sm hover:shadow transition">
      {/* 左侧信息 */}
      <div className="flex items-center gap-4">
        {/* 名称（带 tooltip） */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="font-medium text-gray-800 cursor-pointer w-40 truncate">
              {data.stats_name}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs text-sm">{data.stats_prompt}</div>
          </TooltipContent>
        </Tooltip>

        {/* 结果（tooltip） */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-sm text-gray-500 cursor-pointer">查看结果</div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              {data.stats_result.map((item, index) => (
                <div key={index}>
                  {item.name}：{item.value}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 右侧操作 */}
      <Button
        variant="ghost"
        className="text-blue-500 hover:text-blue-600"
        onClick={() => onUse(data)}>
        <Eye className="w-4 h-4 mr-1" />
      </Button>
    </div>
  )
}

export default AIStatsCard
