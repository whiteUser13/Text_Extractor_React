/**
 * 全局配置文件
 */
export default {
  // 应用ID
  applicationId: "c5a8639164b81b94ffbfb8df94886693",
  //单点登录门户
  unifyLoginURL: "http://10.100.224.56:35501/auth-server",
  // redirect_uri: "http://10.10.163.145:8080/login",
  // logout_redirect_uri: "http://10.10.163.145:8080/login",
  redirect_uri: "http://localhost:5173/login",
  logout_redirect_uri: "http://localhost:5173/login",
  clientSecret: "ogTkdxy7r0WNtmP2",
  clientPublicKey:
    "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAOjrw4K3ouMZBU8Y9YnxdTMJz6CWYv6sBTSOAglbQ65OT9SVSDfWie/F9mFVM+dDrMkEpjwtTd1+7AY9vced4SECAwEAAQ==",
  grantType: "authorization_code",

  // 超过多少秒进行token刷新
  tokenTime: 1800,
  // 错误提示时间
  errorTime: 10000,
  // 成功提示时间
  successTime: 3000,
}
