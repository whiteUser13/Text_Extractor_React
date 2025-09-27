import api from '@/utils/api';
import { sendChatStream } from '@/utils/chat';
import { convertFileToBase64, isImageFile, isPdfFile } from '@/utils/fileUtils';
import { dataService } from './dataService';
import type { 
  FileInfo, 
  ProcessingStage, 
  OCRResult, 
  ImageAnalysisResult,
  ExtractionResult,
  JudgmentResult,
  DocumentParseResult
} from '@/types';

class ProcessingService {
  private readonly APP_ID = import.meta.env.VITE_APP_ID;

  // 处理单个文件
  async processFile(file: File, fileInfo: FileInfo): Promise<void> {
    try {
      // 更新状态为处理中
      dataService.updateFile(fileInfo.id, { status: 'processing' });
      
      // 阶段1: 文件转换
      await this.updateStage(fileInfo.id, 'convert', 10, '正在转换文件格式...');
      const base64Content = await this.convertFile(file);
      
      // 阶段2: 内容解析
      await this.updateStage(fileInfo.id, 'parse', 30, '正在解析文档内容...');
      const parseResult = await this.parseDocument(file, base64Content, fileInfo.id);
      
      // 阶段3: 内容提取
      await this.updateStage(fileInfo.id, 'extract', 60, '正在提取关键信息...');
      await this.extractContent(fileInfo.id, parseResult);
      
      // 阶段4: 智能判别
      await this.updateStage(fileInfo.id, 'analyze', 80, '正在进行智能分析...');
      await this.analyzeContent(fileInfo.id);
      
      // 完成处理
      await this.updateStage(fileInfo.id, 'completed', 100, '处理完成');
      dataService.updateFile(fileInfo.id, { status: 'completed' });
      
    } catch (error) {
      console.error('文件处理失败:', error);
      const errorMessage = error instanceof Error ? error.message : '处理失败';
      dataService.updateFile(fileInfo.id, { 
        status: 'error', 
        errorMessage 
      });
      dataService.updateProcessingStatus(fileInfo.id, {
        stage: 'upload',
        progress: 0,
        message: '处理失败',
        error: errorMessage
      });
    }
  }

  // 更新处理阶段
  private async updateStage(
    fileId: string, 
    stage: ProcessingStage, 
    progress: number, 
    message: string
  ): Promise<void> {
    dataService.updateProcessingStatus(fileId, {
      stage,
      progress,
      message
    });
    
    // 模拟处理时间
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 文件转换
  private async convertFile(file: File): Promise<string> {
    if (isImageFile(file) || isPdfFile(file)) {
      return await convertFileToBase64(file);
    }
    
    // 对于其他文件类型，这里可以添加更多转换逻辑
    throw new Error(`不支持的文件类型: ${file.type}`);
  }

  // 文档解析
  private async parseDocument(
    file: File, 
    base64Content: string, 
    fileId: string
  ): Promise<DocumentParseResult> {
    let parsedContent = '';
    
    if (isImageFile(file)) {
      // 使用OCR识别图片中的文字
      const ocrResult = await this.performOCR(base64Content);
      parsedContent = ocrResult.words_result.map(item => item.words).join('\n');
    } else if (isPdfFile(file)) {
      // 对于PDF文件，可以使用OCR或其他PDF解析方法
      const ocrResult = await this.performOCR(base64Content);
      parsedContent = ocrResult.words_result.map(item => item.words).join('\n');
    }

    const parseResult: DocumentParseResult = {
      id: `parse-${fileId}`,
      fileId,
      content: {
        text: parsedContent,
        tables: [], // 这里可以添加表格识别逻辑
        images: [], // 这里可以添加图片识别逻辑
        structure: {
          title: file.name,
          sections: this.extractSections(parsedContent),
          pageCount: 1
        }
      },
      parsedAt: new Date()
    };

    dataService.setParseResult(parseResult);
    return parseResult;
  }

  // OCR文字识别
  private async performOCR(base64Content: string): Promise<OCRResult> {
    try {
      const response = await api.ocrRecognition(base64Content, {
        language_type: 'CHN_ENG',
        detect_direction: true,
        probability: true
      });
      
      if (response.status === 0) {
        return response.data;
      } else {
        throw new Error((response as any).msg || 'OCR识别失败');
      }
    } catch (error) {
      console.error('OCR识别失败:', error);
      throw error;
    }
  }

  // 提取文档章节结构
  private extractSections(text: string): Array<{
    title: string;
    level: number;
    page?: number;
    content: string;
  }> {
    const sections = [];
    const lines = text.split('\n');
    let currentSection = '';
    let currentContent = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) continue;

      // 简单的章节识别逻辑
      if (this.isSectionTitle(trimmedLine)) {
        if (currentSection) {
          sections.push({
            title: currentSection,
            level: 1,
            content: currentContent.trim()
          });
        }
        currentSection = trimmedLine;
        currentContent = '';
      } else {
        currentContent += line + '\n';
      }
    }

    // 添加最后一个章节
    if (currentSection) {
      sections.push({
        title: currentSection,
        level: 1,
        content: currentContent.trim()
      });
    }

    return sections;
  }

  // 判断是否为章节标题
  private isSectionTitle(line: string): boolean {
    // 简单的章节标题识别规则
    const patterns = [
      /^第[一二三四五六七八九十\d]+章/,
      /^第[一二三四五六七八九十\d]+节/,
      /^\d+\./,
      /^\d+\.\d+/,
      /^[一二三四五六七八九十]+、/
    ];
    
    return patterns.some(pattern => pattern.test(line));
  }

  // 内容提取
  private async extractContent(fileId: string, parseResult: DocumentParseResult): Promise<void> {
    const rules = dataService.getAllExtractionRules().filter(rule => rule.enabled);
    const content = parseResult.content.text;

    for (const rule of rules) {
      try {
        const extractedContent = await this.applyExtractionRule(rule, content);
        
        if (extractedContent) {
          const result: ExtractionResult = {
            id: `extract-${fileId}-${rule.id}`,
            fileId,
            ruleId: rule.id,
            content: extractedContent,
            confidence: 0.8, // 这里可以添加置信度计算逻辑
            location: {
              section: '文档内容'
            },
            extractedAt: new Date()
          };
          
          dataService.addExtractionResult(result);
        }
      } catch (error) {
        console.error(`应用提取规则 ${rule.name} 失败:`, error);
      }
    }
  }

  // 应用提取规则
  private async applyExtractionRule(rule: any, content: string): Promise<string | null> {
    // 基于关键词的简单提取
    const foundKeywords = rule.keywords.filter((keyword: string) => 
      content.includes(keyword)
    );

    if (foundKeywords.length === 0) {
      return null;
    }

    // 使用AI进行更智能的内容提取
    return new Promise((resolve, reject) => {
      const prompt = `请从以下文档内容中提取与"${rule.name}"相关的信息。
关键词：${rule.keywords.join('、')}
描述：${rule.description}

文档内容：
${content}

请提取相关信息并以结构化的方式返回：`;

      let extractedContent = '';

      sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        apiId: this.APP_ID,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        onUpdate: (content: string) => {
          extractedContent = content;
        },
        onComplete: () => {
          resolve(extractedContent);
        },
        onError: (error: Error) => {
          reject(error);
        }
      });
    });
  }

  // 智能分析
  private async analyzeContent(fileId: string): Promise<void> {
    const rules = dataService.getAllJudgmentRules().filter(rule => rule.enabled);
    const extractionResults = dataService.getExtractionResults(fileId);
    
    for (const rule of rules) {
      try {
        const analysis = await this.applyJudgmentRule(rule, extractionResults);
        
        if (analysis) {
          const result: JudgmentResult = {
            id: `judge-${fileId}-${rule.id}`,
            fileId,
            ruleId: rule.id,
            result: analysis.result,
            score: analysis.score,
            classification: analysis.classification,
            interpretation: analysis.interpretation,
            confidence: analysis.confidence,
            details: analysis.details,
            judgedAt: new Date()
          };
          
          dataService.addJudgmentResult(result);
        }
      } catch (error) {
        console.error(`应用判别规则 ${rule.name} 失败:`, error);
      }
    }
  }

  // 应用判别规则
  private async applyJudgmentRule(rule: any, extractionResults: ExtractionResult[]): Promise<any> {
    const content = extractionResults.map(r => r.content).join('\n');
    
    if (!content.trim()) {
      return null;
    }

    // 使用AI进行智能判别
    return new Promise((resolve, reject) => {
      const prompt = `请根据以下规则对文档内容进行分析判别：

规则名称：${rule.name}
规则描述：${rule.description}
判别类型：${rule.type}

文档内容：
${content}

请根据规则进行分析，并返回以下格式的结果：
- 判别结果：通过/不通过/警告
- 置信度：0-1之间的数值
- 详细说明：具体的分析过程和结论`;

      let analysisResult = '';

      sendChatStream({
        endpoint: '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat',
        apiId: this.APP_ID,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        onUpdate: (content: string) => {
          analysisResult = content;
        },
        onComplete: () => {
          // 解析AI返回的结果
          const result = this.parseAnalysisResult(analysisResult, rule.type);
          resolve(result);
        },
        onError: (error: Error) => {
          reject(error);
        }
      });
    });
  }

  // 解析分析结果
  private parseAnalysisResult(analysisText: string, ruleType: string): any {
    // 简单的结果解析逻辑
    const result = {
      result: 'warning' as 'pass' | 'fail' | 'warning',
      confidence: 0.7,
      details: analysisText,
      score: undefined as number | undefined,
      classification: undefined as string | undefined,
      interpretation: undefined as string | undefined
    };

    // 根据关键词判断结果
    if (analysisText.includes('通过') || analysisText.includes('合规')) {
      result.result = 'pass';
    } else if (analysisText.includes('不通过') || analysisText.includes('违规')) {
      result.result = 'fail';
    }

    // 根据规则类型设置额外字段
    if (ruleType === 'classification') {
      result.classification = this.extractClassification(analysisText);
    } else if (ruleType === 'interpretation') {
      result.interpretation = analysisText;
    }

    return result;
  }

  // 提取分类结果
  private extractClassification(text: string): string {
    const classifications = ['高风险', '中风险', '低风险', '无风险'];
    for (const classification of classifications) {
      if (text.includes(classification)) {
        return classification;
      }
    }
    return '未分类';
  }

  // 批量处理文件
  async processBatch(files: File[]): Promise<void> {
    const promises = files.map(async (file) => {
      const fileInfo: FileInfo = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadTime: new Date(),
        status: 'uploading'
      };

      dataService.addFile(fileInfo);
      return this.processFile(file, fileInfo);
    });

    await Promise.allSettled(promises);
  }
}

export const processingService = new ProcessingService();