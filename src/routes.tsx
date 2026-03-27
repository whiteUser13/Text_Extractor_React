import Dashboard from "./pages/Dashboard"
import FileUpload from "./pages/FileUpload"
import FileDecompression from "./pages/FileDecompression"
import ParseAndChunk from "./pages/ParseAndChunk"
import type { ReactNode } from "react"
import ExtractionAndDiscrimination from "./pages/Extraction and Discrimination"
import ExcelReportGenerator from "./pages/ExcelReportGenerator"
import ProcessStatusPage from "./pages/ProcessStatus" //12.24修改
import AIResult from "./pages/AIResult"

export interface RouteConfig {
  name: string
  path: string
  element: ReactNode
  visible?: boolean
  auth?: boolean // ✅ 是否需要登录
  showHeader?: boolean
}

const routes: RouteConfig[] = [
  {
    name: "首页",
    path: "/",
    element: <Dashboard />,
    auth: true,
    showHeader: true,
  },
  {
    name: "上传与下载",
    path: "/upload",
    element: <FileUpload />,
    auth: true,
    showHeader: true,
  },
  {
    name: "解压缩",
    path: "/decompression",
    element: <FileDecompression />,
    auth: true,
    showHeader: true,
  },
  {
    name: "解析与分块",
    path: "/parse-and-chunk",
    element: <ParseAndChunk />,
    auth: true,
    showHeader: true,
  },
  {
    name: "提取与判别",
    path: "/extraction",
    element: <ExtractionAndDiscrimination />,
    auth: true,
    showHeader: true,
  },
  {
    name: "结果",
    path: "/airesult",
    element: <AIResult />,
    auth: true,
    showHeader: true,
  },
  {
    name: "Excel报告生成",
    path: "/excel-report",
    element: <ExcelReportGenerator />,
    auth: true,
    showHeader: true,
  },
  {
    name: "处理日志",
    path: "/process-status",
    element: <ProcessStatusPage />,
    auth: true,
    showHeader: true,
  },
]

export default routes
