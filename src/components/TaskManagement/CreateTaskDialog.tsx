import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Task, ExtractionRule, JudgmentRule } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

interface CreateTaskDialogProps {
  onTaskCreated?: (task: Task) => void;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({ onTaskCreated }) => {
  const [open, setOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const { toast } = useToast();

  // 提取规则状态
  const [extractionRules, setExtractionRules] = useState<ExtractionRule[]>([{
    id: `rule-${Date.now()}`,
    name: '',
    description: '',
    keywords: [],
    sections: [],
    pageRange: {},
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  // 判别规则状态
  const [judgmentRules, setJudgmentRules] = useState<JudgmentRule[]>([{
    id: `judge-${Date.now()}`,
    name: '',
    description: '',
    type: 'compliance',
    conditions: [],
    actions: [],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }]);

  // 添加提取规则
  const addExtractionRule = () => {
    setExtractionRules([...extractionRules, {
      id: `rule-${Date.now()}`,
      name: '',
      description: '',
      keywords: [],
      sections: [],
      pageRange: {},
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  };

  // 删除提取规则
  const removeExtractionRule = (index: number) => {
    setExtractionRules(extractionRules.filter((_, i) => i !== index));
  };

  // 更新提取规则
  const updateExtractionRule = (index: number, field: string, value: any) => {
    const newRules = [...extractionRules];
    newRules[index] = { ...newRules[index], [field]: value, updatedAt: new Date() };
    setExtractionRules(newRules);
  };

  // 添加关键词
  const addKeyword = (ruleIndex: number, keyword: string) => {
    if (!keyword.trim()) return;
    const newRules = [...extractionRules];
    newRules[ruleIndex].keywords = [...newRules[ruleIndex].keywords, keyword.trim()];
    setExtractionRules(newRules);
  };

  // 删除关键词
  const removeKeyword = (ruleIndex: number, keywordIndex: number) => {
    const newRules = [...extractionRules];
    newRules[ruleIndex].keywords = newRules[ruleIndex].keywords.filter((_, i) => i !== keywordIndex);
    setExtractionRules(newRules);
  };

  // 添加章节
  const addSection = (ruleIndex: number, section: string) => {
    if (!section.trim()) return;
    const newRules = [...extractionRules];
    if (!newRules[ruleIndex].sections) {
      newRules[ruleIndex].sections = [];
    }
    newRules[ruleIndex].sections!.push(section.trim());
    setExtractionRules(newRules);
  };

  // 删除章节
  const removeSection = (ruleIndex: number, sectionIndex: number) => {
    const newRules = [...extractionRules];
    newRules[ruleIndex].sections = newRules[ruleIndex].sections?.filter((_, i) => i !== sectionIndex);
    setExtractionRules(newRules);
  };

  // 添加判别规则
  const addJudgmentRule = () => {
    setJudgmentRules([...judgmentRules, {
      id: `judge-${Date.now()}`,
      name: '',
      description: '',
      type: 'compliance',
      conditions: [],
      actions: [],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  };

  // 删除判别规则
  const removeJudgmentRule = (index: number) => {
    setJudgmentRules(judgmentRules.filter((_, i) => i !== index));
  };

  // 更新判别规则
  const updateJudgmentRule = (index: number, field: string, value: any) => {
    const newRules = [...judgmentRules];
    newRules[index] = { ...newRules[index], [field]: value, updatedAt: new Date() };
    setJudgmentRules(newRules);
  };

  // 添加判别条件
  const addCondition = (ruleIndex: number) => {
    const newRules = [...judgmentRules];
    newRules[ruleIndex].conditions.push({
      field: '',
      operator: 'contains',
      value: ''
    });
    setJudgmentRules(newRules);
  };

  // 删除判别条件
  const removeCondition = (ruleIndex: number, conditionIndex: number) => {
    const newRules = [...judgmentRules];
    newRules[ruleIndex].conditions = newRules[ruleIndex].conditions.filter((_, i) => i !== conditionIndex);
    setJudgmentRules(newRules);
  };

  // 更新判别条件
  const updateCondition = (ruleIndex: number, conditionIndex: number, field: string, value: any) => {
    const newRules = [...judgmentRules];
    newRules[ruleIndex].conditions[conditionIndex] = {
      ...newRules[ruleIndex].conditions[conditionIndex],
      [field]: value
    };
    setJudgmentRules(newRules);
  };

  // 添加判别动作
  const addAction = (ruleIndex: number) => {
    const newRules = [...judgmentRules];
    newRules[ruleIndex].actions.push({
      type: 'flag',
      value: ''
    });
    setJudgmentRules(newRules);
  };

  // 删除判别动作
  const removeAction = (ruleIndex: number, actionIndex: number) => {
    const newRules = [...judgmentRules];
    newRules[ruleIndex].actions = newRules[ruleIndex].actions.filter((_, i) => i !== actionIndex);
    setJudgmentRules(newRules);
  };

  // 更新判别动作
  const updateAction = (ruleIndex: number, actionIndex: number, field: string, value: any) => {
    const newRules = [...judgmentRules];
    newRules[ruleIndex].actions[actionIndex] = {
      ...newRules[ruleIndex].actions[actionIndex],
      [field]: value
    };
    setJudgmentRules(newRules);
  };

  // 保存任务
  const handleSaveTask = () => {
    // 验证
    if (!taskName.trim()) {
      toast({
        title: '错误',
        description: '请输入任务名称',
        variant: 'destructive'
      });
      return;
    }

    // 验证提取规则
    const validExtractionRules = extractionRules.filter(rule => rule.name.trim());
    if (validExtractionRules.length === 0) {
      toast({
        title: '错误',
        description: '请至少添加一条有效的提取规则',
        variant: 'destructive'
      });
      return;
    }

    // 验证判别规则
    const validJudgmentRules = judgmentRules.filter(rule => rule.name.trim());
    if (validJudgmentRules.length === 0) {
      toast({
        title: '错误',
        description: '请至少添加一条有效的判别规则',
        variant: 'destructive'
      });
      return;
    }

    // 创建任务
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: taskName.trim(),
      description: taskDescription.trim(),
      extractionRules: validExtractionRules,
      judgmentRules: validJudgmentRules,
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      enabled: true,
      fileCount: 0
    };

    // 保存到数据服务
    dataService.addTask(newTask);

    toast({
      title: '成功',
      description: `任务 "${taskName}" 创建成功！`
    });

    // 回调
    if (onTaskCreated) {
      onTaskCreated(newTask);
    }

    // 重置表单
    setTaskName('');
    setTaskDescription('');
    setExtractionRules([{
      id: `rule-${Date.now()}`,
      name: '',
      description: '',
      keywords: [],
      sections: [],
      pageRange: {},
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
    setJudgmentRules([{
      id: `judge-${Date.now()}`,
      name: '',
      description: '',
      type: 'compliance',
      conditions: [],
      actions: [],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          新建任务
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">新建审核任务</DialogTitle>
          <DialogDescription>
            创建新的报告审核任务，配置提取规则和判别规则
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="taskName">任务名称 *</Label>
              <Input
                id="taskName"
                placeholder="例如：地块违规建设审核"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="taskDescription">任务描述</Label>
              <Textarea
                id="taskDescription"
                placeholder="描述此任务的用途和适用场景..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* 提取规则配置 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>提取规则配置</CardTitle>
                  <CardDescription>设置从报告中提取内容的规则</CardDescription>
                </div>
                <Button onClick={addExtractionRule} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  添加规则
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractionRules.map((rule, ruleIndex) => (
                <Card key={rule.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">规则 {ruleIndex + 1}</CardTitle>
                      {extractionRules.length > 1 && (
                        <Button
                          onClick={() => removeExtractionRule(ruleIndex)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>规则名称 *</Label>
                      <Input
                        placeholder="例如：地块基本信息提取"
                        value={rule.name}
                        onChange={(e) => updateExtractionRule(ruleIndex, 'name', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>规则描述</Label>
                      <Input
                        placeholder="描述此规则的作用..."
                        value={rule.description}
                        onChange={(e) => updateExtractionRule(ruleIndex, 'description', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>关键词</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="输入关键词后按回车添加"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addKeyword(ruleIndex, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rule.keywords.map((keyword, keywordIndex) => (
                          <Badge key={keywordIndex} variant="secondary" className="gap-1">
                            {keyword}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeKeyword(ruleIndex, keywordIndex)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>目标章节</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="输入章节名称后按回车添加"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSection(ruleIndex, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rule.sections?.map((section, sectionIndex) => (
                          <Badge key={sectionIndex} variant="secondary" className="gap-1">
                            {section}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeSection(ruleIndex, sectionIndex)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>起始页码</Label>
                        <Input
                          type="number"
                          placeholder="可选"
                          value={rule.pageRange?.start || ''}
                          onChange={(e) => updateExtractionRule(ruleIndex, 'pageRange', {
                            ...rule.pageRange,
                            start: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>结束页码</Label>
                        <Input
                          type="number"
                          placeholder="可选"
                          value={rule.pageRange?.end || ''}
                          onChange={(e) => updateExtractionRule(ruleIndex, 'pageRange', {
                            ...rule.pageRange,
                            end: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* 判别规则配置 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>判别规则配置</CardTitle>
                  <CardDescription>设置对提取内容的判别规则</CardDescription>
                </div>
                <Button onClick={addJudgmentRule} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  添加规则
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {judgmentRules.map((rule, ruleIndex) => (
                <Card key={rule.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">规则 {ruleIndex + 1}</CardTitle>
                      {judgmentRules.length > 1 && (
                        <Button
                          onClick={() => removeJudgmentRule(ruleIndex)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>规则名称 *</Label>
                      <Input
                        placeholder="例如：违规建设判别"
                        value={rule.name}
                        onChange={(e) => updateJudgmentRule(ruleIndex, 'name', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>规则描述</Label>
                      <Input
                        placeholder="描述此规则的作用..."
                        value={rule.description}
                        onChange={(e) => updateJudgmentRule(ruleIndex, 'description', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>判别类型</Label>
                      <Select
                        value={rule.type}
                        onValueChange={(value) => updateJudgmentRule(ruleIndex, 'type', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compliance">合规性判别</SelectItem>
                          <SelectItem value="classification">等级分类判别</SelectItem>
                          <SelectItem value="interpretation">含义解释判别</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 判别条件 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>判别条件</Label>
                        <Button
                          onClick={() => addCondition(ruleIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          添加条件
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {rule.conditions.map((condition, conditionIndex) => (
                          <div key={conditionIndex} className="flex gap-2 items-start p-2 border rounded">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <Input
                                placeholder="字段名"
                                value={condition.field}
                                onChange={(e) => updateCondition(ruleIndex, conditionIndex, 'field', e.target.value)}
                              />
                              <Select
                                value={condition.operator}
                                onValueChange={(value) => updateCondition(ruleIndex, conditionIndex, 'operator', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">包含</SelectItem>
                                  <SelectItem value="equals">等于</SelectItem>
                                  <SelectItem value="greater_than">大于</SelectItem>
                                  <SelectItem value="less_than">小于</SelectItem>
                                  <SelectItem value="regex">正则匹配</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="值"
                                value={condition.value}
                                onChange={(e) => updateCondition(ruleIndex, conditionIndex, 'value', e.target.value)}
                              />
                            </div>
                            <Button
                              onClick={() => removeCondition(ruleIndex, conditionIndex)}
                              size="sm"
                              variant="ghost"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 判别动作 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>判别动作</Label>
                        <Button
                          onClick={() => addAction(ruleIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          添加动作
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {rule.actions.map((action, actionIndex) => (
                          <div key={actionIndex} className="flex gap-2 items-start p-2 border rounded">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Select
                                value={action.type}
                                onValueChange={(value) => updateAction(ruleIndex, actionIndex, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="flag">标记</SelectItem>
                                  <SelectItem value="classify">分类</SelectItem>
                                  <SelectItem value="score">评分</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="值"
                                value={action.value}
                                onChange={(e) => updateAction(ruleIndex, actionIndex, 'value', e.target.value)}
                              />
                            </div>
                            <Button
                              onClick={() => removeAction(ruleIndex, actionIndex)}
                              size="sm"
                              variant="ghost"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTask} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              保存任务
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
