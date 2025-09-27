import axios from "axios";

const APP_ID = import.meta.env.VITE_APP_ID;

const apiClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    'X-App-Id': APP_ID
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error);
    if (error.response?.data?.status === 999) {
      throw new Error(error.response.data.msg);
    }
    return Promise.reject(error);
  }
);

const api = {
  // OCR文字识别
  ocrRecognition: (imageBase64: string, options?: {
    language_type?: string;
    detect_direction?: boolean;
    probability?: boolean;
  }) => {
    const formData = new FormData();
    formData.append('image', imageBase64);
    if (options?.language_type) formData.append('language_type', options.language_type);
    if (options?.detect_direction !== undefined) formData.append('detect_direction', String(options.detect_direction));
    if (options?.probability !== undefined) formData.append('probability', String(options.probability));
    
    return apiClient.post('/api/miaoda/runtime/apicenter/source/proxy/6KmAKxK9aE29irAwt32QRk', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },

  // 图像内容理解 - 提交请求
  submitImageAnalysis: (imageBase64: string, question: string) => 
    apiClient.post('/api/miaoda/runtime/apicenter/source/proxy/Ej8Ej8Ej8Ej8Ej8Ej8Ej8', {
      image: imageBase64,
      question
    }),

  // 图像内容理解 - 获取结果
  getImageAnalysisResult: (taskId: string) => 
    apiClient.post('/api/miaoda/runtime/apicenter/source/proxy/p1fmNnVdKApGo3cse1Xn4m', {
      task_id: taskId
    }),

  // 通用API方法
  get: (url: string) => apiClient.get(url),
  post: (url: string, data: any) => apiClient.post(url, data),
  put: (url: string, data: any) => apiClient.put(url, data),
  delete: (url: string) => apiClient.delete(url),
};

export default api;