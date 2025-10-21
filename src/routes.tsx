import Dashboard from "./pages/Dashboard"
import FileUpload from "./pages/FileUpload"
import FileDecompression from "./pages/FileDecompression"
import ContentExtraction from "./pages/ContentExtraction"
import IntelligentAnalysis from "./pages/IntelligentAnalysis"
import type { ReactNode } from "react"

export interface RouteConfig {
  name: string
  path: string
  element: ReactNode
  visible?: boolean
}

const routes: RouteConfig[] = [
  {
    name: "系统首页",
    path: "/",
    element: <Dashboard />,
  },
  {
    name: "文件上传与下载",
    path: "/upload",
    element: <FileUpload />,
  },
  {
    name: "解压缩处理",
    path: "/decompression",
    element: <FileDecompression />,
  },
  {
    name: "内容提取",
    path: "/extraction",
    element: <ContentExtraction />,
  },
  {
    name: "智能判别",
    path: "/analysis",
    element: <IntelligentAnalysis />,
  },
]

export default routes
