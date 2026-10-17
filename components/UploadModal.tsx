import React, { useState, useEffect } from 'react';
import { 
  X, Upload, Image as ImageIcon, Video, FileText, Music, Sparkles, 
  Check, AlertCircle, File, Loader2, Calendar, Tag
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { getServiceName, getAlternativeNames, uploadFileToScript } from '../services/churchService';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast
}) => {
  if (!isOpen) return null;

  const [files, setFiles] = useState<File[]>([]);
  const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventName, setEventName] = useState<string>('');
  const [isCustomEvent, setIsCustomEvent] = useState(false);
  const [compressImages, setCompressImages] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!isCustomEvent) {
      const dateObj = new Date(uploadDate + 'T12:00:00');
      setEventName(getServiceName(dateObj));
    }
  }, [uploadDate, isCustomEvent]);

  const presetEvents = [
    "Prosperidade com Deus",
    "Corrente dos 70",
    "Escola da Fé Inteligente",
    "Terapia do Amor",
    "Sessão do Descarrego",
    "Jejum das Causas Impossíveis",
    "Encontro com Deus",
    "Reunião de Obreiros",
    "EBD / Escola Bíblica",
    "Culto de Jovens (FJU)"
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      const dropped = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...dropped]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartUpload = async () => {
    if (files.length === 0) {
      showToast('Selecione pelo menos um arquivo para enviar!', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      let fileToUpload = files[i];
      setCurrentFileName(fileToUpload.name);

      // Compress images if enabled and file is an image > 1MB
      if (compressImages && fileToUpload.type.startsWith('image/') && fileToUpload.size > 1024 * 1024) {
        try {
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true
          };
          fileToUpload = await imageCompression(fileToUpload, options);
        } catch (err) {
          console.warn('Compressão ignorada:', err);
        }
      }

      try {
        await uploadFileToScript(
          fileToUpload,
          eventName,
          (pct) => {
            const overallPct = Math.floor(((i + (pct / 100)) / files.length) * 100);
            setUploadProgress(overallPct);
          }
        );
        successCount++;
      } catch (err) {
        console.error('Erro no upload:', err);
        failCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      showToast(`${successCount} arquivo(s) enviado(s) com sucesso!`, 'success');
      onSuccess();
      onClose();
      setFiles([]);
    } else {
      showToast('Falha ao enviar arquivo(s). Verifique sua conexão.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-univer-blue/10 text-univer-blue flex items-center justify-center font-bold">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Enviar Nova Mídia</h2>
              <p className="text-xs text-neutral-500">Transfira fotos, vídeos e textos para a técnica</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isUploading}
            className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          
          {/* Date & Event Tag Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar size={13} /> Data do Culto
              </label>
              <input 
                type="date" 
                value={uploadDate} 
                onChange={(e) => setUploadDate(e.target.value)}
                className="w-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-univer-blue outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Tag size={13} /> Nome do Evento
              </label>
              <input 
                type="text" 
                value={eventName} 
                onChange={(e) => {
                  setEventName(e.target.value);
                  setIsCustomEvent(true);
                }}
                placeholder="Ex: Reunião de Obreiros"
                className="w-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 dark:text-white rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-univer-blue outline-none transition-all"
              />
            </div>
          </div>

          {/* Preset Badges */}
          <div>
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-2">
              Atalhos de Cultos:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetEvents.map(preset => (
                <button
                  key={preset}
                  onClick={() => {
                    const dateObj = new Date(uploadDate + 'T12:00:00');
                    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    setEventName(`${preset} - ${dateStr}`);
                    setIsCustomEvent(true);
                  }}
                  className="text-[11px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium px-2.5 py-1 rounded-lg transition-colors border border-neutral-200/60 dark:border-neutral-700/60"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
              isDragOver 
                ? 'border-univer-blue bg-blue-50/50 dark:bg-blue-950/20' 
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50'
            }`}
          >
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-univer-blue flex items-center justify-center mx-auto mb-3">
              <Upload size={24} />
            </div>
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-1">
              Arraste seus arquivos para cá ou <span className="text-univer-blue underline">clique aqui</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Suporta Fotos, Vídeos, Músicas, PDFs e Anotações de Texto
            </p>
          </div>

          {/* Compress images toggle option */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <div>
                <span className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Otimizar Imagens Automaticamente
                </span>
                <span className="block text-[10px] text-neutral-400">
                  Reduz o tamanho de fotos grandes para envio instantâneo
                </span>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={compressImages}
              onChange={(e) => setCompressImages(e.target.checked)}
              className="w-4 h-4 text-univer-blue rounded border-neutral-300 focus:ring-univer-blue cursor-pointer"
            />
          </div>

          {/* Selected Files Queue List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500">
                <span>Arquivos Selecionados ({files.length})</span>
                <button 
                  onClick={() => setFiles([])}
                  className="text-rose-500 hover:underline text-[11px]"
                >
                  Remover Todos
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {files.map((file, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {file.type.startsWith('image/') && <ImageIcon size={15} className="text-blue-500 shrink-0" />}
                      {file.type.startsWith('video/') && <Video size={15} className="text-amber-500 shrink-0" />}
                      {file.type.startsWith('audio/') && <Music size={15} className="text-purple-500 shrink-0" />}
                      {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                        <FileText size={15} className="text-rose-500 shrink-0" />
                      )}
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-neutral-400 hover:text-rose-500 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Enviando {currentFileName}...</span>
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-blue-200 dark:bg-blue-900/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-univer-blue transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-end gap-2">
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleStartUpload}
            disabled={isUploading || files.length === 0}
            className="flex items-center gap-2 bg-univer-blue hover:bg-blue-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Iniciar Envio</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
