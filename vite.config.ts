import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr"
import path from "path"

import { miaodaDevPlugin } from "miaoda-sc-plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    miaodaDevPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // 添加服务器配置
  server: {
    host: "0.0.0.0", // 确保主机正确
    allowedHosts: true,
    port: 5173, // Vite 默认端口
    proxy: {
      // 代理所有以 /tasks 开头的请求
      "^/tasks.*": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // 代理所有以 /upload 开头的请求
      "^/upload.*": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // 代理所有以 /files_info 开头的请求
      "^/files_info.*": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // 代理所有以 /extract 开头的请求
      "^/extract.*": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // 通用代理配置，匹配大部分API
      "^/api.*": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      // 代理所有以 /auth-server 开头的请求,统一登录要求
      "/auth-server": {
        target: "http://10.100.224.56:35501",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("Proxying:", req.url, "->", proxyReq.path)
          })
        },
      },
    },
  },
})
