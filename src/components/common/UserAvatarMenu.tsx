import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"
import React from "react"
import { clearLocalSession } from "@/utils/store"
import {
  LOGOUT_IN_PROGRESS_KEY,
  oidcLogout,
} from "@/utils/oidcUtils"
export function UserAvatarMenu() {
  const [loading, setLoading] = React.useState(false)
  // const handleLogout = () => {
  //   localStorage.removeItem("token")
  //   navigate("/login", { replace: true })
  // }
  const handleLogout = async () => {
    if (loading) return

    setLoading(true)

    try {
      // 1. 获取存储的id_token
      const access_token = localStorage.getItem("access_token")
      console.log(access_token)

      // 2. 先清除用户状态（让界面立即响应）
      // setUser(null)

      if (!access_token) {
        // 没有id_token，直接本地登出
        clearLocalSession()
        sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, "true")
        window.location.replace("/logout?logout=success")
        return
      }

      // 3. 等待后端撤销 token，避免受保护路由提前触发重新登录。
      await oidcLogout(access_token)
    } catch (error) {
      console.error("登出失败:", error)
      // 出错时降级为本地登出
      // clearLocalSession()
      // window.location.href = "/login"
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      {/* 触发器：头像 */}
      <DropdownMenuTrigger asChild>
        <button className="outline-none">
          <Avatar className="size-8 cursor-pointer">
            <AvatarImage src="/avatar-default.png" />
            <AvatarFallback>👤</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      {/* 下拉内容 */}
      <DropdownMenuContent
        side="bottom"
        align="center"
        sideOffset={6}
        className="w-36">
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-600 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
