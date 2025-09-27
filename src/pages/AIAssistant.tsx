import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  Send, 
  Image as ImageIcon, 
  FileText, 
  User,
  Loader2,
  Upload,
  X,
  Copy,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendChatStream, type ChatMessage } from '@/utils/chat';
import { convertFileToBase64, isImageFile } from '@/utils/fileUtils';
import { dataService } from '@/services/dataService';
import type { FileInfo } from '@/types';

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  title: string;
  createdAt: Date;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ file: File; base64: string } | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const APP_ID = import.meta.env.VITE_APP_ID;

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载文件列表
  useEffect(() => {
    const loadFiles = () => {
      const completedFiles = dataService.getAllFiles().filter(f => f.status === 'completed');
      setFiles(completedFiles);
    };

    loadFiles();
    const interval = setInterval(loadFiles, 2000);
    return () => clearInterval(interval);
  }, []);

  // 创建新会话
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      messages: [],
      title: '新对话',
      createdAt: new Date()
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setUploadedImage(null);
    setSelectedFileId('');
  };

  // 切换会话
  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
  };

  // 更新会话
  const updateSession = (sessionId: string, messages: ChatMessage[]) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { 
            ...session, 
            messages,
            title: messages.length > 0 ? messages[0].content.toString().slice(0, 20) + '...' : '新对话'
          }
        : session
    ));
  };

  // 处理图片上传
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      toast({
        title: "文件类型错误",
        description: "请上传图片文件（JPG、PNG、BMP）",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "图片大小不能超过10MB",
        variant: "destructive"
      });
      return;
    }

    try {
      const base64 = await convertFileToBase64(file);
      setUploadedImage({ file, base64 });
      toast({
        title: "图片上传成功",
        description: "可以开始分析图片内容"
      });
    } catch (error) {
      toast({
        title: "上传失败",
        description: "图片上传过程中发生错误",
        variant: "destructive"
      });
    }
  };

  // 发送消息
  const sendMessage = async () => {
    if (!inputText.trim() && !uploadedImage && !selectedFileId) return;

    // 如果没有当前会话，创建新会话
    if (!currentSessionId) {
      createNewSession();
    }

    const sessionId = currentSessionId || `session-${Date.now()}`;
    
    // 构建用户消息
    let userMessage: ChatMessage;
    
    if (selectedFileId) {
      // 基于已处理文件的分析
      const file = files.find(f => f.id === selectedFileId);
      const parseResult = dataService.getParseResult(selectedFileId);
      const extractionResults = dataService.getExtractionResults(selectedFileId);
      const judgmentResults = dataService.getJudgmentResults(selectedFileId);
      
      const fileContext = `
文件名：${file?.name}
文档内容：${parseResult?.content.text || '无内容'}
提取结果：${extractionResults.map(r => r.content).join('\n')}
判别结果：${judgmentResults.map(r => `${r.result}: ${r.details}`).join('\n')}
`;

      userMessage = {
        role: 'user',
        content: `${inputText}\n\n基于以下文件信息：\n${fileContext}`,
        id: `msg-${Date.now()}`
      };
    } else if (uploadedImage) {
      // 图片分析
      userMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: inputText || '请分析这张图片'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/${uploadedImage.file.type.split('/')[1]};base64,${uploadedImage.base64}`
            }
          }
        ],
        id: `msg-${Date.now()}`
      };
    } else {
      // 纯文本对话
      userMessage = {
        role: 'user',
        content: inputText,
        id: `msg-${Date.now()}`
      };
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    updateSession(sessionId, newMessages);

    // 清空输入
    setInputText('');
    setUploadedImage(null);
    setSelectedFileId('');
    setIsLoading(true);

    // 创建AI回复消息
    const aiMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      id: `msg-${Date.now()}-ai`
    };

    // 中断之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const endpoint = uploadedImage 
        ? '/api/miaoda/runtime/apicenter/source/proxy/erniemultimodalchat'
        : '/api/miaoda/runtime/apicenter/source/proxy/ernietextgenerationchat';

      await sendChatStream({
        endpoint,
        apiId: APP_ID,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的报告文件分析助手，擅长分析各种报告文档，包括地块违规建设情况报告、土壤与水污染报告等。请提供准确、专业的分析和建议。'
          },
          ...newMessages
        ],
        onUpdate: (content: string) => {
          aiMessage.content = content;
          const updatedMessages = [...newMessages, aiMessage];
          setMessages(updatedMessages);
          updateSession(sessionId, updatedMessages);
        },
        onComplete: () => {
          setIsLoading(false);
          const finalMessages = [...newMessages, aiMessage];
          updateSession(sessionId, finalMessages);
        },
        onError: (error: Error) => {
          setIsLoading(false);
          console.error('AI回复失败:', error);
          toast({
            title: "AI回复失败",
            description: error.message || "请稍后重试",
            variant: "destructive"
          });
        },
        signal: abortControllerRef.current.signal
      });
    } catch (error) {
      setIsLoading(false);
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('发送消息失败:', error);
        toast({
          title: "发送失败",
          description: "消息发送过程中发生错误",
          variant: "destructive"
        });
      }
    }
  };

  // 停止生成
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  // 复制消息
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "已复制",
      description: "消息内容已复制到剪贴板"
    });
  };

  // 导出对话
  const exportChat = () => {
    const chatContent = messages.map(msg => 
      `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`
    ).join('\n\n');

    const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chat_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();

    toast({
      title: "导出成功",
      description: "对话记录已导出为文本文件"
    });
  };

  // 初始化第一个会话
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI智能助手
          </h1>
          <p className="text-lg text-gray-600">
            专业的报告文件分析助手，支持文本对话和图片分析
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* 会话列表 */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  对话记录
                </span>
                <Button size="sm" onClick={createNewSession}>
                  <Bot className="h-4 w-4 mr-2" />
                  新对话
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      currentSessionId === session.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => switchSession(session.id)}
                  >
                    <p className="font-medium text-sm truncate">{session.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 主对话区域 */}
          <Card className="bg-white shadow-lg lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI助手对话
                </span>
                <div className="flex gap-2">
                  {messages.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportChat}>
                      <Download className="h-4 w-4 mr-2" />
                      导出
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-96">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      欢迎使用AI智能助手
                    </p>
                    <p className="text-sm text-gray-500">
                      我可以帮您分析报告文档、回答问题或处理图片
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {message.role === 'user' ? (
                            <User className="h-4 w-4 mt-1" />
                          ) : (
                            <Bot className="h-4 w-4 mt-1" />
                          )}
                          <span className="text-sm font-medium">
                            {message.role === 'user' ? '您' : 'AI助手'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-6 w-6 p-0"
                            onClick={() => copyMessage(message.content.toString())}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="whitespace-pre-wrap text-sm">
                          {typeof message.content === 'string' 
                            ? message.content 
                            : message.content.map((part, index) => 
                                part.type === 'text' ? part.text : '[图片]'
                              ).join(' ')
                          }
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区域 */}
              <div className="space-y-3">
                {/* 文件选择和图片上传 */}
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="text">文本对话</TabsTrigger>
                    <TabsTrigger value="file">文件分析</TabsTrigger>
                    <TabsTrigger value="image">图片分析</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="mt-2">
                    <Alert>
                      <Bot className="h-4 w-4" />
                      <AlertDescription>
                        直接输入问题，AI助手将为您提供专业的回答
                      </AlertDescription>
                    </Alert>
                  </TabsContent>

                  <TabsContent value="file" className="mt-2">
                    <div className="space-y-2">
                      <select
                        className="w-full p-2 border rounded-lg"
                        value={selectedFileId}
                        onChange={(e) => setSelectedFileId(e.target.value)}
                      >
                        <option value="">选择已处理的文件</option>
                        {files.map(file => (
                          <option key={file.id} value={file.id}>
                            {file.name}
                          </option>
                        ))}
                      </select>
                      {selectedFileId && (
                        <Alert>
                          <FileText className="h-4 w-4" />
                          <AlertDescription>
                            已选择文件，AI将基于文件内容回答问题
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="image" className="mt-2">
                    <div className="space-y-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        上传图片
                      </Button>
                      {uploadedImage && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-sm flex-1">{uploadedImage.file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploadedImage(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* 输入框和发送按钮 */}
                <div className="flex gap-2">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="输入您的问题..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isLoading}
                  />
                  {isLoading ? (
                    <Button onClick={stopGeneration} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      停止
                    </Button>
                  ) : (
                    <Button onClick={sendMessage} disabled={!inputText.trim() && !uploadedImage && !selectedFileId}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;