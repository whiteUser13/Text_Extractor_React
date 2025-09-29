import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Table2, 
  Download, 
  Eye, 
  Settings, 
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  CheckCircle
} from 'lucide-react';
import type { FileInfo } from '@/types';

interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
}

interface TableTemplate {
  id: string;
  name: string;
  description: string;
  columns: TableColumn[];
  createdAt: Date;
}

interface ResultRow {
  id: string;
  fileName: string;
  fileId: string;
  data: Record<string, any>;
  extractedAt: Date;
}

const ResultsOutput: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [templates, setTemplates] = useState<TableTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [results, setResults] = useState<ResultRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TableTemplate>>({
    name: '',
    description: '',
    columns: []
  });

  // 初始化数据
  useEffect(() => {
    // 获取已处理的文件
    const savedFiles = localStorage.getItem('uploadedFiles');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      setFiles(parsedFiles.filter((file: FileInfo) => file.status === 'completed'));
    }

    // 初始化默认模板
    const defaultTemplates: TableTemplate[] = [
      {
        id: 'template-1',
        name: '地块违规建设报告',
        description: '用于地块违规建设情况报告的内容提取',
        columns: [
          { id: 'col-1', name: '地块编号', type: 'text', required: true },
          { id: 'col-2', name: '违规类型', type: 'text', required: true },
          { id: 'col-3', name: '违规面积', type: 'number', required: true },
          { id: 'col-4', name: '发现时间', type: 'date', required: true },
          { id: 'col-5', name: '处理状态', type: 'text', required: false },
          { id: 'col-6', name: '责任单位', type: 'text', required: true }
        ],
        createdAt: new Date()
      },
      {
        id: 'template-2',
        name: '土壤污染检测报告',
        description: '用于土壤与水污染报告的数据提取',
        columns: [
          { id: 'col-1', name: '检测点位', type: 'text', required: true },
          { id: 'col-2', name: '污染物名称', type: 'text', required: true },
          { id: 'col-3', name: '检测值', type: 'number', required: true },
          { id: 'col-4', name: '标准值', type: 'number', required: true },
          { id: 'col-5', name: '超标倍数', type: 'number', required: false },
          { id: 'col-6', name: '检测时间', type: 'date', required: true },
          { id: 'col-7', name: '风险等级', type: 'text', required: true }
        ],
        createdAt: new Date()
      },
      {
        id: 'template-3',
        name: '通用信息提取',
        description: '通用的文档信息提取模板',
        columns: [
          { id: 'col-1', name: '标题', type: 'text', required: true },
          { id: 'col-2', name: '关键内容', type: 'text', required: true },
          { id: 'col-3', name: '数值信息', type: 'number', required: false },
          { id: 'col-4', name: '时间信息', type: 'date', required: false },
          { id: 'col-5', name: '备注', type: 'text', required: false }
        ],
        createdAt: new Date()
      }
    ];

    setTemplates(defaultTemplates);
  }, []);

  // 生成模拟数据
  const generateMockData = (template: TableTemplate, file: FileInfo): Record<string, any> => {
    const data: Record<string, any> = {};

    template.columns.forEach(column => {
      switch (template.id) {
        case 'template-1': // 地块违规建设报告
          switch (column.name) {
            case '地块编号':
              data[column.id] = `DK${Math.floor(Math.random() * 9000) + 1000}`;
              break;
            case '违规类型':
              data[column.id] = ['超高建设', '超面积建设', '未批先建', '改变用途'][Math.floor(Math.random() * 4)];
              break;
            case '违规面积':
              data[column.id] = Math.floor(Math.random() * 500) + 50;
              break;
            case '发现时间':
              data[column.id] = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
              break;
            case '处理状态':
              data[column.id] = ['已整改', '整改中', '待整改'][Math.floor(Math.random() * 3)];
              break;
            case '责任单位':
              data[column.id] = ['建设单位A', '开发商B', '施工方C'][Math.floor(Math.random() * 3)];
              break;
          }
          break;

        case 'template-2': // 土壤污染检测报告
          switch (column.name) {
            case '检测点位':
              data[column.id] = `JC${Math.floor(Math.random() * 100) + 1}`;
              break;
            case '污染物名称':
              data[column.id] = ['重金属铅', '重金属汞', '有机物苯', 'pH值'][Math.floor(Math.random() * 4)];
              break;
            case '检测值':
              data[column.id] = (Math.random() * 100).toFixed(2);
              break;
            case '标准值':
              data[column.id] = (Math.random() * 50).toFixed(2);
              break;
            case '超标倍数':
              data[column.id] = (Math.random() * 3).toFixed(1);
              break;
            case '检测时间':
              data[column.id] = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
              break;
            case '风险等级':
              data[column.id] = ['低风险', '中风险', '高风险'][Math.floor(Math.random() * 3)];
              break;
          }
          break;

        default: // 通用信息提取
          switch (column.type) {
            case 'text':
              data[column.id] = `${file.name}相关内容${Math.floor(Math.random() * 100)}`;
              break;
            case 'number':
              data[column.id] = Math.floor(Math.random() * 1000);
              break;
            case 'date':
              data[column.id] = new Date().toISOString().split('T')[0];
              break;
            case 'boolean':
              data[column.id] = Math.random() > 0.5;
              break;
          }
      }
    });

    return data;
  };

  // 生成成果表格
  const handleGenerateResults = async () => {
    if (!selectedTemplate) {
      toast.error('请选择表格模板');
      return;
    }

    if (files.length === 0) {
      toast.error('没有可处理的文件');
      return;
    }

    setIsGenerating(true);
    toast.info('正在生成成果表格...');

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) {
      toast.error('模板不存在');
      setIsGenerating(false);
      return;
    }

    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newResults: ResultRow[] = files.map(file => ({
      id: `result-${file.id}`,
      fileName: file.name,
      fileId: file.id,
      data: generateMockData(template, file),
      extractedAt: new Date()
    }));

    setResults(newResults);
    setIsGenerating(false);
    toast.success(`成功生成 ${newResults.length} 条记录`);
  };

  // 导出表格
  const handleExport = (format: 'excel' | 'csv') => {
    if (results.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    // 模拟导出
    toast.success(`正在导出为 ${format.toUpperCase()} 格式...`);
    
    // 这里可以实现真实的导出逻辑
    setTimeout(() => {
      toast.success('导出完成');
    }, 1000);
  };

  // 添加新列到模板
  const addColumnToTemplate = () => {
    const newColumn: TableColumn = {
      id: `col-${Date.now()}`,
      name: '新列',
      type: 'text',
      required: false
    };

    setNewTemplate(prev => ({
      ...prev,
      columns: [...(prev.columns || []), newColumn]
    }));
  };

  // 保存新模板
  const saveTemplate = () => {
    if (!newTemplate.name || !newTemplate.columns || newTemplate.columns.length === 0) {
      toast.error('请填写模板名称并添加至少一列');
      return;
    }

    const template: TableTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplate.name!,
      description: newTemplate.description || '',
      columns: newTemplate.columns,
      createdAt: new Date()
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({ name: '', description: '', columns: [] });
    setShowTemplateDialog(false);
    toast.success('模板创建成功');
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">成果表格输出</h1>
          <p className="text-gray-600 mt-2">
            将文档特定内容整理输出为表格形式，支持自定义模板和批量导出
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Table2 className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 配置面板 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>配置设置</span>
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    新建模板
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>创建表格模板</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">模板名称</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.name || ''}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="输入模板名称"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-desc">模板描述</Label>
                      <Textarea
                        id="template-desc"
                        value={newTemplate.description || ''}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="输入模板描述"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>表格列</Label>
                        <Button onClick={addColumnToTemplate} size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          添加列
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {newTemplate.columns?.map((column, index) => (
                          <div key={column.id} className="flex items-center space-x-2 p-2 border rounded">
                            <Input
                              value={column.name}
                              onChange={(e) => {
                                const updatedColumns = [...(newTemplate.columns || [])];
                                updatedColumns[index].name = e.target.value;
                                setNewTemplate(prev => ({ ...prev, columns: updatedColumns }));
                              }}
                              placeholder="列名"
                              className="flex-1"
                            />
                            <Select
                              value={column.type}
                              onValueChange={(value: any) => {
                                const updatedColumns = [...(newTemplate.columns || [])];
                                updatedColumns[index].type = value;
                                setNewTemplate(prev => ({ ...prev, columns: updatedColumns }));
                              }}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">文本</SelectItem>
                                <SelectItem value="number">数字</SelectItem>
                                <SelectItem value="date">日期</SelectItem>
                                <SelectItem value="boolean">布尔</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const updatedColumns = newTemplate.columns?.filter((_, i) => i !== index) || [];
                                setNewTemplate(prev => ({ ...prev, columns: updatedColumns }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                        取消
                      </Button>
                      <Button onClick={saveTemplate}>
                        保存模板
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template-select">选择表格模板</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateData && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedTemplateData.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{selectedTemplateData.description}</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">包含字段：</p>
                  {selectedTemplateData.columns.map(column => (
                    <div key={column.id} className="flex items-center justify-between text-xs">
                      <span>{column.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {column.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <Label>待处理文件</Label>
              <div className="mt-2 space-y-2">
                {files.length > 0 ? (
                  files.slice(0, 5).map(file => (
                    <div key={file.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="truncate">{file.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {file.type}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">暂无文件</p>
                )}
                {files.length > 5 && (
                  <p className="text-xs text-gray-500">还有 {files.length - 5} 个文件...</p>
                )}
              </div>
            </div>

            <Button
              onClick={handleGenerateResults}
              disabled={isGenerating || !selectedTemplate || files.length === 0}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Settings className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Table2 className="mr-2 h-4 w-4" />
                  生成成果表格
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 结果展示 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span>成果表格</span>
                {results.length > 0 && (
                  <Badge variant="secondary">{results.length} 条记录</Badge>
                )}
              </CardTitle>
              {results.length > 0 && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    导出CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('excel')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    导出Excel
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.length > 0 && selectedTemplateData ? (
              <ScrollArea className="h-96">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
                          文件名
                        </th>
                        {selectedTemplateData.columns.map(column => (
                          <th
                            key={column.id}
                            className="border border-gray-300 px-3 py-2 text-left text-sm font-medium"
                          >
                            {column.name}
                            {column.required && <span className="text-red-500 ml-1">*</span>}
                          </th>
                        ))}
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">
                          提取时间
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(result => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {result.fileName}
                          </td>
                          {selectedTemplateData.columns.map(column => (
                            <td
                              key={column.id}
                              className="border border-gray-300 px-3 py-2 text-sm"
                            >
                              {result.data[column.id] || '-'}
                            </td>
                          ))}
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {result.extractedAt.toLocaleString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <Table2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  暂无成果数据
                </p>
                <p className="text-sm text-gray-500">
                  选择模板并生成成果表格后，数据将在此显示
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsOutput;