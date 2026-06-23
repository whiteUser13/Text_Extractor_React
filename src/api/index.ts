import axios from "axios"
import { clearLocalSession } from "@/utils/store"
import { validatenull } from "@/utils/validete"
import website from "@/config/website"
import { refreshTokenApi, redirectToOAuthLogin } from "./auth"
import { LOGOUT_IN_PROGRESS_KEY } from "@/utils/oidcUtils"

const apiClient = axios.create({
  // baseURL: "http://127.0.0.1:8000", // ✅ 本地服务地址
  // baseURL: "http://10.100.14.199:8000", // ✅ 生态环境服务地址
})

// 可选：统一请求拦截器
apiClient.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem("access_token")
    const tokenExp = localStorage.getItem("expires_in")
    if (token) {
      if (Number(tokenExp) <= Math.floor(new Date().getTime() / 1000)) {
        const refreshed = await refreshToken(true)
        if (!refreshed) {
          redirectToLoginAfterRefreshFailure()
          return Promise.reject(new Error("token refresh failed"))
        }
        token = localStorage.getItem("access_token")
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)
let refreshPromise: Promise<boolean> | null = null

const refreshToken = async (force = false): Promise<boolean> => {
  if (sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === "true") return false

  const tokenExp = localStorage.getItem("expires_in")
  if (validatenull(tokenExp)) return false
  let seconds = Number(tokenExp) - Math.floor(new Date().getTime() / 1000)
  seconds = Math.round(Number(seconds))
  if (validatenull(seconds)) return false
  if (!force && seconds > website.tokenTime) return true
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const result = await refreshTokenApi()
    if (result.success && result.data) {
      if (sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === "true") {
        return false
      }

      localStorage.removeItem("refresh_token")
      localStorage.setItem("access_token", result.data.access_token)
      localStorage.setItem("token", result.data.access_token)
      if (result.data.id_token) {
        localStorage.setItem("id_token", result.data.id_token)
      }
      localStorage.setItem(
        "expires_in",
        String(Math.floor(Date.now() / 1000) + result.data.expires_in),
      )
      localStorage.setItem("scope", result.data.scope)
      localStorage.setItem("token_type", result.data.token_type)
      return true
    }

    console.error("刷新失败:", result.msg)
    return false
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

const redirectToLoginAfterRefreshFailure = () => {
  if (sessionStorage.getItem(LOGOUT_IN_PROGRESS_KEY) === "true") return

  clearLocalSession()
  redirectToOAuthLogin()
}

// 可选：统一响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    void refreshToken()
    return response
  },
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshed = await refreshToken(true)

      if (refreshed) {
        const token = localStorage.getItem("access_token")
        if (token) {
          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return apiClient(originalRequest)
      }

      redirectToLoginAfterRefreshFailure()
    } else if (status === 403) {
      alert("你没有此系统使用权限，请联系管理员")
    }

    return Promise.reject(error)
  },
)

export default apiClient
