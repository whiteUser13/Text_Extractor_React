import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  FileText,
  Filter,
  Settings,
  Eye,
  Copy
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';
import type { ExtractionRule, ExtractionResult, FileInfo } from '@/types';

const ContentExtraction: React.FC = () => {
  const [rules, setRules] = useState<ExtractionRule[]>([]);
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('all');
  const [selectedRule, setSelectedRule] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ExtractionRule | null>(null);
  const { toast } = useToast();

  const form = useForm<Partial<ExtractionRule>>({
    defaultValues: {
      name: '',
      description: '',
      keywords: [],
      sections: [],
      enabled: true
    }
  });

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      setRules(dataService.getAllExtractionRules());
      setFiles(dataService.getAllFiles().filter(f => f.status === 'completed'));
      
      // 加载所有提取结果
      const allResults: ExtractionResult[] = [];
      dataService.getAllFiles().forEach(file => {
        const fileResults = dataService.getExtractionResults(file.id);
        allResults.push(...fileResults);
      });
      setResults(allResults);
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  // 过滤结果
  const filteredResults = results.filter(result => {
    if (selectedFile !== 'all' && result.fileId !== selectedFile) return false;
    if (selectedRule !== 'all' && result.ruleId !== selectedRule) return false;
    if (searchKeyword && !result.content.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
    return true;
  });

  // 保存规则
  const saveRule = (data: Partial<ExtractionRule>) => {
    try {
      const ruleData: ExtractionRule = {
        id: editingRule?.id || `rule-${Date.now()}`,
        name: data.name || '',
        description: data.description || '',
        keywords: typeof data.keywords === 'string' 
          ? (data.keywords as string).split(',').map(k => k.trim()).filter(k => k)
          : data.keywords || [],
        sections: typeof data.sections === 'string'
          ? (data.sections as string).split(',').map(s => s.trim()).filter(s => s)
          : data.sections || [],
        enabled: data.enabled ?? true,
        createdAt: editingRule?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (editingRule) {
        dataService.updateExtractionRule(ruleData.id, ruleData);
        toast({
          title: "规则已更新",
          description: "提取规则更新成功"
        });
      } else {
        dataService.addExtractionRule(ruleData);
        toast({
          title: "规则已创建",
          description: "新的提取规则创建成功"
        });
      }

      setIsRuleDialogOpen(false);
      setEditingRule(null);
      form.reset();
    } catch (error) {
      toast({
        title: "保存失败",
        description: "规则保存时发生错误",
        variant: "destructive"
      });
    }
  };

  // 删除规则
  const deleteRule = (ruleId: string) => {
    dataService.deleteExtractionRule(ruleId);
    toast({
      title: "规则已删除",
      description: "提取规则删除成功"
    });
  };

  // 切换规则状态
  const toggleRule = (ruleId: string, enabled: boolean) => {
    dataService.updateExtractionRule(ruleId, { enabled });
    toast({
      title: enabled ? "规则已启用" : "规则已禁用",
      description: `提取规则${enabled ? '启用' : '禁用'}成功`
    });
  };

  // 导出结果
  const exportResults = () => {
    const csvContent = [
      ['文件名', '规则名称', '提取内容', '置信度', '位置', '提取时间'],
      ...filteredResults.map(result => {
        const file = files.find(f => f.id === result.fileId);
        const rule = rules.find(r => r.id === result.ruleId);
        return [
          file?.name || '未知文件',
          rule?.name || '未知规则',
          result.content.replace(/\n/g, ' '),
          result.confidence.toString(),
          result.location.section || '未知位置',
          new Date(result.extractedAt).toLocaleString()
        ];
      })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extraction_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: "导出成功",
      description: "提取结果已导出为CSV文件"
    });
  };

  // 复制内容
  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "已复制",
      description: "内容已复制到剪贴板"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            内容检索与提取
          </h1>
          <p className="text-lg text-gray-600">
            配置提取规则，自动检索和提取文档中的关键信息
          </p>
        </div>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="results">提取结果</TabsTrigger>
            <TabsTrigger value="rules">规则管理</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-6">
            {/* 过滤器 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  结果筛选
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">文件筛选</label>
                    <Select value={selectedFile} onValueChange={setSelectedFile}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择文件" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有文件</SelectItem>
                        {files.map(file => (
                          <SelectItem key={file.id} value={file.id}>
                            {file.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">规则筛选</label>
                    <Select value={selectedRule} onValueChange={setSelectedRule}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择规则" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有规则</SelectItem>
                        {rules.map(rule => (
                          <SelectItem key={rule.id} value={rule.id}>
                            {rule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">关键词搜索</label>
                    <Input
                      placeholder="搜索内容..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={exportResults} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      导出结果
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 提取结果列表 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    提取结果 ({filteredResults.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredResults.length > 0 ? (
                  <div className="space-y-4">
                    {filteredResults.map((result) => {
                      const file = files.find(f => f.id === result.fileId);
                      const rule = rules.find(r => r.id === result.ruleId);
                      
                      return (
                        <div key={result.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{file?.name || '未知文件'}</Badge>
                                <Badge variant="secondary">{rule?.name || '未知规则'}</Badge>
                                <Badge variant="outline">
                                  置信度: {(result.confidence * 100).toFixed(1)}%
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500 mb-2">
                                位置: {result.location.section || '未知位置'} | 
                                提取时间: {new Date(result.extractedAt).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyContent(result.content)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{result.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      暂无提取结果
                    </p>
                    <p className="text-sm text-gray-500">
                      请先上传文件并配置提取规则
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            {/* 规则管理 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    提取规则管理
                  </span>
                  <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingRule(null);
                        form.reset();
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        新建规则
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRule ? '编辑提取规则' : '新建提取规则'}
                        </DialogTitle>
                        <DialogDescription>
                          配置内容提取规则，系统将根据规则自动提取文档中的相关信息
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(saveRule)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>规则名称</FormLabel>
                                <FormControl>
                                  <Input placeholder="输入规则名称" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>规则描述</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="描述规则的用途和功能" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="keywords"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>关键词</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="输入关键词，用逗号分隔" 
                                    value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  用于匹配文档内容的关键词，多个关键词用逗号分隔
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="sections"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>目标章节（可选）</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="输入章节名称，用逗号分隔" 
                                    value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  限制在特定章节中搜索，留空则搜索整个文档
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="enabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">启用规则</FormLabel>
                                  <FormDescription>
                                    启用后，系统将自动应用此规则进行内容提取
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => setIsRuleDialogOpen(false)}
                            >
                              取消
                            </Button>
                            <Button type="submit">
                              {editingRule ? '更新规则' : '创建规则'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rules.length > 0 ? (
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <div key={rule.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{rule.name}</h3>
                              <Badge variant={rule.enabled ? "default" : "secondary"}>
                                {rule.enabled ? '已启用' : '已禁用'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {rule.keywords.map((keyword, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">
                              创建时间: {new Date(rule.createdAt).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRule(rule);
                                form.reset({
                                  name: rule.name,
                                  description: rule.description,
                                  keywords: rule.keywords,
                                  sections: rule.sections,
                                  enabled: rule.enabled
                                });
                                setIsRuleDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      暂无提取规则
                    </p>
                    <p className="text-sm text-gray-500">
                      请创建提取规则以开始内容提取
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContentExtraction;