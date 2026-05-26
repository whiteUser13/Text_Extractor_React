import { AirVent } from "lucide-react"
import apiClient from "./index"
import { mode } from "crypto-js"

export interface PDFFileInfo {
  file_name: string
  status: string
  valid: string
  judge_error?: string
  is_reviewed?: boolean
  is_correct?: string
}
export interface PDFFileDetails {
  file_name: string
  extraction_result: Record<string, string>
  ai_extraction_results: Record<string, string>
  page_idx: Record<string, number>
  judge_result: Record<string, string>
  ai_judged_results: Record<string, string>
  is_reviewed?: boolean
  is_correct?: string // "yes" | "no" | "unknown"
}
interface DetailResult {
  success: boolean
  data: PDFFileDetails
  msg: string
}

interface JudgeResult<T> {
  success: boolean
  data?: T
  error?: string
}

interface FileResult {
  success: boolean
  data: PDFFileInfo[]
  msg: string
}
interface PathResult {
  success: boolean
  path: string
  msg: string
}

// 根据task_id获取文件信息，包括文件名，判别状态，是否合规等内容
// e:\system\Text_Extractor_React\src\api\aiResult.ts

// ... 其他代码 ...

// 根据task_id或scene_id获取文件信息
export async function getFilesInfo(
  task_id?: string, 
  scene_id?: string
): Promise<FileResult> {
  try {
    // 构建参数对象，只包含存在的值
    const params: any = {};
    if (task_id) params.task_id = task_id;
    if (scene_id) params.scene_id = scene_id;

    // 如果两个都没有，直接返回空，避免请求报错
    if (!task_id && !scene_id) {
      return { success: true, data: [], msg: "No ID provided" };
    }

    const res = await apiClient.get("api/airesult/file/info", {
      params: params,
    });

    if (res.status === 200) {
      return { success: true, data: res.data, msg: "" };
    } else {
      return { success: false, data: [], msg: res.data?.msg || "获取失败" };
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.message || error.response?.data?.msg || "网络错误",
    };
  }
}

// ... 其他代码 ...

// 根据文件名和task_id获取文件的提取和判别信息
export async function getFileDetailsByName(
  file_name: string,
  task_id: string,
): Promise<DetailResult> {
  try {
    const res = await apiClient.get("api/airesult/file/details", {
      params: {
        file_name: file_name,
        task_id: task_id,
      },
    })
    if (res.status === 200) {
      return { success: true, data: res.data, msg: "获取成功" }
    } else {
      const pdfDetail = {
        file_name: "",
        extraction_result: {},
        ai_extraction_results: {},
        page_idx: {},
        judge_result: {},
        ai_judged_results: {},
        is_correct: "unknown",
      }
      return { success: false, data: pdfDetail, msg: "获取失败" }
    }
  } catch (error: any) {
    const pdfDetail = {
      file_name: "",
      extraction_result: {},
      ai_extraction_results: {},
      page_idx: {},
      judge_result: {},
      ai_judged_results: {},
      is_correct: "unknown",
    }
    return {
      success: false,
      data: pdfDetail,
      msg: error.response?.data?.message || "网络错误",
    }
  }

  // return res.data.folders as PDFFileDetails[]
}

// 获取pdf文件路径
export async function getPdfPath(
  file_name: string,
  task_id: string,
): Promise<PathResult> {
  try {
    const res = await apiClient.get("api/airesult/pdf/path", {
      params: {
        file_name: file_name,
        task_id: task_id,
      },
    })
    if (res.status === 200) {
      return { success: true, path: res.data.pdf_url, msg: "获取成功" }
    } else {
      const pdfDetail = {
        file_name: "",
        extraction_result: {},
        page_idx: {},
        judge_result: {},
      }
      return { success: false, path: "", msg: "获取失败" }
    }
  } catch (error: any) {
    const pdfDetail = {
      file_name: "",
      extraction_result: {},
      page_idx: {},
      judge_result: {},
    }
    return {
      success: false,
      path: "",
      msg: error.response?.data?.message || "网络错误",
    }
  }
}
//修改提取和判别信息
export async function updateDetail(
  file_name: string,
  task_id: string,
  extraction_result: Record<string, string>,
  judge_result: Record<string, string>,
  page_idx: Record<string, number>,
  is_correct: string = "unknown",
) {
  try {
    const res = await apiClient.post("api/airesult/review", {
      file_name: file_name,
      task_id: task_id,
      extraction_result: extraction_result,
      judge_result: judge_result,
      page_idx: page_idx,
      is_correct: is_correct,
    })
    if (res.status === 200) {
      return { success: true, msg: "修改成功" }
    } else {
      return { success: false, msg: "修改失败" }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.response?.data?.message || "网络错误",
    }
  }
}

//ai统计
interface AIStatisticsResult {
  success: boolean
  data: Record<string, any>[]
  msg: string
}
export async function getAIStatistics(
  model: string,
  task_id: string,
  statType: string,
  prompt: string,
  customFields: string[],
) {
  try {
    const res = await apiClient.post("api/airesult/ai/statistics", {
      model: model,
      task_id: task_id,
      statType: statType,
      prompt: prompt,
      customFields: customFields,
    })
    if (res.status === 200) {
      return { success: true, data: res.data.data, msg: "获取成功" }
    } else {
      return { success: false, data: [], msg: "获取失败" }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}
export async function getAIStatisticsByScene(
  model: string,
  task_id: string,
  scene_id: string,
  statType: string,
  prompt: string,
  customFields: string[],
) {
  try {
    const res = await apiClient.post("api/airesult/ai/stats/byscene", {
      model: model,
      task_id: task_id,
      scene_id: scene_id,
      statType: statType,
      prompt: prompt,
      customFields: customFields,
    })
    if (res.status === 200) {
      return { success: true, data: res.data.data, msg: "获取成功" }
    } else {
      return { success: false, data: [], msg: "获取失败" }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}

export async function saveStatsInTask(
  task_id: string,
  stats_name: string,
  stats_prompt: string,
  stats_result: Record<string, any>[],
) {
  try {
    const res = await apiClient.post("api/airesult/save/stats/task", {
      task_id: task_id,
      stats_name: stats_name,
      stats_prompt: stats_prompt,
      stats_result: stats_result,
    })
    if (res.status === 200) {
      return { success: true, msg: "保存成功" }
    } else {
      return { success: false, data: [], msg: "保存失败" }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}

export async function saveStatsInScene(
  scene_id: string,
  stats_name: string,
  stats_prompt: string,
  stats_result: Record<string, any>[],
) {
  try {
    const res = await apiClient.post("api/airesult/save/stats/scene", {
      scene_id: scene_id,
      stats_name: stats_name,
      stats_prompt: stats_prompt,
      stats_result: stats_result,
    })
    if (res.status === 200) {
      return { success: true, msg: "保存成功" }
    } else {
      return { success: false, data: [], msg: "保存失败" }
    }
  } catch (error: any) {
    return {
      success: false,
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}

export interface SavedStatisticsItem {
  stats_name: string
  stats_prompt: string
  stats_result: { name: string; value: number }[]
}

interface SavedStatisticsResult {
  success: boolean
  data: SavedStatisticsItem[]
  msg: string
}

export async function getSavedStatsInTask(
  task_id: string,
): Promise<SavedStatisticsResult> {
  try {
    const res = await apiClient.get("api/airesult/get/stats/task", {
      params: {
        task_id,
      },
    })
    if (res.status === 200) {
      return { success: true, data: res.data.data?.data, msg: "获取成功" }
    }
    return { success: false, data: [], msg: "获取失败" }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}

export async function getSavedStatsInScene(
  scene_id: string,
): Promise<SavedStatisticsResult> {
  try {
    const res = await apiClient.get("api/airesult/get/stats/scene", {
      params: {
        scene_id,
      },
    })
    if (res.status === 200) {
      console.log(res)

      return { success: true, data: res.data.data?.data, msg: "获取成功" }
    }
    return { success: false, data: [], msg: "获取失败" }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}

export async function generateWordBaseTaskStats(task_id: string) {
  try {
    const res = await apiClient.post("api/airesult/generate/word/task", {
      task_id: task_id,
    })
    if (res.status === 200) {
      return { success: true, data: res.data.data, msg: "生成成功" }
    } else {
      return { success: false, data: [], msg: "生成失败" }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}
export async function generateWordBaseSceneStats(
  scene_id: string,
  task_id: string,
) {
  try {
    const res = await apiClient.post("api/airesult/generate/word/scene", {
      scene_id: scene_id,
      task_id: task_id,
    })
    if (res.status === 200) {
      return { success: true, data: res.data.data, msg: "生成成功" }
    } else {
      return { success: false, data: [], msg: "生成失败" }
    }
  } catch (error: any) {
    return {
      success: false,
      data: [],
      msg: error.response?.data?.msg || "网络错误",
    }
  }
}
