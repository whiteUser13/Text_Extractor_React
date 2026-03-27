// import { ReactNode } from "react"
// import { Navigate } from "react-router-dom"
// import { useUserStore } from "@/context/userStore"

// interface RequireAuthProps {
//   children: ReactNode
// }

// export default function RequireAuth({ children }: RequireAuthProps) {
//   const user = useUserStore((state) => state.user)
//   const initialized = useUserStore((state) => state.initialized)
//   // 如果认证未初始化，显示加载状态
//   if (!initialized) {
//     return (
//       <div className="flex items-center justify-center min-h-[200px]">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
//       </div>
//     )
//   }

//   if (!user) {
//     return <Navigate to="/login" replace />
//   }
//   return children
// }
import { ReactNode, useEffect } from "react"
import { useUserStore } from "@/context/userStore"
import { redirectToOAuthLogin } from "@/api/auth"

interface RequireAuthProps {
  children: ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const user = useUserStore((state) => state.user)
  const initialized = useUserStore((state) => state.initialized)

  useEffect(() => {
    if (initialized && !user) {
      redirectToOAuthLogin()
    }
  }, [initialized, user])

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div>正在跳转到统一登录...</div>
      </div>
    )
  }

  return children
}
