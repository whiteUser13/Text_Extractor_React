// FolderCard.tsx
import React, { useState } from "react"
import { ChevronDown, ChevronUp, Folder } from "lucide-react"
import { getFolderFilesInfo, Files } from "@/api/download" // 你之前封装的动态路径接口

interface FolderCardProps {
  folderName: string // 用于请求接口,只有两个值，filter_pdf和results
  areaCode: string // 用于请求接口
  originFolderName: string // UI 上显示的名称
}

const FolderCard: React.FC<FolderCardProps> = ({
  folderName,
  areaCode,
  originFolderName,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<Files[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleFolder = async () => {
    if (!isOpen) {
      setLoading(true)
      setError(null)
      try {
        const data = await getFolderFilesInfo(folderName, areaCode)
        console.log(data)
        setFiles(data)
      } catch (err) {
        setError("获取文件失败")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="w-full bg-white shadow-md rounded-2xl p-4 mb-3 transition-all">
      {/* 顶部卡片 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Folder className="text-blue-500" size={20} />
          <span className="font-medium text-gray-800">{originFolderName}</span>
        </div>

        <button
          onClick={toggleFolder}
          className="p-2 rounded hover:bg-gray-100 transition-colors">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* 展开区域 */}
      {isOpen && (
        <div className="mt-3 bg-gray-50 rounded-xl p-3">
          {loading && <p className="text-sm text-gray-500">加载中...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!loading && !error && files.length === 0 && (
            <p className="text-sm text-gray-400">该文件夹下暂无文件</p>
          )}
          {!loading && files.length > 0 && (
            <ul className="space-y-1 text-sm text-gray-700">
              {files.map((f, index) => (
                <li key={index} className="truncate">
                  <a className="text-blue-600 underline" href={f.download_url}>
                    {f.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default FolderCard
