/**
 * 全局配置文件
 */
export default {
  //JC4A服务地址
  JC4AServiceURL: "http://10.100.226.96:8238",
  APPID: "app_852030526452797440",
  // redirect_uri: "http://localhost:5173/login",
  // logout_redirect_uri: "http://localhost:5173/logout?logout=success",
  redirect_uri: "http://10.10.163.145:8080/login",
  logout_redirect_uri: "http://10.10.163.145:8080/logout?logout=success",
  grantType: "authorization_code",

  // 超过多少秒进行token刷新
  tokenTime: 600,
  // 错误提示时间
  errorTime: 10000,
  // 成功提示时间
  successTime: 3000,
}
