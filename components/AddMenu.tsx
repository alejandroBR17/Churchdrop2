import React from 'react';
import {Upload, AlignLeft, X, ArrowUpRight} from 'lucide-react';
import {useBodyScrollLock} from '../hooks/useBodyScrollLock';
interface AddMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadClick: () => void;
  onTextClick: () => void;
  os: 'ios' | 'android' | 'desktop';
}
export const AddMenu: React.FC<AddMenuProps> = ({isOpen,onClose,onUploadClick,onTextClick}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Adicionar material" className="workspace-dialog w-full max-w-md p-5" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3 mb-5"><div><p className="eyebrow mb-1">Sua biblioteca</p><h2 className="font-bold text-lg">O que vamos adicionar?</h2></div><button onClick={onClose} aria-label="Fechar opções de envio" className="icon-button"><X size={18}/></button></div>
      <button onClick={()=>{onClose();onUploadClick();}} className="w-full p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 flex items-center gap-3 text-left"><span className="p-3 rounded-xl bg-blue-600 text-white"><Upload size={21}/></span><span className="flex-1"><strong className="block text-sm">Enviar arquivos</strong><span className="block mt-1 text-xs text-neutral-500">Fotos, vídeos, áudios e documentos</span></span><ArrowUpRight size={18} className="text-blue-500"/></button>
      <button onClick={()=>{onClose();onTextClick();}} className="mt-3 w-full p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-3 text-left"><span className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500"><AlignLeft size={21}/></span><span className="flex-1"><strong className="block text-sm">Preparar um texto</strong><span className="block mt-1 text-xs text-neutral-500">Formatar para o Holyrics</span></span><ArrowUpRight size={18} className="text-neutral-400"/></button>
    </section>
  </div>;
};
