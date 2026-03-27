import React, { useEffect } from "react"
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import Header from "@/components/common/Header"
import RequireAuth from "@/components/RequireAuth"
import routes from "./routes"
import { TaskProvider } from "@/context/TaskContext"
import { useLocation } from "react-router-dom"
import { useUserStore } from "@/context/userStore"
import { getTokenStore, removeTokenStore, setTokenStore } from "@/utils/store"
import { validatenull } from "@/utils/validete"
import { redirectToOAuthLogin } from "@/api/auth"
import AuthCallback from "@/pages/AuthCallback"
import LogOut from "./pages/LogOut"
const AppContent = () => {
  const location = useLocation()

  // 登录页不显示 Header
  // const showHeader = location.pathname

  const initialized = useUserStore((s) => s.initialized)

  // 如果认证状态未初始化，显示加载状态
  // if (!initialized) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
  //         <p className="mt-4">加载中...</p>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <div className="flex flex-col min-h-screen">
      {/* {showHeader && <Header />} */}
      <Header />
      <main className="flex-grow">
        <TaskProvider>
          <Routes>
            <Route path="/login" element={<AuthCallback />} />
            <Route path="/logout" element={<LogOut />} />
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

  // useEffect(() => {
  //   const handler = () => {
  //     console.log("auth-expired")

  //     const token = localStorage.getItem("token")
  //     if (!token) {
  //       setInitialized(true)
  //       setUser(null)
  //       alert("身份失效，请重新登录")
  //       return
  //     }
  //   }
  //   window.addEventListener("auth-expired", handler)
  //   return () => window.removeEventListener("auth-expired", handler)
  // }, [])
  useEffect(() => {
    if (window.location.pathname === "/login") {
      console.log("apppathname === login")

      setInitialized(true)
      return
    }
    const accessToken = getTokenStore({ name: "access_token" }) || {}
    console.log(accessToken)
    //根据access_token获取用户信息

    if (validatenull(accessToken)) {
      setUser(null)
      setInitialized(true)
      console.log(111)
      return
    }
    setInitialized(true)

    // if (!token) {
    //   setInitialized(true)
    //   return
    // }

    // getMe()
    //   .then(setUser)
    //   .catch(() => {
    //     localStorage.removeItem("token")
    //     setUser(null)
    //   })
    //   .finally(() => {
    //     setInitialized(true)
    //   })
  }, [])

  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
