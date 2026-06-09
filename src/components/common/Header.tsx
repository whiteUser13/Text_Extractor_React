import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Archive,
  Bell,
  Bot,
  ClipboardCheck,
  FileChartColumn,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Home,
  Menu,
  Search,
  Settings,
  UploadCloud,
  X,
} from "lucide-react"
import routes from "../../routes"

import { UserAvatarMenu } from "@/components/common/UserAvatarMenu"
const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigation = routes.filter((route) => route.visible !== false)

  // 图标映射
  const getIcon = (path: string) => {
    switch (path) {
      case "/":
        return <Home className="h-4 w-4" />
      case "/upload":
        return <UploadCloud className="h-4 w-4" />
      case "/decompression":
        return <Archive className="h-4 w-4" />
      case "/parse-and-chunk":
        return <FileSearch className="h-4 w-4" />
      case "/extraction":
        return <ClipboardCheck className="h-4 w-4" />
      case "/airesult":
        return <FileChartColumn className="h-4 w-4" />
      case "/excel-report":
        return <FileSpreadsheet className="h-4 w-4" />
      case "/process-status":
        return <FileText className="h-4 w-4" />
      case "/assistant":
        return <Bot className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-white/15 bg-[#1890FF] text-white shadow-none">
      <nav className="mx-auto h-full max-w-[1920px] px-6">
        <div className="flex h-16 items-center justify-between gap-3 lg:gap-6">
          <div className="flex min-w-0 items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="ml-1 hidden max-w-[220px] truncate text-base font-semibold text-white 2xl:inline 2xl:max-w-none 2xl:text-[20px]">
                土壤污染状况调查报告智能提取与审核系统
              </span>
            </Link>
          </div>

          {/* 桌面导航 */}
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex h-10 shrink items-center gap-1.5 whitespace-nowrap rounded px-[clamp(0.45rem,0.7vw,0.9rem)] text-[clamp(12px,1.05vw,28px)] font-bold leading-none transition-colors duration-200 before:absolute before:inset-x-3 before:bottom-1 before:h-0.5 before:origin-center before:scale-x-0 before:rounded before:bg-[#1890ff] before:transition-transform [&>svg]:h-[1em] [&>svg]:w-[1em] ${
                  location.pathname === item.path
                    ? "bg-[#e6f7ff] text-[#003a8c] shadow-sm ring-1 ring-white/30 before:scale-x-100"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}>
                {getIcon(item.path)}
                {item.name}
              </Link>
            ))}
          </div>
          <div className="ml-auto hidden items-center gap-1 md:flex">
            <button
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
              title="搜索">
              <Search className="h-5 w-5" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
              title="消息">
              <Bell className="h-5 w-5" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
              title="设置">
              <Settings className="h-5 w-5" />
            </button>
          </div>
          <UserAvatarMenu />
          {/* 移动端菜单按钮 */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center rounded p-2 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/70">
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* 移动端导航菜单 */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 border-t border-white/15 bg-[#0b5cad] px-2 pb-3 pt-2 sm:px-3">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 text-base font-medium rounded-md ${
                    location.pathname === item.path
                      ? "bg-white/15 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  } transition duration-200`}
                  onClick={() => setIsMenuOpen(false)}>
                  {getIcon(item.path)}
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Header
