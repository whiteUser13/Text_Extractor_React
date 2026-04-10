// App.tsx
import React, { useEffect } from "react"
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import Header from "@/components/common/Header"
import RequireAuth from "@/components/RequireAuth"
import routes from "./routes"
import { TaskProvider } from "@/context/TaskContext"
import { useUserStore } from "@/context/userStore"
import { getTokenStore } from "@/utils/store"
import { validatenull } from "@/utils/validete"
import { redirectToOAuthLogin } from "@/api/auth"
import AuthCallback from "@/pages/AuthCallback"
import LogOut from "./pages/LogOut"
import ScenesPage from "@/pages/ScenesPage"
import Dashboard from "@/pages/Dashboard"

// 创建一个包装组件，根据路由决定是否显示 Header
const AppLayout = () => {
  const location = useLocation()
  const initialized = useUserStore((s) => s.initialized)
  
  // 首页（场景页面）不显示 Header
  const isScenesPage = location.pathname === "/"
  // 登录和退出页面也不显示 Header
  const hideHeader = isScenesPage || 
    location.pathname === "/login" || 
    location.pathname === "/logout"

  return (
    <div className="flex flex-col min-h-screen">
      {!hideHeader && <Header />}
      <main className="flex-grow">
        <TaskProvider>
          <Routes>
            <Route path="/login" element={<AuthCallback />} />
            <Route path="/logout" element={<LogOut />} />
            
            {/* 场景首页 - 不显示 Header */}
            <Route path="/" element={<ScenesPage />} />
            
            {/* 任务管理页面 - 显示 Header */}
            <Route path="/dashboard/:sceneId" element={<Dashboard />} />
            
            {routes.map((route, index) => {
              const element = route.auth ? (
                <RequireAuth>{route.element}</RequireAuth>
              ) : (
                route.element
              )
              return <Route key={index} path={route.path} element={element} />
            })}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TaskProvider>
      </main>
      <Toaster />
    </div>
  )
}

const App: React.FC = () => {
  const setUser = useUserStore((s) => s.setUser)
  const setInitialized = useUserStore((s) => s.setInitialized)

  useEffect(() => {
    const initAuth = async () => {
      if (window.location.pathname === "/login") {
        setInitialized(true)
        return
      }

      const accessToken = getTokenStore({ name: "access_token" })
      
      if (validatenull(accessToken)) {
        setUser(null)
        setInitialized(true)
        if (window.location.pathname !== "/logout") {
          redirectToOAuthLogin()
        }
        return
      }
      
      setInitialized(true)
    }

    initAuth()
  }, [])

  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

export default App