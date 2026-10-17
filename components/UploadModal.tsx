import React, { useState, useEffect, useRef } from 'react';
import {X, Upload, FileText, Loader2} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { getServiceName, uploadFileToScript } from '../services/churchService';

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
  const [files, setFiles] = useState<File[]>([]);
  const [uploadDate, setUploadDate] = useState(() => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
  const [eventName, setEventName] = useState(getServiceName);
  const [isCustomEvent, setIsCustomEvent] = useState(false);
  const [compressImages, setCompressImages] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [shareByLink, setShareByLink] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const request = useRef<AbortController>();
  const prepared = useRef(new WeakMap<File, File>());
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {document.body.style.overflow = previous;};
  }, [isOpen]);

  useEffect(() => {
    if (!isCustomEvent) {
      const dateObj = new Date(uploadDate + 'T12:00:00');
      setEventName(getServiceName(dateObj));
    }
  }, [uploadDate, isCustomEvent]);
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
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
    if (isUploading) return;
    if (files.length === 0 || !shareByLink) {
      showToast('Selecione pelo menos um arquivo para enviar!', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    const controller = new AbortController(); request.current = controller;
    const batch = [...files];
    const remaining = new Set(batch);

    let successCount = 0;
    for (let i = 0; i < batch.length; i++) {
      if (controller.signal.aborted) break;
      let fileToUpload = prepared.current.get(batch[i]) || batch[i];
      setCurrentFileName(fileToUpload.name);

      // Compress images if enabled and file is an image > 1MB
      if (!prepared.current.has(batch[i]) && compressImages && fileToUpload.type.startsWith('image/') && fileToUpload.size > 1024 * 1024) {
        try {
          const options = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            signal: controller.signal
          };
          const compressed = await imageCompression(fileToUpload, options);
          fileToUpload = new window.File([compressed], batch[i].name, {type: compressed.type, lastModified: batch[i].lastModified});
        } catch (err) {
          if (controller.signal.aborted) break;
        }
      }
      prepared.current.set(batch[i], fileToUpload);

      try {
        await uploadFileToScript(
          fileToUpload,
          eventName,
          (pct) => {
            const overallPct = Math.floor(((i + (pct / 100)) / batch.length) * 100);
            setUploadProgress(overallPct);
          },
          {signal: controller.signal, shareByLink}
        );
        successCount++;
        remaining.delete(batch[i]);
      } catch (err) {
        if (!controller.signal.aborted) setUploadError(err instanceof Error ? err.message : 'Falha no envio.');
        break; // Keep this and later files for retry; do not silently discard partial failures.
      }
    }

    setIsUploading(false);
    setFiles([...remaining]);

    if (successCount > 0) {
      showToast(`${successCount} arquivo(s) enviado(s) com sucesso!`, 'success');
      onSuccess();
      if (remaining.size === 0) {setShareByLink(false); onClose();}
    } else {
      showToast(controller.signal.aborted ? 'Envio pausado. Tente novamente mantendo esta página aberta.' : 'O envio não terminou. Os arquivos continuam na lista.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="upload-title" className="w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xl">
        <header className="flex items-center justify-between gap-3 p-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"><Upload size={20}/></span>
            <div><h2 id="upload-title" className="font-bold text-base">Enviar arquivos</h2><p className="mt-0.5 text-xs text-neutral-500">Escolha o material para a biblioteca.</p></div>
          </div>
          <button type="button" aria-label="Fechar envio" onClick={onClose} disabled={isUploading} className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"><X size={20}/></button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5 space-y-4">
          <label onDragOver={e=>{e.preventDefault(); if(!isUploading)setIsDragOver(true);}} onDragLeave={()=>setIsDragOver(false)} onDrop={handleDrop}
            className={`relative block cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center focus-within:ring-2 focus-within:ring-blue-500 ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/30'}`}>
            <input type="file" multiple disabled={isUploading} onChange={handleFileChange} aria-label="Escolher arquivos" className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"/>
            <Upload size={24} className="mx-auto text-blue-500 mb-2"/>
            <span className="block text-sm font-semibold">Escolher arquivos</span>
            <span className="block mt-1 text-xs text-neutral-500">Fotos, vídeos, áudios ou documentos</span>
          </label>

          {files.length > 0 && <section aria-label="Arquivos selecionados" className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-neutral-500"><span>{files.length} selecionado(s)</span><button type="button" disabled={isUploading} onClick={()=>setFiles([])} className="text-blue-600 dark:text-blue-400 disabled:opacity-40">Limpar lista</button></div>
            <ul className="max-h-36 overflow-y-auto space-y-2">
              {files.map((file,index)=><li key={index} className="flex items-center gap-2 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <FileText size={17} className="shrink-0 text-blue-500"/>
                <span className="min-w-0 flex-1 truncate text-xs font-medium" title={file.name}>{file.name}</span>
                <span className="shrink-0 text-[11px] text-neutral-500">{file.size < 1048576 ? `${Math.ceil(file.size/1024)} KB` : `${(file.size/1048576).toFixed(1)} MB`}</span>
                <button type="button" aria-label={`Remover ${file.name}`} disabled={isUploading} onClick={()=>removeFile(index)} className="p-1 text-neutral-500 disabled:opacity-40"><X size={15}/></button>
              </li>)}
            </ul>
          </section>}

          <details className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <summary className="cursor-pointer p-3 text-xs font-medium text-neutral-600 dark:text-neutral-300">Opções de envio <span className="font-normal text-neutral-400">(opcional)</span></summary>
            <fieldset disabled={isUploading} className="border-t border-neutral-100 dark:border-neutral-800 p-3 space-y-3">
              <label className="block text-xs font-medium">Data
                <input type="date" value={uploadDate} onChange={e=>setUploadDate(e.target.value)} className="mt-1.5 block w-full min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm"/>
              </label>
              <label className="block text-xs font-medium">Evento ou pasta
                <input type="text" maxLength={100} value={eventName} onChange={e=>{setEventName(e.target.value);setIsCustomEvent(true);}} className="mt-1.5 block w-full min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2.5 text-sm"/>
              </label>
              <label className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300"><input type="checkbox" checked={compressImages} onChange={e=>setCompressImages(e.target.checked)} className="mt-0.5"/><span>Reduzir fotos grandes antes de enviar</span></label>
            </fieldset>
          </details>

          <label className="flex items-start gap-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
            <input type="checkbox" checked={shareByLink} disabled={isUploading} onChange={e=>setShareByLink(e.target.checked)} className="mt-0.5 shrink-0"/>
            <span>Estes arquivos podem ser abertos e repassados por quem receber o link.</span>
          </label>

          {isUploading && <div role="status" className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300"><Loader2 size={15} className="animate-spin shrink-0"/><span className="min-w-0 flex-1 truncate">{currentFileName}</span><span>{uploadProgress}%</span></div>
            <div role="progressbar" aria-label="Progresso do envio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} className="h-1.5 rounded-full bg-blue-100 dark:bg-blue-900 overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{width:`${uploadProgress}%`}}/></div>
          </div>}
          {uploadError && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 text-xs leading-relaxed text-rose-700 dark:text-rose-300">{uploadError}</p>}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 p-4 shrink-0">
          <button type="button" onClick={()=>isUploading ? request.current?.abort() : onClose()} className="px-4 py-3 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{isUploading ? 'Pausar' : 'Fechar'}</button>
          <button type="button" onClick={handleStartUpload} disabled={isUploading || !files.length || !shareByLink} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed">
            {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
            {isUploading ? 'Enviando…' : uploadError ? 'Tentar novamente' : 'Enviar arquivos'}
          </button>
        </footer>
      </section>
    </div>
  );
};
