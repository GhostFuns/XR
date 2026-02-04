import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://viture-world-hud.preview.emergentagent.com';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Translation API
export const translateText = async (
  text: string,
  sourceLanguage: string,
  targetLanguage: string
) => {
  const response = await api.post('/translate', {
    text,
    source_language: sourceLanguage,
    target_language: targetLanguage,
  });
  return response.data;
};

export const getTranslationHistory = async (limit = 50) => {
  const response = await api.get(`/translations?limit=${limit}`);
  return response.data;
};

// Object Recognition API
export const recognizeObjects = async (imageBase64: string, context?: string) => {
  const response = await api.post('/recognize', {
    image_base64: imageBase64,
    context,
  });
  return response.data;
};

export const getRecognitionHistory = async (limit = 20) => {
  const response = await api.get(`/recognitions?limit=${limit}`);
  return response.data;
};

// Contextual Memory API
export const createMemory = async (memory: {
  object_type: string;
  description: string;
  notes?: string;
  tags?: string[];
  image_thumbnail?: string;
}) => {
  const response = await api.post('/memory', memory);
  return response.data;
};

export const getMemories = async (limit = 100, search?: string) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (search) params.append('search', search);
  const response = await api.get(`/memory?${params}`);
  return response.data;
};

export const updateMemory = async (
  memoryId: string,
  updates: { notes?: string; tags?: string[] }
) => {
  const params = new URLSearchParams();
  if (updates.notes) params.append('notes', updates.notes);
  if (updates.tags) params.append('tags', updates.tags.join(','));
  const response = await api.put(`/memory/${memoryId}?${params}`);
  return response.data;
};

export const deleteMemory = async (memoryId: string) => {
  const response = await api.delete(`/memory/${memoryId}`);
  return response.data;
};

// Social Cues API
export const getSocialCues = async (
  situation: string,
  language: string,
  culturalContext?: string
) => {
  const response = await api.post('/social-cues', {
    situation,
    language,
    cultural_context: culturalContext,
  });
  return response.data;
};

// Settings API
export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettings = async (settings: any) => {
  const response = await api.put('/settings', settings);
  return response.data;
};

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};
