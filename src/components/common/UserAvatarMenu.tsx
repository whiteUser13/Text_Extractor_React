import { useNavigate } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"
import { useUserStore } from "@/context/userStore"
import React from "react"
import { clearLocalSession } from "@/utils/store"
import { oidcLogout } from "@/utils/oidcUtils"
export function UserAvatarMenu() {
  const navigate = useNavigate()
  const [loading, setLoading] = React.useState(false)
  const setUser = useUserStore((s) => s.setUser)
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
        // window.location.href = "/login"
        return
      }

      // 3. 执行OIDC登出（表单POST）
      oidcLogout(access_token)

      // 注意：oidcLogout会提交表单并跳转页面，下面的代码不会执行
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
