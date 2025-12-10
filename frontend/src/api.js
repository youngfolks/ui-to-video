import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for detection/render
});

// Upload file
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return response.data;
}

// Detect layers from URL
export async function detectFromUrl(url, isMobile = true) {
  const response = await api.post('/detect-url', { url, isMobile });
  return response.data;
}

// Render video
export async function renderVideo(detectionId, animationConfig) {
  const response = await api.post('/render', {
    detectionId,
    animationConfig
  });
  return response.data;
}

// Check render status
export async function getRenderStatus(jobId) {
  const response = await api.get(`/render-status/${jobId}`);
  return response.data;
}

// Get file URL
export function getFileUrl(path) {
  return `${API_BASE_URL.replace('/api', '')}${path}`;
}

export default api;
