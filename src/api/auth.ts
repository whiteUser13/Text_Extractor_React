// src/api/auth.ts
import apiClient from "./index"
import axios from "axios"
import { User } from "@/context/userStore"
import { SHA256 } from "crypto-js"
import website from "@/config/website"
import Base64 from "base-64"

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
  refresh_token: string
  expires_in: string
  token_type: string
  scope: string
  id_token: string
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
    const res = await apiClient.get("/auth-server/userinfo", {
      baseURL: "http://10.100.224.56:35501",
    })
    if (res.status === 200) {
      const user = {
        id: res.data.id,
        username: res.data.username,
        group_name: res.data.departments[0].name,
      }
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
const oauthClient = axios.create({})
export async function refreshTokenApi(
  refresh_token: string,
): Promise<RefreshTokenResult> {
  try {
    const res = await oauthClient.post(
      "/auth-server/oauth2/token",
      {
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      },
      {
        baseURL: "http://10.100.224.56:35501",
        headers: {
          Authorization:
            "Basic " +
            Base64.encode(`${website.applicationId}:${website.clientSecret}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    )
    if (res.status === 200) {
      return {
        success: true,
        data: res.data,
        msg: "刷新成功",
        code: 200,
      }
    } else {
      return {
        success: false,
        msg:
          res.data?.error_description ||
          res.data?.error ||
          `请求失败: ${res.status}`,
        code: res.status,
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

// 创建跳转函数
export function redirectToOAuthLogin() {
  const form = document.createElement("form")
  form.method = "GET"
  form.action = website.unifyLoginURL + "/oauth2/authorize"
  form.style.display = "none"

  const params = {
    response_type: "code",
    client_id: website.applicationId,
    scope: "all",
    redirect_uri: website.redirect_uri,
  }

  Object.keys(params).forEach((key) => {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = key
    // 使用类型断言告诉TypeScript key是params的合法键名
    input.value = params[key as keyof typeof params]
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
}
