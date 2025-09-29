import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Archive, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileText,
  Clock,
  Zap,
  CheckSquare,
  Square
} from 'lucide-react';
import type { FileInfo } from '@/types';

interface DecompressionLog {
  id: string;
  fileName: string;
  status: 'success' | 'failed' | 'warning' | 'processing';
  message: string;
  timestamp: Date;
  fileSize: number;
}

const FileDecompression: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<DecompressionLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 模拟从localStorage获取已上传的文件
  useEffect(() => {
    const savedFiles = localStorage.getItem('uploadedFiles');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      setFiles(parsedFiles.filter((file: FileInfo) => file.status === 'completed'));
    }
  }, []);

  // 处理文件选择
  const handleFileSelect = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(file => file.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  // 检查是否全选
  const isAllSelected = files.length > 0 && selectedFiles.size === files.length;
  const isPartialSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  // 模拟解压缩处理
  const simulateDecompression = async (file: FileInfo): Promise<DecompressionLog> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const fileSize = file.size;
        let status: 'success' | 'failed' | 'warning';
        let message: string;

        // 检查文件大小
        if (fileSize < 2048) { // 小于2KB
          status = 'warning';
          message = '文件有问题，请核查 - 文件过小可能损坏或为空文件';
        } else if (file.name.toLowerCase().includes('error') || Math.random() < 0.1) {
          // 模拟10%的失败率
          status = 'failed';
          message = '解压缩失败 - 文件格式不支持或文件已损坏';
        } else {
          status = 'success';
          message = '解压缩成功 - 已提取所有内容文件';
        }

        resolve({
          id: `log-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          status,
          message,
          timestamp: new Date(),
          fileSize
        });
      }, Math.random() * 2000 + 1000); // 1-3秒随机延迟
    });
  };

  // 开始解压缩处理
  const handleStartDecompression = async () => {
    const filesToProcess = files.filter(file => selectedFiles.has(file.id));
    
    if (filesToProcess.length === 0) {
      toast.error('请选择要解压缩的文件');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);

    toast.info(`开始解压缩处理 ${filesToProcess.length} 个文件...`);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      // 添加处理中的日志
      const processingLog: DecompressionLog = {
        id: `processing-${file.id}`,
        fileName: file.name,
        status: 'processing',
        message: '正在解压缩...',
        timestamp: new Date(),
        fileSize: file.size
      };
      
      setLogs(prev => [...prev, processingLog]);

      // 执行解压缩
      const result = await simulateDecompression(file);
      
      // 更新日志
      setLogs(prev => prev.map(log => 
        log.id === processingLog.id ? result : log
      ));

      // 更新进度
      setProgress(((i + 1) / filesToProcess.length) * 100);
    }

    setIsProcessing(false);
    toast.success(`解压缩处理完成，共处理 ${filesToProcess.length} 个文件`);
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">文件解压缩处理</h1>
          <p className="text-gray-600 mt-2">
            对上传的压缩文件进行解压缩处理，支持多种压缩格式
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Archive className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 文件列表和控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>待处理文件</span>
                <Badge variant="secondary">{files.length}</Badge>
              </div>
              {files.length > 0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">
                    已选择 {selectedFiles.size} / {files.length}
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {files.length > 0 ? (
              <>
                {/* 全选控制 */}
                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="select-all"
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <label 
                    htmlFor="select-all" 
                    className="text-sm font-medium cursor-pointer flex items-center space-x-2"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-500" />
                    )}
                    <span>
                      {isAllSelected ? '取消全选' : '全选文件'}
                      {isPartialSelected && !isAllSelected && ` (${selectedFiles.size}/${files.length})`}
                    </span>
                  </label>
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          selectedFiles.has(file.id) 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`file-${file.id}`}
                            checked={selectedFiles.has(file.id)}
                            onCheckedChange={(checked) => 
                              handleFileSelect(file.id, checked as boolean)
                            }
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <Archive className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {file.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                <div className="space-y-3">
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>处理进度</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="w-full" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleSelectAll(true)}
                      variant="outline"
                      size="sm"
                      disabled={isProcessing || isAllSelected}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      全选
                    </Button>
                    <Button
                      onClick={() => handleSelectAll(false)}
                      variant="outline"
                      size="sm"
                      disabled={isProcessing || selectedFiles.size === 0}
                    >
                      <Square className="mr-2 h-4 w-4" />
                      取消全选
                    </Button>
                  </div>

                  <Button
                    onClick={handleStartDecompression}
                    disabled={isProcessing || selectedFiles.size === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        开始解压缩 ({selectedFiles.size})
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Archive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  暂无待处理文件
                </p>
                <p className="text-sm text-gray-500">
                  请先上传文件后再进行解压缩处理
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 解压缩日志 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>解压缩日志</span>
              <Badge variant="secondary">{logs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border ${getStatusColor(log.status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2">
                          {getStatusIcon(log.status)}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{log.fileName}</p>
                            <p className="text-xs mt-1">{log.message}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs opacity-75">
                              <span>大小: {formatFileSize(log.fileSize)}</span>
                              <span>时间: {formatTime(log.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Zap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  暂无处理日志
                </p>
                <p className="text-sm text-gray-500">
                  开始解压缩处理后，日志将在此显示
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 统计信息 */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>处理统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.status === 'success').length}
                </div>
                <div className="text-sm text-green-600">成功</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {logs.filter(log => log.status === 'failed').length}
                </div>
                <div className="text-sm text-red-600">失败</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {logs.filter(log => log.status === 'warning').length}
                </div>
                <div className="text-sm text-yellow-600">警告</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {logs.filter(log => log.status === 'processing').length}
                </div>
                <div className="text-sm text-blue-600">处理中</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileDecompression;