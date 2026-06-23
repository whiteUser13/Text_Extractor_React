// src/pages/AuthCallback.tsx
import { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useUserStore } from "@/context/userStore"
import { getUserInfo, redirectToOAuthLogin } from "@/api/auth"
import website from "@/config/website"
import { LOGOUT_IN_PROGRESS_KEY } from "@/utils/oidcUtils"

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useUserStore((s) => s.setUser)
  const setInitialized = useUserStore((s) => s.setInitialized)
  const [message, setMessage] = useState("正在完成登录...")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const state = params.get("state")
    const error = params.get("error")
    const expectedState = sessionStorage.getItem("oauth_state")

    if (error) {
      const errorDescription = params.get("error_description")
      setMessage(
        errorDescription
          ? `OAuth 登录失败: ${errorDescription}`
          : `OAuth 登录失败: ${error}`,
      )
      setInitialized(true)
      return
    }

    if (!code) {
      redirectToOAuthLogin()
      return
    }

    if (!state || !expectedState || state !== expectedState) {
      setMessage("登录状态校验失败")
      return
    }

    handleAuthCode(code)
  }, [location])

  const handleAuthCode = async (code: string) => {
    try {
      const nonce = sessionStorage.getItem("oauth_nonce")
      if (!nonce) {
        throw new Error("缺少 OAuth nonce")
      }

      // 由业务后端持有 client_secret，并向 JC4A 换取和校验 token。
      const response = await fetch("/api/auth/token", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          redirect_uri: website.redirect_uri,
          nonce,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "授权码换取 Token 失败")
      }

      if (data.access_token) {
        sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY)
        sessionStorage.removeItem("oauth_state")
        sessionStorage.removeItem("oauth_nonce")
        localStorage.removeItem("refresh_token")

        // 存储token
        localStorage.setItem("access_token", data.access_token)
        localStorage.setItem("token", data.access_token)
        if (data.id_token) {
          localStorage.setItem("id_token", data.id_token)
        }
        localStorage.setItem(
          "expires_in",
          Math.floor(Date.now() / 1000) + data.expires_in,
        )
        if (data.scope) {
          localStorage.setItem("scope", data.scope)
        }
        if (data.token_type) {
          localStorage.setItem("token_type", data.token_type)
        }

        const result = await getUserInfo(data.access_token)
        if (!result.success) {
          throw new Error(result.msg || "获取用户信息失败")
        }

        setUser(result.user)
        navigate("/", { replace: true })
      } else {
        throw new Error("Token 响应中缺少 access_token")
      }
    } catch (error) {
      console.error("Token换取失败:", error)
      setMessage(error instanceof Error ? error.message : "登录失败")
      navigate("/error", { state: { message: "登录失败" } })
    } finally {
      setInitialized(true)
    }
  }
  // const getUserInfo = async (access_token: string) => {
  //   try {
  //     // 调用后端API换取token
  //     const response = await fetch("auth-server/userinfo", {
  //       method: "GET",
  //       headers: {
  //         Authorization: "Bearer " + access_token,
  //       },
  //     })

  //     const data = await response.json()
  //     console.log(data)

  //     if (data.id) {
  //       // 存储token
  //       // localStorage.setItem("access_token", data.access_token)
  //       // localStorage.setItem("refresh_token", data.refresh_token)
  //       const user = {
  //         id: data.id,
  //         username: data.username,
  //         group_name: data.departments[0].name,
  //       }
  //       setUser(user)
  //       // 跳转到首页
  //       // navigate("/", { replace: true })
  //       // 跳转到首页
  //       navigate("/", { replace: true })
  //     }
  //   } catch (error) {
  //     console.error("获取用户信息失败:", error)
  //     navigate("/error", { state: { message: "获取用户信息失败" } })
  //   }
  // }
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>{message}</div>
    </div>
  )
}
