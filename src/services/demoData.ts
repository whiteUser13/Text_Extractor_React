import { dataService } from "./dataService"
import type {
  FileInfo,
  ExtractionResult,
  JudgmentResult,
  DocumentParseResult,
} from "@/types"
import axios from "axios"

// 初始化演示数据
export const initializeDemoData = async () => {
  // 创建演示文件
  const demoFiles: FileInfo[] = []
  try {
    const res = await axios.get("http://127.0.0.1:8000/files_info/downloads")
    // 接口返回 { count, files }
    console.log(res.data.files)
    res.data.files.forEach((file: any) => {
      demoFiles.push({
        id: file.id,
        name: file.filename,
        size: file.size,
        type: file.type,
        uploadTime: new Date(file.download_time),
        status: file.status,
      })
    })
  } catch (err) {
    console.error("获取文件信息失败", err)
  }

  // 添加文件到数据服务
  demoFiles.forEach((file) => {
    dataService.addFile(file)
  })

  // 为已完成的文件添加解析结果
  const parseResult1: DocumentParseResult = {
    id: "parse-demo-file-1",
    fileId: "demo-file-1",
    content: {
      text: `地块违规建设情况报告

一、地块基本信息
地块编号：GD2024001
地块位置：广东省深圳市南山区科技园
地块面积：15000平方米
土地性质：工业用地

二、违规建设情况
1. 未批先建情况
发现未经审批的临时建筑3栋，总面积约500平方米。

2. 超面积建设
主体建筑实际建设面积为12000平方米，超出批准面积2000平方米。

三、整改建议
1. 立即停止违规建设
2. 补办相关审批手续
3. 拆除超面积部分`,
      tables: [
        {
          title: "违规建设统计表",
          headers: ["类型", "数量", "面积(㎡)", "状态"],
          rows: [
            ["未批先建", "3栋", "500", "待整改"],
            ["超面积建设", "1栋", "2000", "待整改"],
          ],
          page: 1,
        },
      ],
      images: [],
      structure: {
        title: "地块违规建设情况报告",
        sections: [
          {
            title: "地块基本信息",
            level: 1,
            page: 1,
            content:
              "地块编号：GD2024001\n地块位置：广东省深圳市南山区科技园\n地块面积：15000平方米\n土地性质：工业用地",
          },
          {
            title: "违规建设情况",
            level: 1,
            page: 1,
            content:
              "未批先建情况：发现未经审批的临时建筑3栋\n超面积建设：超出批准面积2000平方米",
          },
        ],
        pageCount: 2,
      },
    },
    parsedAt: new Date(Date.now() - 3000000),
  }

  const parseResult2: DocumentParseResult = {
    id: "parse-demo-file-2",
    fileId: "demo-file-2",
    content: {
      text: `土壤污染检测报告

一、检测概况
检测地点：深圳市南山区某工业园
检测时间：2024年1月15日
检测项目：重金属污染物检测

二、检测结果
1. 铅含量：150mg/kg（标准值：≤100mg/kg）
2. 镉含量：5.2mg/kg（标准值：≤3mg/kg）
3. 汞含量：2.1mg/kg（标准值：≤2mg/kg）

三、污染评估
根据检测结果，该地块存在重度污染，铅和镉含量均超标。

四、治理建议
1. 立即停止生产活动
2. 实施土壤修复工程
3. 定期监测污染物浓度`,
      tables: [
        {
          title: "重金属检测结果",
          headers: ["污染物", "检测值(mg/kg)", "标准值(mg/kg)", "是否超标"],
          rows: [
            ["铅", "150", "≤100", "是"],
            ["镉", "5.2", "≤3", "是"],
            ["汞", "2.1", "≤2", "是"],
          ],
          page: 1,
        },
      ],
      images: [],
      structure: {
        title: "土壤污染检测报告",
        sections: [
          {
            title: "检测概况",
            level: 1,
            page: 1,
            content: "检测地点：深圳市南山区某工业园\n检测时间：2024年1月15日",
          },
          {
            title: "检测结果",
            level: 1,
            page: 1,
            content: "铅含量：150mg/kg\n镉含量：5.2mg/kg\n汞含量：2.1mg/kg",
          },
        ],
        pageCount: 2,
      },
    },
    parsedAt: new Date(Date.now() - 6000000),
  }

  dataService.setParseResult(parseResult1)
  dataService.setParseResult(parseResult2)

  // 添加提取结果
  const extractionResults: ExtractionResult[] = [
    {
      id: "extract-demo-1",
      fileId: "demo-file-1",
      ruleId: "rule-1",
      content:
        "地块编号：GD2024001\n地块位置：广东省深圳市南山区科技园\n地块面积：15000平方米\n土地性质：工业用地",
      confidence: 0.95,
      location: {
        section: "地块基本信息",
        page: 1,
      },
      extractedAt: new Date(Date.now() - 2700000),
    },
    {
      id: "extract-demo-2",
      fileId: "demo-file-1",
      ruleId: "rule-3",
      content:
        "未批先建情况：发现未经审批的临时建筑3栋，总面积约500平方米\n超面积建设：主体建筑实际建设面积为12000平方米，超出批准面积2000平方米",
      confidence: 0.88,
      location: {
        section: "违规建设情况",
        page: 1,
      },
      extractedAt: new Date(Date.now() - 2400000),
    },
    {
      id: "extract-demo-3",
      fileId: "demo-file-2",
      ruleId: "rule-2",
      content:
        "铅含量：150mg/kg（标准值：≤100mg/kg）超标\n镉含量：5.2mg/kg（标准值：≤3mg/kg）超标\n汞含量：2.1mg/kg（标准值：≤2mg/kg）超标",
      confidence: 0.92,
      location: {
        section: "检测结果",
        page: 1,
      },
      extractedAt: new Date(Date.now() - 5400000),
    },
  ]

  extractionResults.forEach((result) => {
    dataService.addExtractionResult(result)
  })

  // 添加判别结果
  const judgmentResults: JudgmentResult[] = [
    {
      id: "judge-demo-1",
      fileId: "demo-file-1",
      ruleId: "judge-1",
      result: "fail",
      confidence: 0.93,
      details:
        "该地块存在严重违规建设问题：\n1. 未批先建：发现3栋未经审批的临时建筑\n2. 超面积建设：超出批准面积2000平方米\n\n根据相关法规，该地块不符合合规要求，需要立即整改。",
      judgedAt: new Date(Date.now() - 2100000),
    },
    {
      id: "judge-demo-2",
      fileId: "demo-file-2",
      ruleId: "judge-1",
      result: "fail",
      confidence: 0.96,
      details:
        "土壤污染检测结果显示该地块存在重度污染：\n1. 铅含量超标50%\n2. 镉含量超标73%\n3. 汞含量超标5%\n\n该地块不符合环保要求，存在严重环境风险。",
      judgedAt: new Date(Date.now() - 5100000),
    },
    {
      id: "judge-demo-3",
      fileId: "demo-file-2",
      ruleId: "judge-2",
      result: "fail",
      classification: "高风险",
      confidence: 0.91,
      details:
        "根据污染物浓度分析，该地块污染等级为高风险：\n- 多种重金属同时超标\n- 超标幅度较大\n- 需要立即采取治理措施",
      judgedAt: new Date(Date.now() - 4800000),
    },
  ]

  judgmentResults.forEach((result) => {
    dataService.addJudgmentResult(result)
  })

  // 更新处理状态
  dataService.updateProcessingStatus("demo-file-3", {
    stage: "parse",
    progress: 65,
    message: "正在解析文档内容...",
  })

  console.log("演示数据初始化完成")
}

// 清除演示数据
export const clearDemoData = () => {
  dataService.clearAll()
  console.log("演示数据已清除")
}
