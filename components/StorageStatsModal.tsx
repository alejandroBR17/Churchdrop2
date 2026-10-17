import React, { useState } from 'react';
import { 
  X, HardDrive, Database, RefreshCw, Trash2, ShieldCheck, 
  Activity, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';
import { API_URL } from '../services/churchService';

interface StorageStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCount: number;
  counts: {
    video: number;
    image: number;
    text: number;
    pdf: number;
    audio: number;
  };
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefresh: () => void;
}

export const StorageStatsModal: React.FC<StorageStatsModalProps> = ({
  isOpen,
  onClose,
  totalCount,
  counts,
  showToast,
  onRefresh
}) => {
  if (!isOpen) return null;

  const [pinging, setPinging] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const testConnection = async () => {
    setPinging(true);
    setLatency(null);
    const start = Date.now();
    try {
      await fetch(`${API_URL}?t=${Date.now()}`);
      const duration = Date.now() - start;
      setLatency(duration);
      showToast(`Conexão OK! Latência: ${duration}ms`, 'success');
    } catch (e) {
      showToast('Erro ao conectar ao servidor do Google Drive', 'error');
    } finally {
      setPinging(false);
    }
  };

  const clearCache = () => {
    localStorage.removeItem('churchdrop_files_cache');
    showToast('Cache local limpo! Atualizando arquivos...', 'info');
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
              <HardDrive size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Diagnóstico do Servidor</h2>
              <p className="text-xs text-neutral-500">Status de armazenamento e integridade do banco</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* Status Badge */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
              <div>
                <span className="block text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Google Drive Cloud Integrado
                </span>
                <span className="block text-[10px] text-emerald-700 dark:text-emerald-400">
                  Sincronização em tempo real ativa
                </span>
              </div>
            </div>
            <button 
              onClick={testConnection}
              disabled={pinging}
              className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              {pinging ? 'Testando...' : latency !== null ? `${latency}ms` : 'Testar Ping'}
            </button>
          </div>

          {/* Media Breakdown Cards */}
          <div>
            <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers size={14} /> Distribuição de Mídias ({totalCount} total)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                <span className="block text-[10px] font-bold text-amber-500 uppercase">Vídeos</span>
                <span className="text-lg font-extrabold text-neutral-900 dark:text-white">{counts.video}</span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                <span className="block text-[10px] font-bold text-blue-500 uppercase">Imagens</span>
                <span className="text-lg font-extrabold text-neutral-900 dark:text-white">{counts.image}</span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                <span className="block text-[10px] font-bold text-rose-500 uppercase">PDFs</span>
                <span className="text-lg font-extrabold text-neutral-900 dark:text-white">{counts.pdf}</span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                <span className="block text-[10px] font-bold text-purple-500 uppercase">Áudios</span>
                <span className="text-lg font-extrabold text-neutral-900 dark:text-white">{counts.audio}</span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                <span className="block text-[10px] font-bold text-emerald-500 uppercase">Anotações</span>
                <span className="text-lg font-extrabold text-neutral-900 dark:text-white">{counts.text}</span>
              </div>
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                <span className="block text-[10px] font-bold text-sky-500 uppercase">Sessão</span>
                <span className="text-xs font-bold text-neutral-900 dark:text-white mt-1 block truncate">Navegador</span>
              </div>
            </div>
          </div>

          {/* Clear Cache Action */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                Cache Local Armazenado
              </span>
              <span className="block text-[10px] text-amber-700 dark:text-amber-400">
                Esvazie o cache se notar divergências com o Google Drive
              </span>
            </div>
            <button 
              onClick={clearCache}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Limpar Cache
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
