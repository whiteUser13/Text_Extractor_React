/* eslint-disable */
/**
 * Store utils
 */

import website from "@/config/website"
import { validatenull } from "@/utils/validete"
/**
 * 清除本地会话
 */
export const clearLocalSession = () => {
  localStorage.removeItem("access_token")
  localStorage.removeItem("token") //和access_token一样
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("id_token")
  localStorage.removeItem("expires_in")
  localStorage.removeItem("scope")
  localStorage.removeItem("token_type")
  sessionStorage.clear()
}

const keyName = website.applicationId + "-"
interface storeParams {
  name: string
  content?: string
  type?: string
  debug?: boolean
}
/**
 * 存储localStorage
 */
export const setStore = (params: storeParams) => {
  let { name, content, type } = params
  name = keyName + name
  let obj = {
    dataType: typeof content,
    content: content,
    type: type,
    datetime: new Date().getTime(),
  }
  if (type) window.sessionStorage.setItem(name, JSON.stringify(obj))
  else window.localStorage.setItem(name, JSON.stringify(obj))
}
/**
 * 获取localStorage
 */

export const getStore = (params: storeParams) => {
  let { name, debug } = params
  name = keyName + name
  let obj: string | any, content
  obj = window.sessionStorage.getItem(name)
  if (validatenull(obj)) obj = window.localStorage.getItem(name)
  if (validatenull(obj)) return
  try {
    obj = JSON.parse(obj)
  } catch {
    return obj
  }
  if (debug) {
    return obj
  }
  if (obj.dataType == "string") {
    content = obj.content
  } else if (obj.dataType == "number") {
    content = Number(obj.content)
  } else if (obj.dataType == "boolean") {
    content = eval(obj.content)
  } else if (obj.dataType == "object") {
    content = obj.content
  }
  return content
}
/**
 * 删除localStorage
 */
export const removeStore = (params: storeParams) => {
  let { name, type } = params
  name = keyName + name
  if (type) {
    window.sessionStorage.removeItem(name)
  } else {
    window.localStorage.removeItem(name)
  }
}
/**
 * 存储token至localStorage
 */
export const setTokenStore = (params: storeParams) => {
  let { name, content } = params
  if (name == "JCAccessTokenExp") {
    content = String(Number(content) + Math.floor(new Date().getTime() / 1000))
  }
  window.localStorage.setItem(name, String(content))
}
/**
 * 获取token从localStorage
 */
export const getTokenStore = (params: storeParams) => {
  let { name } = params
  const content = window.localStorage.getItem(name)
  if (validatenull(content)) return
  return content
}
/**
 * 删除token从localStorage
 */
export const removeTokenStore = (params: storeParams) => {
  let { name } = params
  window.localStorage.removeItem(name)
}
/**
 * 获取全部localStorage
 */
export const getAllStore = (params: storeParams) => {
  const list = []
  const { type } = params

  if (type) {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (!key) continue

      list.push({
        name: key,
        content: getStore({
          name: key,
          type: "session",
        }),
      })
    }
  } else {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue

      list.push({
        name: key,
        content: getStore({
          name: key,
        }),
      })
    }
  }

  return list
}

/**
 * 清空全部localStorage
 */
export const clearStore = (params?: storeParams) => {
  let type = params?.type
  let storage = window.localStorage
  if (type) {
    storage = window.sessionStorage
  }
  // 清除Token
  removeTokenStore({ name: "JCAccessToken" })
  removeTokenStore({ name: "JCRefreshToken" })
  removeTokenStore({ name: "JCIdToken" })
  removeTokenStore({ name: "JCAccessTokenExp" })
  removeTokenStore({ name: "JCAccessTokenType" })
  // 清除其他缓存
  let storageLength = storage.length
  for (let i = 0; i < storageLength; i++) {
    let storageKey = storage.key(i)
    if (storageKey && storageKey.indexOf(keyName) == 0) {
      storage.removeItem(storageKey)
    }
  }
}
