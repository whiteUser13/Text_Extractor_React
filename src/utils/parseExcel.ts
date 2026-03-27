// utils/parseExcel.ts
import * as XLSX from "xlsx"

export interface ParsedExcelResult {
  columns: string[]
  rows: Record<string, any>[]
}

/**
 * 解析 Excel 或 CSV 文件，提取所有列名与行数据
 * @param file 前端上传的文件对象 (File)
 * @returns Promise<ParsedExcelResult>
 */
export async function parseExcel(file: File): Promise<ParsedExcelResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsArrayBuffer(file)
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result
        if (!buffer) throw new Error("无法读取文件内容")

        // 1️⃣ 读取 workbook
        const workbook = XLSX.read(buffer, { type: "array" })

        // 2️⃣ 取第一个工作表
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // 3️⃣ 转为 JSON
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

        // 4️⃣ 提取列名
        const columns = Object.keys(rows[0] || {})
        resolve({ columns, rows })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = (err) => {
      reject(err)
    }
  })
}
