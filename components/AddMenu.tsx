import React, { useEffect, useState } from 'react';
import { Upload, FileText, X, Image as ImageIcon, Video, File, Sparkles } from 'lucide-react';

interface AddMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadClick: () => void;
  onTextClick: () => void;
  os: 'ios' | 'android' | 'desktop';
}

export const AddMenu: React.FC<AddMenuProps> = ({ isOpen, onClose, onUploadClick, onTextClick, os }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to allow DOM to render before animating
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to finish before removing from DOM
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  const handleUpload = () => {
    onClose();
    setTimeout(onUploadClick, 300); // Wait for modal to close
  };

  const handleText = () => {
    onClose();
    setTimeout(onTextClick, 300);
  };

  // iOS Action Sheet Style
  if (os === 'ios') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <div 
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <div 
          className={`relative w-full px-4 pb-8 transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-2xl overflow-hidden mb-2">
            <div className="p-4 border-b border-neutral-200/50 dark:border-neutral-800/50 text-center">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Adicionar Novo</span>
            </div>
            
            {/* Native-like iOS options for file upload */}
            <button 
              onClick={() => {
                onClose();
                const mainInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (mainInput) {
                    mainInput.accept = 'image/*,video/*';
                    mainInput.removeAttribute('capture');
                    mainInput.click();
                    setTimeout(() => mainInput.accept = 'image/*,video/*,application/pdf', 1000);
                }
              }}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-200/50 dark:border-neutral-800/50"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ImageIcon size={18} />
              </div>
              <span className="block text-base font-medium text-neutral-900 dark:text-white">Fototeca</span>
            </button>

            <button 
              onClick={() => {
                onClose();
                const mainInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (mainInput) {
                    mainInput.accept = 'image/*,video/*';
                    mainInput.capture = 'environment';
                    mainInput.click();
                    setTimeout(() => {
                        mainInput.accept = 'image/*,video/*,application/pdf';
                        mainInput.removeAttribute('capture');
                    }, 1000);
                }
              }}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-200/50 dark:border-neutral-800/50"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Video size={18} />
              </div>
              <span className="block text-base font-medium text-neutral-900 dark:text-white">Tirar Foto ou Gravar Vídeo</span>
            </button>

            <button 
              onClick={() => {
                onClose();
                const mainInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (mainInput) {
                    // By not including image/*, iOS Safari skips the photo library prompt and opens the Files app directly
                    mainInput.accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.zip,.rar,.7z';
                    mainInput.removeAttribute('capture');
                    mainInput.click();
                    setTimeout(() => mainInput.accept = 'image/*,video/*,application/pdf', 1000);
                }
              }}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-200/50 dark:border-neutral-800/50"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <File size={18} />
              </div>
              <span className="block text-base font-medium text-neutral-900 dark:text-white">Escolher Arquivos</span>
            </button>

            <button 
              onClick={handleText}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors border-b border-neutral-200/50 dark:border-neutral-800/50"
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="block text-base font-bold text-neutral-900 dark:text-white">Formatador Holyrics / Projeção</span>
                <span className="block text-xs text-purple-600 dark:text-purple-400 font-medium">Limpar e dividir letras de louvor em slides</span>
              </div>
            </button>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-white dark:bg-neutral-900 rounded-2xl p-4 text-center font-semibold text-blue-600 dark:text-blue-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Android Bottom Sheet Style
  if (os === 'android') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end">
        <div 
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={onClose}
        />
        <div 
          className={`relative w-full bg-white dark:bg-neutral-900 rounded-t-3xl transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="w-full flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full"></div>
          </div>
          <div className="px-6 pb-2 pt-2">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Adicionar ao Univer Mídia</h3>
            <div className="grid grid-cols-2 gap-3 pb-8">
              <button 
                onClick={handleUpload}
                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border border-neutral-100 dark:border-neutral-800"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Upload size={24} />
                </div>
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Enviar Arquivos</span>
              </button>
              
              <button 
                onClick={handleText}
                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors border border-purple-200 dark:border-purple-800/60"
              >
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles size={24} />
                </div>
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 text-center">Formatador Holyrics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Centered Modal Style
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div 
        className={`relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">O que deseja adicionar?</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <button 
            onClick={handleUpload}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <div className="text-left">
              <span className="block text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Enviar Arquivos</span>
              <span className="block text-sm text-neutral-500">Fotos, Vídeos, PDFs ou outros documentos</span>
            </div>
          </button>
          <button 
            onClick={handleText}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 hover:border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Sparkles size={24} />
            </div>
            <div className="text-left">
              <span className="block text-lg font-bold text-purple-900 dark:text-purple-200 group-hover:text-purple-600 transition-colors">Formatador Holyrics / Projeção</span>
              <span className="block text-xs text-neutral-500 dark:text-neutral-400">Formatador de letras limpas e divididas em slides</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
