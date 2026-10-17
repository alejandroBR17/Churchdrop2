import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Smartphone, Share2, ExternalLink } from 'lucide-react';

interface QuickShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const QuickShareModal: React.FC<QuickShareModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    showToast('Link copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-univer-blue/10 text-univer-blue flex items-center justify-center font-bold">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Envio Rápido via Celular</h2>
              <p className="text-xs text-neutral-500">Escaneie o QR Code no celular para enviar mídias</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-5">
          
          {/* QR Code Frame */}
          <div className="w-52 h-52 mx-auto p-3 bg-white rounded-2xl shadow-xl border border-neutral-200 flex items-center justify-center">
            <img 
              src={qrCodeUrl} 
              alt="QR Code de Upload" 
              className="w-full h-full object-contain"
            />
          </div>

          <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
            <p className="font-bold flex items-center justify-center gap-1.5">
              <Smartphone size={16} className="text-univer-blue" />
              Abra a câmera do seu smartphone
            </p>
            <p className="text-neutral-400 text-[11px]">
              O celular abrirá diretamente a tela de upload para mandar vídeos e fotos do culto.
            </p>
          </div>

          {/* Copy Link Input */}
          <div className="flex items-center gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <input 
              type="text" 
              readOnly 
              value={currentUrl} 
              className="flex-1 bg-transparent px-2 text-xs font-mono text-neutral-700 dark:text-neutral-300 outline-none truncate"
            />
            <button 
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-univer-blue hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
