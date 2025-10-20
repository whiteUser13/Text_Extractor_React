import axios from "axios"

const apiClient = axios.create({
  baseURL: "http://localhost:8000", // ✅ 你的后端服务地址
})

// 可选：统一请求拦截器
apiClient.interceptors.request.use((config) => {
  // 比如自动加 token
  // config.headers.Authorization = `Bearer ${token}`;
  return config
})

// 可选：统一响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API请求错误:", error)
    return Promise.reject(error)
  }
)

export default apiClient
