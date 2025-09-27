import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Download,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';
import { processingService } from '@/services/processingService';
import { 
  getSupportedFileTypes, 
  formatFileSize, 
  validateFileSize, 
  generateFileId,
  isImageFile,
  isPdfFile,
  isWordFile
} from '@/utils/fileUtils';
import type { FileInfo } from '@/types';

const FileUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // 获取文件图标
  const getFileIcon = (file: File | FileInfo) => {
    const type = file.type;
    
    if (isImageFile({ type } as File)) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (isPdfFile({ type } as File)) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (isWordFile({ type } as File)) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  // 获取文件类型标签
  const getFileTypeLabel = (type: string): string => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'Word';
    if (type.includes('image')) return '图片';
    if (type.includes('zip')) return '压缩包';
    return '其他';
  };

  // 验证文件
  const validateFile = (file: File): string | null => {
    const supportedTypes = getSupportedFileTypes();
    
    if (!supportedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type}`;
    }
    
    if (!validateFileSize(file)) {
      return '文件大小超过10MB限制';
    }
    
    return null;
  };

  // 处理文件选择
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // 验证文件
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // 显示错误信息
    if (errors.length > 0) {
      toast({
        title: "文件验证失败",
        description: errors.join('\n'),
        variant: "destructive"
      });
    }

    // 处理有效文件
    if (validFiles.length > 0) {
      setIsUploading(true);
      
      try {
        // 创建文件信息
        const fileInfos: FileInfo[] = validFiles.map(file => ({
          id: generateFileId(),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadTime: new Date(),
          status: 'uploading',
          progress: 0
        }));

        // 添加到状态
        setUploadedFiles(prev => [...prev, ...fileInfos]);

        // 开始处理文件
        await processingService.processBatch(validFiles);

        toast({
          title: "文件上传成功",
          description: `成功上传 ${validFiles.length} 个文件`,
        });

      } catch (error) {
        console.error('文件上传失败:', error);
        toast({
          title: "上传失败",
          description: "文件上传过程中发生错误",
          variant: "destructive"
        });
      } finally {
        setIsUploading(false);
      }
    }
  }, [toast]);

  // 拖拽处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // 文件输入处理
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  // 删除文件
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    dataService.deleteFile(fileId);
    toast({
      title: "文件已删除",
      description: "文件已从列表中移除"
    });
  };

  // 获取所有文件
  React.useEffect(() => {
    const updateFiles = () => {
      const allFiles = dataService.getAllFiles();
      setUploadedFiles(allFiles);
    };

    updateFiles();
    const interval = setInterval(updateFiles, 1000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            文件上传与管理
          </h1>
          <p className="text-lg text-gray-600">
            支持PDF、Word、图片等多种格式，最大10MB
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">文件上传</TabsTrigger>
            <TabsTrigger value="manage">文件管理</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            {/* 上传区域 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  批量文件上传
                </CardTitle>
                <CardDescription>
                  拖拽文件到此区域或点击选择文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    拖拽文件到此处上传
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    或者点击下方按钮选择文件
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.bmp,.zip"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button 
                      variant="outline" 
                      className="cursor-pointer"
                      disabled={isUploading}
                    >
                      {isUploading ? '上传中...' : '选择文件'}
                    </Button>
                  </label>
                </div>

                {/* 支持的文件类型 */}
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">支持的文件类型：</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">PDF</Badge>
                    <Badge variant="outline">Word (doc/docx)</Badge>
                    <Badge variant="outline">图片 (jpg/png/bmp)</Badge>
                    <Badge variant="outline">压缩包 (zip)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 上传进度 */}
            {isUploading && (
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  正在上传和处理文件，请稍候...
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            {/* 文件列表 */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    文件列表 ({uploadedFiles.length})
                  </span>
                  {uploadedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedFiles([]);
                        dataService.clearAll();
                        toast({
                          title: "已清空",
                          description: "所有文件已清空"
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      清空所有
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-4">
                    {uploadedFiles.map((file) => {
                      const processingStatus = dataService.getProcessingStatus(file.id);
                      
                      return (
                        <div key={file.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {getFileIcon(file)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{file.name}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span>{formatFileSize(file.size)}</span>
                                  <Badge variant="outline">
                                    {getFileTypeLabel(file.type)}
                                  </Badge>
                                  <span>{new Date(file.uploadTime).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <div className="flex items-center gap-2">
                                <div 
                                  className={`w-3 h-3 rounded-full ${getStatusColor(file.status)}`}
                                />
                                <span className="text-sm font-medium">
                                  {getStatusLabel(file.status)}
                                </span>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(file.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* 处理进度 */}
                          {file.status === 'processing' && processingStatus && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span>{processingStatus.message}</span>
                                <span>{processingStatus.progress}%</span>
                              </div>
                              <Progress value={processingStatus.progress} className="w-full" />
                            </div>
                          )}

                          {/* 错误信息 */}
                          {file.status === 'error' && file.errorMessage && (
                            <div className="mt-3">
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  {file.errorMessage}
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}

                          {/* 完成状态 */}
                          {file.status === 'completed' && (
                            <div className="mt-3">
                              <Alert>
                                <CheckCircle className="h-4 w-4" />
                                <AlertDescription>
                                  文件处理完成，可以查看分析结果
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      暂无上传的文件
                    </p>
                    <p className="text-sm text-gray-500">
                      请先上传文件进行处理
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

export default FileUpload;