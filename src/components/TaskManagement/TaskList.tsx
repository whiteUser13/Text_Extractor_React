import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Trash2, Eye, Calendar, FileText } from 'lucide-react';
import type { Task } from '@/types';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TaskListProps {
  onTasksChange?: () => void;
}

const TaskList: React.FC<TaskListProps> = ({ onTasksChange }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    const allTasks = dataService.getAllTasks();
    setTasks(allTasks);
  };

  const handleToggleEnabled = (taskId: string, enabled: boolean) => {
    dataService.updateTask(taskId, { enabled });
    loadTasks();
    if (onTasksChange) {
      onTasksChange();
    }
    toast({
      title: '成功',
      description: `任务已${enabled ? '启用' : '禁用'}`
    });
  };

  const handleDeleteTask = (taskId: string) => {
    dataService.deleteTask(taskId);
    loadTasks();
    if (onTasksChange) {
      onTasksChange();
    }
    toast({
      title: '成功',
      description: '任务已删除'
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      compliance: '合规性',
      classification: '等级分类',
      interpretation: '含义解释'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>任务管理</CardTitle>
          <CardDescription>管理所有审核任务，包括启用、禁用和删除操作</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">暂无任务</p>
              <p className="text-sm">点击"新建任务"按钮创建第一个审核任务</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>规则数量</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {task.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          提取: {task.extractionRules.length}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          判别: {task.judgmentRules.length}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(task.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.enabled}
                          onCheckedChange={(checked) => handleToggleEnabled(task.id, checked)}
                        />
                        <span className="text-sm">
                          {task.enabled ? '已启用' : '已禁用'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除任务 "{task.name}" 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTask(task.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 任务详情对话框 */}
      {selectedTask && (
        <AlertDialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl">{selectedTask.name}</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedTask.description || '暂无描述'}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-6 py-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">创建时间:</span>
                  <span className="font-medium">{formatDate(selectedTask.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">已处理文件:</span>
                  <span className="font-medium">{selectedTask.fileCount || 0} 个</span>
                </div>
              </div>

              {/* 提取规则 */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge>提取规则</Badge>
                  <span className="text-sm text-gray-600">
                    共 {selectedTask.extractionRules.length} 条
                  </span>
                </h4>
                <div className="space-y-3">
                  {selectedTask.extractionRules.map((rule, index) => (
                    <Card key={rule.id} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{index + 1}. {rule.name}</CardTitle>
                        {rule.description && (
                          <CardDescription className="text-xs">
                            {rule.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {rule.keywords.length > 0 && (
                          <div>
                            <span className="text-gray-600">关键词: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rule.keywords.map((keyword, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {rule.sections && rule.sections.length > 0 && (
                          <div>
                            <span className="text-gray-600">目标章节: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rule.sections.map((section, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(rule.pageRange?.start || rule.pageRange?.end) && (
                          <div>
                            <span className="text-gray-600">页码范围: </span>
                            <span>
                              {rule.pageRange.start || '开始'} - {rule.pageRange.end || '结束'}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 判别规则 */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge>判别规则</Badge>
                  <span className="text-sm text-gray-600">
                    共 {selectedTask.judgmentRules.length} 条
                  </span>
                </h4>
                <div className="space-y-3">
                  {selectedTask.judgmentRules.map((rule, index) => (
                    <Card key={rule.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-sm">{index + 1}. {rule.name}</CardTitle>
                            {rule.description && (
                              <CardDescription className="text-xs">
                                {rule.description}
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant="outline">{getTypeLabel(rule.type)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {rule.conditions.length > 0 && (
                          <div>
                            <span className="text-gray-600">判别条件:</span>
                            <div className="mt-1 space-y-1">
                              {rule.conditions.map((condition, i) => (
                                <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                                  {condition.field} {condition.operator} {condition.value}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {rule.actions.length > 0 && (
                          <div>
                            <span className="text-gray-600">判别动作:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rule.actions.map((action, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {action.type}: {action.value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>关闭</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default TaskList;
