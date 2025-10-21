import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileText, Calendar, User } from 'lucide-react';
import type { Task } from '@/types';
import { dataService } from '@/services/dataService';

interface TaskSelectorProps {
  selectedTaskId?: string;
  onTaskSelect: (task: Task) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ selectedTaskId, onTaskSelect }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    const allTasks = dataService.getEnabledTasks();
    setTasks(allTasks);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (tasks.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">暂无可用任务</p>
            <p className="text-sm">请联系管理员创建审核任务</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">选择审核任务</h3>
        <Badge variant="secondary">{tasks.length} 个可用任务</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task) => {
          const isSelected = selectedTaskId === task.id;
          return (
            <Card
              key={task.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border hover:border-blue-300'
              }`}
              onClick={() => onTaskSelect(task)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">{task.name}</CardTitle>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
                {task.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {task.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{task.createdBy === 'admin' ? '管理员' : '用户'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(task.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {task.extractionRules.length} 条提取规则
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {task.judgmentRules.length} 条判别规则
                  </Badge>
                </div>

                {task.fileCount !== undefined && task.fileCount > 0 && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    已处理 {task.fileCount} 个文件
                  </div>
                )}

                <Button
                  className={`w-full ${
                    isSelected
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskSelect(task);
                  }}
                >
                  {isSelected ? '已选择' : '选择此任务'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TaskSelector;
