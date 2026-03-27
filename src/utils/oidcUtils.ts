// utils/oidcLogout.ts
import website from "@/config/website"
import { clearLocalSession } from "./store"

/**
 * OIDC登出 - 使用表单POST方式
 * @param params 登出参数
 */
export const oidcLogout = (access_token: string) => {
  const params = {
    client_id: website.applicationId,
    redirect_uri: website.logout_redirect_uri,
    access_token: access_token,
  }

  // 3. 先清除本地会话（确保即使登出失败，用户也无法继续访问）
  clearLocalSession()

  // 4. 创建并提交表单
  const form = document.createElement("form")
  form.method = "GET"
  form.action = website.unifyLoginURL + "/logout" // 根据实际地址调整
  form.style.display = "none"
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
