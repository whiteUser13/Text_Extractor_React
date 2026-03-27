import React from "react"

interface ProgressBarProps {
  total: number
  downloaded: number
  error?: number
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  total,
  downloaded,
  error = 0,
}) => {
  const safeSuccess = Math.max(0, Math.min(downloaded, total))
  const safeError = Math.max(0, Math.min(error, total - safeSuccess))

  const successPercent = total > 0 ? (safeSuccess / total) * 100 : 0

  const errorPercent = total > 0 ? (safeError / total) * 100 : 0

  const finishedPercent = successPercent + errorPercent

  return (
    <div className="w-full space-y-2">
      {/* 文案 */}
      <div className="flex justify-between text-sm text-gray-600">
        <span>
          成功: {safeSuccess} ,失败:{" "}
          <span className="text-red-600">{safeError}</span> , 总数 :{total}
        </span>
        <span>{Math.round(finishedPercent)}%</span>
      </div>

      {/* 进度条 */}
      <div className="relative w-full h-3 rounded-full bg-gray-200 overflow-hidden">
        {/* 成功（绿色） */}
        <div
          className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
          style={{ width: `${successPercent}%` }}
        />

        {/* 失败（红色） */}
        <div
          className="absolute top-0 h-full bg-red-500 transition-all duration-300"
          style={{ left: `${successPercent}%`, width: `${errorPercent}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
