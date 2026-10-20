export type MediaType = 'image' | 'video' | 'pdf' | 'text' | 'audio';

export interface MediaItem {
  id: string;
  url: string; // URL para Visualização (Thumbnail ou Preview)
  downloadUrl: string; // URL Real para forçar o download
  name: string;
  type: MediaType;
  size: string;
  sizeBytes?: number;
  mimeType?: string;
  preserved?: boolean;
  date: Date;
  eventName: string; // Ex: "Culto de Domingo - 25/10"
  originalFile?: File; // Para upload
  thumbnail?: string;
  textContent?: string; // Cache de conteúdo de texto
}

export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export type ViewMode = 'grid' | 'list';
