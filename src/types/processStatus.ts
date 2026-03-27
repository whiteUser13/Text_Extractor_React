// 总日志返回的参数类型，专门用于映射 status_report.json 的结构

// 1.阶段定义
export type ProcessStageKey = 'upload' | 'download' | 'decompress' | 'convert' | 'organize' | 'parse'| 'chunk' | 'extract' | 'judge' | 'generate';

// 2.状态定义
export type StatusState = 'success' | 'processing' | 'failed' | 'skipped' | 'pending';

// 3.单个阶段的统计数据 (用于 Summary)
export interface StageStats {
  success: number;
  failed: number;
  skipped: number;
  total: number;
}


// 1225:自动包含 ProcessStageKey 中定义的所有阶段，Partial 表示这些字段可能是可选的（防止后端某些阶段没数据时报错）
// 4.总览统计数据结构
export type StatusReportSummary = Partial<Record<ProcessStageKey, StageStats>>;

// 5.单个文件在某个具体阶段的详情
export interface FileStageDetail {
  status: StatusState;
  time: string;
  file_used: string;
  error?: string;   // 1225:错误信息
}

// 6. 文件维度的完整状态记录 (对应表格的一行)
export interface FileStatusDetail {

  // ----核心标识字段----
  primary_key: string;    // 1225:地块编码 / 主键
  file_name: string;
  // -----整体状态----
  final_status: StatusState;
  updated_at: string;
  original_name?: string;
  related_files?: string[];
  // [0109新增] 阶段悬浮提示信息映射 (key:阶段名 -> value:提示文本/错误信息)
  stage_hover?: Partial<Record<ProcessStageKey, string>>;

  // 1225:各阶段详情 显式定义各阶段，以便在代码中获得智能提示 (file.upload.status)
  upload?: FileStageDetail;
  download?: FileStageDetail;
  decompress?: FileStageDetail;
  convert?: FileStageDetail;
  organize?: FileStageDetail;
  parse?: FileStageDetail;
  chunk?: FileStageDetail;
  extract?: FileStageDetail;
  judge?: FileStageDetail;
  generate?: FileStageDetail;

  // // 允许索引访问，方便通过变量动态获取阶段数据 (file[stageKey])
  [key: string]: any;

}

// 7. API 响应的 Data 部分结构
export interface StatusReportData {
  summary: StatusReportSummary;   // 1225
  files: {
    list: FileStatusDetail[];
    total: number;
    page: number;
    size: number;
  };
}

