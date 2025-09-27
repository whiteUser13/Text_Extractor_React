// 文件处理工具函数

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/xxx;base64,前缀，只保留base64编码
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

export const isWordFile = (file: File): boolean => {
  return file.type === 'application/msword' || 
         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
};

export const getSupportedFileTypes = (): string[] => {
  return [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/bmp',
    'application/zip',
    'application/x-zip-compressed'
  ];
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const generateFileId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};