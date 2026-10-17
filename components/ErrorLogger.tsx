import React, { useState, useEffect } from 'react';
import { X, Copy, AlertCircle, Bug } from 'lucide-react';

interface ErrorLog {
  id: string;
  message: string;
  timestamp: string;
}

export const ErrorLogger: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [show, setShow] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  const safeFormatArg = (arg: any): string => {
    if (arg === null || arg === undefined) return String(arg);
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg instanceof Error) return arg.message || String(arg);
    if (typeof arg === 'object') {
      try {
        if ('tagName' in arg && typeof arg.tagName === 'string') {
          return `<${arg.tagName.toLowerCase()} />`;
        }
        if ('message' in arg && typeof arg.message === 'string') {
          return arg.message;
        }
        return String(arg);
      } catch {
        return '[Object]';
      }
    }
    return String(arg);
  };

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      addLog(event.message || 'Erro desconhecido');
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog(String(event.reason || 'Rejeição de promessa não tratada'));
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Override console.error to capture it safely
    const originalError = console.error;
    console.error = (...args: any[]) => {
      try {
        const message = args.map(safeFormatArg).join(' ');
        // Filter out benign development or iframe specific console errors to prevent bothering the user
        if (
          !message.includes('failed to connect to websocket') &&
          !message.includes('chrome-extension') &&
          !message.includes('React DevTools') &&
          !message.includes('[vite]') &&
          !message.includes('Encountered two children with the same key')
        ) {
          addLog(message);
        }
      } catch (e) {
        // Safe fallback
      }
      originalError.apply(console, args);
    };

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalError;
    };
  }, []);

  const addLog = (message: string) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setLogs(prev => [{ id: uniqueId, message, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
    setHasNew(true);
  };

  if (logs.length === 0) return null;

  return (
    <>
      {/* Subtle trigger button floating in corner */}
      {!show && (
        <button 
          onClick={() => { setShow(true); setHasNew(false); }}
          className={`fixed bottom-20 md:bottom-4 left-4 z-50 p-2.5 bg-neutral-900/95 border rounded-full transition-all duration-300 shadow-xl text-red-500 hover:text-red-400 hover:scale-105 active:scale-95
            ${hasNew ? 'border-red-500 animate-pulse bg-red-950/40' : 'border-neutral-800 opacity-40 hover:opacity-100'}
          `}
          title="Ver logs de erro do sistema"
        >
          <div className="relative">
            <Bug size={16} />
            {hasNew && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
        </button>
      )}

      {/* Detail panel */}
      {show && (
        <div className="fixed bottom-20 md:bottom-4 left-4 z-[100] bg-neutral-950/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl max-w-sm w-[90%] md:w-full border border-neutral-800 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-red-400 font-bold text-xs uppercase flex items-center gap-2">
                <AlertCircle size={14} /> Erros Capturados ({logs.length})
            </h4>
            <div className="flex gap-2">
                <button 
                  onClick={() => { setLogs([]); setShow(false); }} 
                  className="text-[10px] text-neutral-400 hover:text-white px-2 py-0.5 bg-neutral-800 rounded transition-colors"
                >
                  Limpar
                </button>
                <button onClick={() => setShow(false)} className="text-neutral-400 hover:text-white transition-colors"><X size={16} /></button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {logs.map(log => (
              <div key={log.id} className="text-[10px] font-mono border-b border-neutral-900/60 pb-1.5 pt-0.5 flex items-start justify-between gap-3 text-neutral-300">
                  <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[9px] text-neutral-500 font-bold">{log.timestamp}</span>
                      <span className="break-all leading-normal">{log.message}</span>
                  </div>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(log.message);
                    }} 
                    className="text-neutral-500 hover:text-white p-1 hover:bg-neutral-800 rounded transition-colors shrink-0"
                    title="Copiar erro"
                  >
                    <Copy size={12}/>
                  </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
