import { MediaItem, MediaType } from '../types';

// =========================================================================================
// URL DE PRODUÇÃO DO CHURCHDROP
// =========================================================================================
export const API_URL = "https://script.google.com/macros/s/AKfycbxn47Q9vWG73NyFyOy0FejhJEpomaa2G-xPIzpSbL87wxTJT7-C2aVQU4J_dfDcYAOa/exec"; 
const CACHE_KEY = "churchdrop_files_cache";

export const getServiceName = (date: Date = new Date()): string => {
  const day = date.getDay(); // 0 = Domingo, 1 = Segunda...
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  
  let name = "";

  switch (day) {
    case 1: name = "Prosperidade com Deus"; break;
    case 2: name = "Corrente dos 70"; break;
    case 3: name = "Escola da Fé Inteligente"; break;
    case 4: name = "Terapia do Amor"; break;
    case 5: name = "Sessão do Descarrego"; break;
    case 6: name = "Jejum das Causas Impossíveis"; break; 
    case 0: name = "Encontro com Deus"; break; 
    default: name = "Evento Extra";
  }

  return `${name} - ${dateStr}`;
};

export const getAlternativeNames = (date: Date): string[] => {
  const day = date.getDay();
  if (day === 6) return ["Encontro Jovem do Sábado"];
  if (day === 0) return ["Encontro Jovem do Domingo"];
  return [];
}

export const groupItemsByEvent = (items: MediaItem[]) => {
  return items.reduce((groups, item) => {
    const groupName = item.eventName || "Geral";
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
    return groups;
  }, {} as Record<string, MediaItem[]>);
};

// Renomear Arquivo
export const renameFileInScript = async (id: string, newName: string): Promise<any> => {
  const payload = JSON.stringify({ action: 'rename', id: id, newName: newName });
  
  // Atualiza cache local imediatamente (UI Otimista)
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const files = JSON.parse(cached);
      const updatedFiles = files.map((f: any) => {
        if (f.id === id) return { ...f, name: newName };
        return f;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedFiles));
    } catch(e) {}
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: payload
    });
    return await response.json();
  } catch (e) {
    console.error("Erro ao renomear:", e);
    throw e;
  }
};

// Exclusão Real
export const deleteFileFromScript = async (id: string): Promise<any> => {
  const payload = JSON.stringify({ action: 'delete', id: id });
  
  // Atualiza cache local imediatamente para UI otimista
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const files = JSON.parse(cached);
      const newFiles = files.filter((f: any) => f.id !== id);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newFiles));
    } catch(e) {}
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: payload
      // Fetch lida com CORS e Redirects automaticamente
    });
    return await response.json();
  } catch (e) {
    console.error("Erro ao deletar:", e);
    throw e;
  }
};

// Obter Conteúdo de Texto (Proxy via GAS)
export const fetchTextContent = async (id: string): Promise<string> => {
  try {
    const payload = JSON.stringify({ action: 'getText', id: id });
    const response = await fetch(API_URL, {
      method: "POST",
      body: payload
    });
    const data = await response.json();
    if (data.status === 'success' && data.content) {
      return data.content;
    } else {
      throw new Error(data.message || 'Falha ao obter texto');
    }
  } catch (e) {
    console.error("Erro ao buscar texto:", e);
    throw e;
  }
};

// Upload usando FETCH (Estável para GAS) com Simulação Inteligente e Web Worker
export const uploadFileToScript = async (
  file: File, 
  customEventName?: string, 
  onProgress?: (percent: number) => void
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const eventName = customEventName || getServiceName(new Date());

    // --- SIMULAÇÃO INTELIGENTE DE PROGRESSO ---
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedSpeedMBps = 0.5; // 500KB/s (conservador para internet móvel)
    const estimatedDurationSec = Math.max(1, fileSizeMB / estimatedSpeedMBps);
    const intervalMs = (estimatedDurationSec * 1000) / 100; // Intervalo para cada 1%

    let currentProgress = 0;
    let progressInterval: any = null;

    if (onProgress) {
        onProgress(1); // Começa
        progressInterval = setInterval(() => {
            currentProgress += 1;
            if (currentProgress > 85 && currentProgress < 95) {
               if (Math.random() > 0.8) currentProgress += 0; // Pausa as vezes
            }
            if (currentProgress >= 95) {
               currentProgress = 95; // Espera a resposta real do servidor
            }
            onProgress(Math.floor(currentProgress));
        }, intervalMs);
    }

    // Cria um Web Worker inline para processar o base64 e fazer o upload sem travar a UI
    const workerCode = `
      self.onmessage = async function(e) {
        try {
          const { file, eventName, apiUrl } = e.data;
          
          const reader = new FileReader();
          reader.onload = async function() {
            try {
              const resultStr = reader.result || "";
              const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
              
              const payload = JSON.stringify({
                action: 'upload',
                filename: file.name,
                mimeType: file.type,
                bytes: base64,
                eventName: eventName 
              });

              const response = await fetch(apiUrl, {
                method: "POST",
                body: payload
              });
              
              const data = await response.json();
              if (data.status === 'error') {
                self.postMessage({ success: false, error: data.message });
              } else {
                self.postMessage({ success: true, data: data });
              }
            } catch (err) {
              self.postMessage({ success: false, error: err.message || "Erro no fetch" });
            }
          };
          reader.onerror = function() {
            self.postMessage({ success: false, error: "Erro na leitura do arquivo" });
          };
          reader.readAsDataURL(file);
        } catch (err) {
          self.postMessage({ success: false, error: err.message || "Erro no worker" });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      if (progressInterval) clearInterval(progressInterval);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);

      if (e.data.success) {
        if (onProgress) onProgress(100);
        resolve(e.data.data);
      } else {
        reject(new Error(e.data.error || "Falha no envio."));
      }
    };

    worker.onerror = (err) => {
      if (progressInterval) clearInterval(progressInterval);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      reject(new Error("Erro interno no processamento do arquivo."));
    };

    // Inicia o worker passando o arquivo e os dados
    worker.postMessage({ file, eventName, apiUrl: API_URL });
  });
};

export const fetchFilesFromScript = async (): Promise<MediaItem[]> => {
  if (!API_URL) return [];
  
  const cachedData = localStorage.getItem(CACHE_KEY);
  let localItems: MediaItem[] = [];
  
  if (cachedData) {
    try {
      const parsedCache = JSON.parse(cachedData);
      localItems = mapResponseToMediaItems(parsedCache);
    } catch (e) {
      console.error("Cache corrompido");
    }
  }

  try {
    const response = await fetch(`${API_URL}?t=${Date.now()}`); 
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Recebi HTML em vez de JSON.", text);
      throw new Error("Erro de conexão com o banco de dados.");
    }
    
    if (data.status === 'success' && Array.isArray(data.files)) {
       localStorage.setItem(CACHE_KEY, JSON.stringify(data.files));
       return mapResponseToMediaItems(data.files);
    }
    return localItems.length > 0 ? localItems : [];
  } catch (error) {
    console.error("Falha ao buscar lista de arquivos.", error);
    if (localItems.length > 0) return localItems;
    return [];
  }
};

const mapResponseToMediaItems = (rawFiles: any[]): MediaItem[] => {
  return rawFiles.map((f: any) => {
     // Lógica de URL CORRIGIDA
     let previewUrl = "";
     let downloadUrl = f.downloadUrl;

     if (!downloadUrl && f.id) {
        // Link direto de download para fallback
        downloadUrl = `https://drive.google.com/uc?export=download&id=${f.id}`;
     }
          if (f.id) {
        // Tenta usar a URL de thumbnail fornecida pelo Drive, se existir
        if (f.thumbnailLink) {
             previewUrl = f.thumbnailLink;
        } else if (f.mimeType.includes('image')) {
             previewUrl = `https://lh3.googleusercontent.com/d/${f.id}=s1000`;
        } else if (f.mimeType.includes('video')) {
             // Endpoint de thumbnail de vídeo do Drive
             previewUrl = `https://lh3.googleusercontent.com/d/${f.id}=s1000`;
        }
      }

      return {
        id: f.id,
        name: f.name,
        url: previewUrl, 
        downloadUrl: downloadUrl || "",
        type: f.mimeType.includes('video') ? 'video' : f.mimeType.includes('audio') ? 'audio' : f.mimeType.includes('pdf') ? 'pdf' : f.mimeType.includes('text') ? 'text' : 'image',
        size: 'Drive', 
        date: new Date(f.date), 
        eventName: f.folderName || "Geral"
      };
   });
};

export const getCachedFiles = (): MediaItem[] => {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
        try {
            return mapResponseToMediaItems(JSON.parse(cachedData));
        } catch(e) { return []; }
    }
    return [];
}