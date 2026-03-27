// pages/Login.tsx
import React, { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { redirectToOAuthLogin } from "@/api/auth"

export default function LogOut() {
  const location = useLocation()

  useEffect(() => {
    // 检查是否是登出后跳转
    const params = new URLSearchParams(location.search)
    const isLogout = params.get("logout") === "success"

    if (isLogout) {
      // 可以显示登出成功的提示
      console.log("您已成功退出登录")
    }
  }, [location])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        {/* 登出成功提示 */}
        {location.search.includes("logout=success") && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            您已成功退出登录
          </div>
        )}

        {/* 登录表单 */}
        <div className="bg-white p-8 rounded shadow">
          <h2 className="text-2xl font-bold mb-6 text-center">登录</h2>
          <button
            onClick={() => redirectToOAuthLogin()}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">
            前往统一登录
          </button>
        </div>
      </div>
    </div>
  )
}
