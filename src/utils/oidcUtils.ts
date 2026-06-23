import website from "@/config/website"
import { clearLocalSession } from "./store"

export const LOGOUT_IN_PROGRESS_KEY = "oauth_logout_in_progress"

/**
 * Call the business backend to revoke the OAuth2 access token, then clear the
 * browser session. Native fetch is used to avoid the Axios 401 interceptor
 * recursively triggering logout.
 */
export async function oidcLogout(accessToken: string): Promise<void> {
  sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, "true")

  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (!response.ok) {
      console.error("撤销 OAuth2 token 失败:", response.status)
    }
  } finally {
    clearLocalSession()
    sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, "true")
    window.location.replace(website.logout_redirect_uri)
  }
}
