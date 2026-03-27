// src/pages/AuthCallback.tsx
import { useEffect, useState } from "react"
import Base64 from "base-64"
import { useNavigate, useLocation } from "react-router-dom"
import { useUserStore } from "@/context/userStore"
import { getUserInfo } from "@/api/auth"
import website from "@/config/website"
import { redirectToOAuthLogin } from "@/api/auth"

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

    if (error) {
      throw new Error(`OAuth 登录失败: ${error}`)
    }

    if (!code) {
      redirectToOAuthLogin()
      throw new Error("缺少授权码 code")
    }
    if (code) {
      console.log("获取到授权码:", code)
      handleAuthCode(code)
    }
  }, [location])

  const handleAuthCode = async (code: string) => {
    try {
      // 调用后端API换取token
      const response = await fetch(website.unifyLoginURL + "/oauth2/token", {
        method: "POST",
        credentials: "omit",
        headers: {
          Authorization:
            "Basic " +
            Base64.encode(`${website.applicationId}:${website.clientSecret}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: website.grantType,
          code: code,
          redirect_uri: website.redirect_uri,
        }),
      })

      const data = await response.json()
      console.log(data)

      if (data.access_token) {
        // 存储token
        localStorage.setItem("access_token", data.access_token)
        localStorage.setItem("token", data.access_token)
        localStorage.setItem("refresh_token", data.refresh_token)
        localStorage.setItem("id_token", data.id_token)
        localStorage.setItem(
          "expires_in",
          Math.floor(Date.now() / 1000) + data.expires_in,
        )
        localStorage.setItem("scope", data.scope)
        localStorage.setItem("token_type", data.token_type)

        // getUserInfo(data.access_token)
        getUserInfo(data.access_token)
          .then((result) => {
            if (result.success) {
              setUser(result.user)
              navigate("/", { replace: true })
            }
          })
          .catch((err) => {
            navigate("/error", { state: { message: "获取用户信息失败" } })
          })
      }
    } catch (error) {
      console.error("Token换取失败:", error)
      navigate("/error", { state: { message: "登录失败" } })
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
