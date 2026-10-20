import React, {useEffect} from 'react';
import {CheckCircle2, AlertCircle, Info, X} from 'lucide-react';
interface ToastProps {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}
export const Toast: React.FC<ToastProps> = ({show,message,type,duration=3500,onClose}) => {
  useEffect(()=>{if(!show)return;const timer=setTimeout(onClose,duration);return()=>clearTimeout(timer);},[show,duration,onClose]);
  if(!show)return null;
  const Icon=type==='success'?CheckCircle2:type==='error'?AlertCircle:Info;
  return <div role={type==='error'?'alert':'status'} className="toast-card fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[150] flex items-start gap-3 p-4 rounded-2xl shadow-xl">
    <Icon size={20} className={`shrink-0 ${type==='success'?'text-emerald-500':type==='error'?'text-rose-500':'text-blue-500'}`}/><p className="flex-1 min-w-0 text-xs leading-relaxed">{message}</p><button onClick={onClose} aria-label="Fechar aviso" className="text-neutral-400 shrink-0"><X size={16}/></button>
  </div>;
};
