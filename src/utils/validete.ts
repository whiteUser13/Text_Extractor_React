/* eslint-disable */
/**
 * 判断是否是外链
 * @param {string} path
 * @returns {Boolean}
 * @author LiQingSong
 */
export const isExternal = (path: string): boolean => {
  return /^(https?:|mailto:|tel:)/.test(path)
}

/**
 * Created by jiachenpan on 16/11/18.
 */

export function isvalidUsername(str: string) {
  const valid_map = ["admin", "editor"]
  return valid_map.indexOf(str.trim()) >= 0
}

/* 合法uri*/
export function validateURL(textval: string) {
  const urlregex =
    /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/
  return urlregex.test(textval)
}
/**
 * 邮箱
 * @param {*} s
 */
export function isEmail(s: string) {
  return /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((.[a-zA-Z0-9_-]{2,3}){1,2})$/.test(
    s,
  )
}

/**
 * 手机号码
 * @param {*} s
 */
export function isMobile(s: string) {
  return /^1[0-9]{10}$/.test(s)
}

/**
 * 电话号码
 * @param {*} s
 */
export function isPhone(s: string) {
  return /^([0-9]{3,4}-)?[0-9]{7,8}$/.test(s)
}

/**
 * URL地址
 * @param {*} s
 */
export function isURL(s: string) {
  return /^http[s]?:\/\/.*/.test(s)
}

/**
 * ip
 * @param {*} s
 */
export function isIP(s: string) {
  return /^((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)$/.test(
    s,
  )
}

/* 小写字母*/
export function validateLowerCase(str: string) {
  const reg = /^[a-z]+$/
  return reg.test(str)
}

/* 大写字母*/
export function validateUpperCase(str: string) {
  const reg = /^[A-Z]+$/
  return reg.test(str)
}

/* 大小写字母*/
export function validatAlphabets(str: string) {
  const reg = /^[A-Za-z]+$/
  return reg.test(str)
}
/*验证pad还是pc*/
export const vaildatePc = function () {
  const userAgentInfo = navigator.userAgent
  const Agents = [
    "Android",
    "iPhone",
    "SymbianOS",
    "Windows Phone",
    "iPad",
    "iPod",
  ]
  let flag = true
  for (var v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false
      break
    }
  }
  return flag
}
/**
 * validate email
 * @param email
 * @returns {boolean}
 */
export function validateEmail(email: string) {
  const re =
    /^(([^<>()\\[\]\\.,;:\s@"]+(\.[^<>()\\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}

/**
 * 判断身份证号码
 */
export function cardid(code: string) {
  let list = []
  let result = true
  let msg = ""
  var city = new Map([
    [11, "北京"],
    [12, "天津"],
    [13, "河北"],
    [14, "山西"],
    [15, "内蒙古"],
    [21, "辽宁"],
    [22, "吉林"],
    [23, "黑龙江 "],
    [31, "上海"],
    [32, "江苏"],
    [33, "浙江"],
    [34, "安徽"],
    [35, "福建"],
    [36, "江西"],
    [37, "山东"],
    [41, "河南"],
    [42, "湖北 "],
    [43, "湖南"],
    [44, "广东"],
    [45, "广西"],
    [46, "海南"],
    [50, "重庆"],
    [51, "四川"],
    [52, "贵州"],
    [53, "云南"],
    [54, "西藏 "],
    [61, "陕西"],
    [62, "甘肃"],
    [63, "青海"],
    [64, "宁夏"],
    [65, "新疆"],
    [71, "台湾"],
    [81, "香港"],
    [82, "澳门"],
    [91, "国外 "],
  ])
  if (!validatenull(code)) {
    if (code.length == 18) {
      if (!code || !/(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(code)) {
        msg = "证件号码格式错误"
      } else if (!city.get(Number(code.substr(0, 2)))) {
        msg = "地址编码错误"
      } else {
        //18位身份证需要验证最后一位校验位
        const codesplit = code.split("")
        //∑(ai×Wi)(mod 11)
        //加权因子
        var factor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
        //校验位
        var parity = [1, 0, "X", 9, 8, 7, 6, 5, 4, 3, 2, "x"]
        var sum = 0
        var ai = 0
        var wi = 0
        for (var i = 0; i < 17; i++) {
          ai = Number(codesplit[i])
          wi = factor[i]
          sum += ai * wi
        }
        if (parity[sum % 11] != codesplit[17]) {
          msg = "证件号码校验位错误"
        } else {
          result = false
        }
      }
    } else {
      msg = "证件号码长度不为18位"
    }
  } else {
    msg = "证件号码不能为空"
  }
  list.push(result)
  list.push(msg)
  return list
}
/**
 * 判断手机号码是否正确
 */
export function isvalidatemobile(phone: string) {
  let list = []
  let result = true
  let msg = ""
  var isPhone = /^0\d{2,3}-?\d{7,8}$/
  //增加134 减少|1349[0-9]{7}，增加181,增加145，增加17[678]
  if (!validatenull(phone)) {
    if (phone.length == 11) {
      if (isPhone.test(phone)) {
        msg = "手机号码格式不正确"
      } else {
        result = false
      }
    } else {
      msg = "手机号码长度不为11位"
    }
  } else {
    msg = "手机号码不能为空"
  }
  list.push(result)
  list.push(msg)
  return list
}
/**
 * 判断姓名是否正确
 */
export function validatename(name: string) {
  var regName = /^[\u4e00-\u9fa5]{2,4}$/
  if (!regName.test(name)) return false
  return true
}
/**
 * 判断是否为整数
 */
export function validatenum(num: string, type: number) {
  let regName = /[^\d.]/g
  if (type == 1) {
    if (!regName.test(num)) return false
  } else if (type == 2) {
    regName = /[^\d]/g
    if (!regName.test(num)) return false
  }
  return true
}
/**
 * 判断是否为小数
 */
export function validatenumord(num: string, type: number) {
  let regName = /[^\d.]/g
  if (type == 1) {
    if (!regName.test(num)) return false
  } else if (type == 2) {
    regName = /[^\d.]/g
    if (!regName.test(num)) return false
  }
  return true
}
/**
 * 判断是否为空
 */
export function validatenull(val: any) {
  if (typeof val == "boolean") {
    return false
  }
  if (typeof val == "number") {
    return false
  }
  if (val instanceof Array) {
    if (val.length == 0) return true
  } else if (val instanceof Object) {
    if (JSON.stringify(val) === "{}") return true
  } else {
    if (
      val == "null" ||
      val == null ||
      val == "undefined" ||
      val == undefined ||
      val == ""
    )
      return true
    return false
  }
  return false
}

//判断是否存在html标签和是否有特殊符号
export function validatehtmlTag(val: string) {
  var reg = RegExp(/<[^>]+>/gim)
  var regEn = RegExp(/[&]/gim)
  if (reg.test(val) || regEn.test(val)) {
    //存在
    return true
  } else {
    return false
  }
}

/**
 * 允许字符串最大长度
 * @param s  字符串,默认50
 * @param l  最大长度
 * @returns  true不超过长度 false超过长度
 */
export function validateStrMaxLength(s: string, l = 50) {
  if (s.length > l) {
    return false
  } else {
    return true
  }
}

/**
 * 密码必须由大小字母、数字及特殊符号组成
 * @param {s} s
 */
export function validateLevelProtectionPassWord(s: string) {
  var reg =
    /^(?![0-9]+$)(?![a-zA-Z]+$)(?![~!@#$%^&*()_+]+$)[0-9a-zA-Z~!@#$%^&*()_+]{8,18}$/g
  if (reg.test(s)) {
    return true
  } else {
    return false
  }
}
/**
 * 判断是否含有全部特殊字符
 * 若需要默认检验全部特殊字符，则调用该方法时需要传rule为"",即allSpecialKey("",val)
 */
export function allSpecialKey(rule: any, val: string) {
  if (rule) {
    if (!rule.test(val)) {
      return false
    }
    return true
  } else {
    //var regRule = /[`~!@#$%^&*()_\-+=<>?:"{}|,.\/;'\\[\]·~！@#￥%……&*（）——\-+={}|《》？：“”【】、；‘'，。、]/im;
    var regRule =
      /[`~!@#$%^&*()\-+=<>?"{}|,.;'\\[\]·~！@#￥%……&*（）——\-+={}|《》？：“”【】、；‘'，。、]/im
    if (!regRule.test(val)) {
      return false
    }
    return true
  }
}

//判断字符串是否为空或者只含有空格，为空返回true
export function validateempty(val: string) {
  if (val.trim() == "") {
    return true
  }
  return false
}

//判断是否有特殊字符&[]<>
export function validateSpecial(val: string) {
  // var reg=RegExp(/<[^>]+>/gim);
  var regEn = RegExp(/[&\[\]<>]/im)
  if (regEn.test(val)) {
    //存在
    return true
  }
  return false
}

//通用方法：表单一般字段校验
export function validateFormNormal(val: string) {
  if (validateSpecial(val)) {
    return "不可以输入特殊字符&[]<>"
  }
  return ""
}

//通用方法：表单必填字段校验
export function validateFormRequired(val: string) {
  if (validateempty(val)) {
    return "必填项不能为空"
  } else if (validateSpecial(val)) {
    return "不可以输入特殊字符&[]<>"
  }
  return ""
}

//通用方法：查询字段校验
export function validateSearch(val: string) {
  if (validateSpecial(val)) {
    return "不可以输入特殊字符&[]<>"
  }
  return ""
}

// 去掉json的value中前后空格
export function jsonValueTrim(val: any) {
  if (typeof val == "object") {
    try {
      const reg = /^\s+|\s+$/g
      for (let p in val) {
        if (typeof val[p] == "string") {
          val[p] = val[p].replace(reg, "")
        }
      }
    } catch (e) {
      console.log(e)
    }
  }
  return val
}

// 去掉json的value中前后空格
export function validatePassWord(
  value: string,
  passwordLength: number,
  passwordComplexity: string,
  username: string,
) {
  const passwordComplexityArr = passwordComplexity.split(",")
  let isValidate = true
  let errorMessage = "至少" + passwordLength + "位-18位"
  if (value.length < passwordLength) {
    isValidate = false
  }
  if (passwordComplexityArr.includes("upperCase")) {
    errorMessage = errorMessage + "、必须包含大写字母"
    const reg = RegExp(/[A-Z]/)
    if (!reg.test(value)) {
      isValidate = false
    }
  }
  if (passwordComplexityArr.includes("lowerCase")) {
    errorMessage = errorMessage + "、必须包含小写字母"
    const reg = RegExp(/[a-z]/)
    if (!reg.test(value)) {
      isValidate = false
    }
  }
  if (passwordComplexityArr.includes("number")) {
    errorMessage = errorMessage + "、必须包含数字"
    const reg = RegExp(/[0-9]/)
    if (!reg.test(value)) {
      isValidate = false
    }
  }
  if (passwordComplexityArr.includes("specialCharacters")) {
    errorMessage = errorMessage + "、必须包含特殊字符"
    const reg = RegExp(/[@%\+\\\/'!#\$\^\?:,\(\){}\[\]~\-_\.]/)
    if (!reg.test(value)) {
      isValidate = false
    }
  }
  if (passwordComplexityArr.includes("noUserName")) {
    errorMessage = errorMessage + "、不能包含用户名"
    if (value.indexOf(username) >= 0) {
      isValidate = false
    }
  }
  if (isValidate) {
    return ""
  } else {
    return errorMessage
  }
}
