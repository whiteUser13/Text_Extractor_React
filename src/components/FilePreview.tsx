import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Badge,
} from '@/components/ui/badge';
import {
  ScrollArea,
} from '@/components/ui/scroll-area';
import {
  Separator,
} from '@/components/ui/separator';
import {
  FileText,
  Table,
  Image,
  BookOpen,
  Clock,
  FileIcon,
  Hash,
  Eye,
} from 'lucide-react';
import type { FileInfo, DocumentParseResult } from '@/types';

interface FilePreviewProps {
  file: FileInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const parseResult = file.parseResult;
  
  if (!parseResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              文件预览 - {file.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">该文件尚未完成解析处理</p>
              <p className="text-sm text-gray-400 mt-2">
                当前状态: {file.status === 'processing' ? '处理中...' : '等待处理'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { content } = parseResult;
  const { structure, tables, images } = content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            文件预览 - {file.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              概览
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              文本内容
            </TabsTrigger>
            <TabsTrigger value="tables" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              表格 ({tables.length})
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              图片 ({images.length})
            </TabsTrigger>
          </TabsList>

          {/* 概览标签页 */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 文档信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileIcon className="h-5 w-5" />
                    文档信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">文件名:</span>
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">文件大小:</span>
                    <span className="text-sm font-medium">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">页数:</span>
                    <span className="text-sm font-medium">{structure.pageCount} 页</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">解析时间:</span>
                    <span className="text-sm font-medium">
                      {parseResult.parsedAt.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">状态:</span>
                    <Badge variant="outline" className="text-green-600">
                      解析完成
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 内容统计 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    内容统计
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">章节数量:</span>
                    <span className="text-sm font-medium">{structure.sections.length} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">表格数量:</span>
                    <span className="text-sm font-medium">{tables.length} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">图片数量:</span>
                    <span className="text-sm font-medium">{images.length} 个</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">文本长度:</span>
                    <span className="text-sm font-medium">
                      {content.text.length.toLocaleString()} 字符
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 文档结构 */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>文档结构</CardTitle>
                <CardDescription>
                  {structure.title && `标题: ${structure.title}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {structure.sections.map((section, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                        style={{ paddingLeft: `${section.level * 16 + 8}px` }}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium">{section.title}</span>
                          {section.page && (
                            <Badge variant="secondary" className="text-xs">
                              第 {section.page} 页
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 文本内容标签页 */}
          <TabsContent value="content" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>提取的文本内容</CardTitle>
                <CardDescription>
                  从文档中提取的完整文本内容
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {content.text || '暂无文本内容'}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 表格标签页 */}
          <TabsContent value="tables" className="mt-4">
            <div className="space-y-4">
              {tables.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Table className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">未检测到表格内容</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                tables.map((table, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>
                          {table.title || `表格 ${index + 1}`}
                        </span>
                        {table.page && (
                          <Badge variant="outline">第 {table.page} 页</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="w-full">
                        <div className="min-w-full">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                {table.headers.map((header, headerIndex) => (
                                  <th
                                    key={headerIndex}
                                    className="border border-gray-300 px-3 py-2 text-left text-sm font-medium"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                  {row.map((cell, cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className="border border-gray-300 px-3 py-2 text-sm"
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* 图片标签页 */}
          <TabsContent value="images" className="mt-4">
            <div className="space-y-4">
              {images.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">未检测到图片内容</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {images.map((image, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>
                            {image.title || `图片 ${index + 1}`}
                          </span>
                          {image.page && (
                            <Badge variant="outline">第 {image.page} 页</Badge>
                          )}
                        </CardTitle>
                        {image.description && (
                          <CardDescription>{image.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center bg-gray-100 rounded-lg p-8">
                          {image.base64 ? (
                            <img
                              src={`data:image/jpeg;base64,${image.base64}`}
                              alt={image.title || `图片 ${index + 1}`}
                              className="max-w-full max-h-48 object-contain"
                            />
                          ) : (
                            <div className="text-center">
                              <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">图片预览不可用</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;