// src/api/auth.ts
import apiClient from "./index"
import { User } from "@/context/userStore"
import { SHA256 } from "crypto-js"
import website from "@/config/website"

export const encryptPassword = (password: string): string => {
  // 使用SHA256并转换为小写
  return SHA256(password).toString().toLowerCase()
}
export interface UserInfo {
  id: string
  username: string
  group_name: string
  is_activate: boolean
}

interface LoginResult {
  success: boolean
  user?: User
  msg: string
  access_token: string
}
interface RegisterResult {
  success: boolean
  msg: string
}
// 定义返回类型接口
interface RefreshTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  id_token?: string
}
interface RefreshTokenResult {
  success: boolean
  data?: RefreshTokenResponse
  msg: string
  code?: number
}
export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const res = await apiClient.post("/api/auth/login", {
      username,
      password,
    })
    if (res.status === 200) {
      console.log(res.data)

      return {
        success: true,
        user: res.data.user,
        msg: res.data.msg,
        access_token: res.data.token,
      }
    } else {
      return {
        success: false,
        msg: res.data.msg,
        access_token: "",
      }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.response?.data?.error || "网络错误",
      access_token: "",
    }
  }
}
interface UserResult {
  success: boolean
  user: User
  msg: string
}
export async function getUserInfo(access_token: string): Promise<UserResult> {
  try {
    const res = await apiClient.get("/oauth2/userinfo", {
      baseURL: website.JC4AServiceURL,
    })
    if (res.status === 200) {
      console.log(res.data)

      // const user = {
      //   id: res.data.id || res.data.username,
      //   username: res.data.name || res.data.username,
      //   group_name: res.data.departments[0].name || res.data.sub,
      // }
      const user = {
        id: res.data.username,
        username: res.data.name,
        group_name: res.data.sub,
      }
      console.log(user)

      return {
        success: true,
        user: user,
        msg: "获取成功",
      }
    } else {
      return {
        success: false,
        user: {
          id: "",
          username: "",
          group_name: "",
        },
        msg: "获取失败",
      }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.response?.data?.error || "网络错误",
      user: {
        id: "",
        username: "",
        group_name: "",
      },
    }
  }
}
export async function refreshTokenApi(): Promise<RefreshTokenResult> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    })
    const data = await response.json()

    if (response.ok) {
      return {
        success: true,
        data,
        msg: "刷新成功",
        code: response.status,
      }
    } else {
      return {
        success: false,
        msg:
          data?.error_description ||
          data?.error ||
          `请求失败: ${response.status}`,
        code: response.status,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.message,
      code: 500,
    }
  }
}
export async function register(
  username: string,
  password: string,
  group_name: string,
): Promise<RegisterResult> {
  try {
    const res = await apiClient.post("/api/auth/register", {
      username,
      password,
      group_name,
    })
    if (res.status === 200) {
      console.log(res.data)

      return {
        success: true,
        msg: res.data.message,
      }
    } else {
      return {
        success: false,
        msg: res.data.error,
      }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.response?.data?.error || "网络错误",
    }
  }
}

interface OAuthLoginOptions {
  forceLogin?: boolean
}

const createOAuthRandomValue = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  )
}

// 创建跳转函数
export function redirectToOAuthLogin(options: OAuthLoginOptions = {}) {
  const form = document.createElement("form")
  form.method = "GET"
  form.action = website.JC4AServiceURL + "/oauth2/authorize"
  form.style.display = "none"

  const state = createOAuthRandomValue()
  const nonce = createOAuthRandomValue()
  sessionStorage.setItem("oauth_state", state)
  sessionStorage.setItem("oauth_nonce", nonce)

  const params: Record<string, string> = {
    response_type: "code",
    client_id: website.APPID,
    scope: "openid profile",
    redirect_uri: website.redirect_uri,
    state,
    nonce,
  }

  if (options.forceLogin) {
    params.prompt = "login"
    params.max_age = "0"
  }

  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = key
    input.value = value
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
}
