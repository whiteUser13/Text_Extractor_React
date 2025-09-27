import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Upload,
  Search,
  Settings,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dataService } from '@/services/dataService';
import { initializeDemoData, clearDemoData } from '@/services/demoData';
import type { ReportStats, ProcessingStage } from '@/types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ReportStats>({
    totalFiles: 0,
    processedFiles: 0,
    errorFiles: 0,
    processingFiles: 0,
    stageStats: {} as Record<ProcessingStage, number>,
    errorStats: {}
  });

  const [recentFiles, setRecentFiles] = useState<any[]>([]);

  useEffect(() => {
    const updateStats = () => {
      const currentStats = dataService.getReportStats();
      setStats(currentStats);
      
      const files = dataService.getAllFiles().slice(0, 5);
      setRecentFiles(files);
    };

    // 初始化演示数据（如果没有数据的话）
    if (dataService.getAllFiles().length === 0) {
      initializeDemoData();
    }

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStageLabel = (stage: ProcessingStage): string => {
    const labels: Record<ProcessingStage, string> = {
      upload: '上传',
      convert: '转换',
      parse: '解析',
      extract: '提取',
      analyze: '判别',
      completed: '完成'
    };
    return labels[stage] || stage;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      case 'uploading': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      uploading: '上传中',
      uploaded: '已上传',
      processing: '处理中',
      completed: '已完成',
      error: '错误'
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            报告文件智能化审核系统
          </h1>
          <p className="text-lg text-gray-600">
            智能化报告审核平台，支持多格式文件处理、OCR识别、内容分析和自定义规则判别
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总文件数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles}</div>
              <p className="text-xs text-muted-foreground">
                已上传的报告文件
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.processedFiles}</div>
              <p className="text-xs text-muted-foreground">
                处理完成的文件
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">处理中</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.processingFiles}</div>
              <p className="text-xs text-muted-foreground">
                正在处理的文件
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">错误文件</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.errorFiles}</div>
              <p className="text-xs text-muted-foreground">
                处理失败的文件
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">系统概览</TabsTrigger>
            <TabsTrigger value="progress">处理进度</TabsTrigger>
            <TabsTrigger value="errors">错误统计</TabsTrigger>
            <TabsTrigger value="recent">最近文件</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 处理阶段统计 */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    处理阶段分布
                  </CardTitle>
                  <CardDescription>
                    各处理阶段的文件数量分布
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(stats.stageStats).map(([stage, count]) => (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {getStageLabel(stage as ProcessingStage)}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${stats.totalFiles > 0 ? (count / stats.totalFiles) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 快速操作 */}
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    快速操作
                  </CardTitle>
                  <CardDescription>
                    常用功能快速入口
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Link to="/upload">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <Upload className="h-8 w-8 text-blue-600 mb-2" />
                        <span className="text-sm font-medium">上传文件</span>
                      </button>
                    </Link>
                    <Link to="/extraction">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <Search className="h-8 w-8 text-green-600 mb-2" />
                        <span className="text-sm font-medium">内容检索</span>
                      </button>
                    </Link>
                    <Link to="/analysis">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <Settings className="h-8 w-8 text-purple-600 mb-2" />
                        <span className="text-sm font-medium">智能判别</span>
                      </button>
                    </Link>
                    <Link to="/assistant">
                      <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors w-full">
                        <TrendingUp className="h-8 w-8 text-orange-600 mb-2" />
                        <span className="text-sm font-medium">AI助手</span>
                      </button>
                    </Link>
                  </div>
                  
                  {/* 演示数据控制 */}
                  <div className="pt-4 border-t">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          initializeDemoData();
                          window.location.reload();
                        }}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        重置演示数据
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          clearDemoData();
                          window.location.reload();
                        }}
                        className="flex-1"
                      >
                        清空数据
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>处理进度监控</CardTitle>
                <CardDescription>
                  实时监控文件处理进度和状态
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentFiles.length > 0 ? (
                  <div className="space-y-4">
                    {recentFiles.filter(file => file.status === 'processing').map((file) => {
                      const status = dataService.getProcessingStatus(file.id);
                      return (
                        <div key={file.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{file.name}</span>
                            <Badge variant="outline">
                              {status ? getStageLabel(status.stage) : '未知'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <Progress value={status?.progress || 0} className="w-full" />
                            <p className="text-sm text-gray-600">
                              {status?.message || '等待处理...'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无正在处理的文件
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>错误统计分析</CardTitle>
                <CardDescription>
                  处理过程中遇到的错误类型和频次
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(stats.errorStats).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(stats.errorStats).map(([error, count]) => (
                      <div key={error} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <span className="font-medium">{error}</span>
                        </div>
                        <Badge variant="destructive">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无错误记录
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle>最近处理的文件</CardTitle>
                <CardDescription>
                  最近上传和处理的文件列表
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentFiles.length > 0 ? (
                  <div className="space-y-4">
                    {recentFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(file.uploadTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-3 h-3 rounded-full ${getStatusColor(file.status)}`}
                          />
                          <span className="text-sm font-medium">
                            {getStatusLabel(file.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无文件记录
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

export default Dashboard;