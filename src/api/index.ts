import axios from "axios"
import { clearLocalSession } from "@/utils/store"
import { validatenull } from "@/utils/validete"
import website from "@/config/website"
import { refreshTokenApi, redirectToOAuthLogin } from "./auth"
import { oidcLogout } from "@/utils/oidcUtils"

const apiClient = axios.create({
  // baseURL: "http://127.0.0.1:8000", // ✅ 本地服务地址
  // baseURL: "http://10.100.14.199:8000", // ✅ 生态环境服务地址
})

// 可选：统一请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token")
    const tokenExp = localStorage.getItem("expires_in")
    if (token) {
      //验证token是否失效
      if (Number(tokenExp) <= Math.floor(new Date().getTime() / 1000)) {
        clearLocalSession()
        // 跳转到登录页
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
        return Promise.reject("token expired")
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)
let refreshLock = false
const refreshToken = async () => {
  const tokenExp = localStorage.getItem("expires_in")
  if (validatenull(tokenExp)) return
  let seconds = Number(tokenExp) - Math.floor(new Date().getTime() / 1000)
  seconds = Math.round(Number(seconds))
  if (validatenull(seconds)) return
  if (seconds <= website.tokenTime && !refreshLock) {
    refreshLock = true
    const refresh_token = localStorage.getItem("refresh_token")

    if (!refresh_token) {
      console.log("没有refresh_token，跳转登录")
      refreshLock = false
      redirectToOAuthLogin()
      return
    }
    const result = await refreshTokenApi(refresh_token)

    if (result.success && result.data) {
      console.log("刷新成功，新token:", result.data.access_token)
      localStorage.setItem("access_token", result.data.access_token)
      localStorage.setItem("token", result.data.access_token)
      localStorage.setItem("refresh_token", result.data.refresh_token)
      localStorage.setItem("id_token", result.data.id_token)
      localStorage.setItem(
        "expires_in",
        Math.floor(Date.now() / 1000) + result.data.expires_in,
      )
      localStorage.setItem("scope", result.data.scope)
      localStorage.setItem("token_type", result.data.token_type)
      refreshLock = false
      return
    } else {
      console.error("刷新失败:", result.msg)
      refreshLock = false
      // 刷新失败，跳转登录
      redirectToOAuthLogin()
      return null
    }
  }
}
// 可选：统一响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const refresh_token = localStorage.getItem("refresh_token")
    if (refresh_token) {
      refreshToken()
    }
    return response
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      // token 过期 / 未登录
      if (status === 401) {
        alert("token过期，请重新登录")
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
        // 清理本地 token
        // clearLocalSession()
        // console.log("重定向到login")

        // redirectToOAuthLogin()
        // return new Promise(() => {})
      } else if (status === 403) {
        // alert("你没有此系统使用权限，请联系管理员")
        // const access_token = localStorage.getItem("access_token")
        // console.log(access_token)
        // // 2. 先清除用户状态（让界面立即响应）
        // // setUser(null)
        // if (!access_token) {
        //   // 没有id_token，直接本地登出
        //   clearLocalSession()
        //   // window.location.href = "/login"
        //   return
        // }
        // // 3. 执行OIDC登出（表单POST）
        // oidcLogout(access_token)
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
