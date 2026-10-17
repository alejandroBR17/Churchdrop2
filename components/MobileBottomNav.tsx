import React from 'react';
import { Home, Video, ImageIcon, FileText, Plus, MoreVertical } from 'lucide-react';

interface MobileBottomNavProps {
  activeFilter: string;
  setActiveFilter: (filter: any) => void;
  setShowAddMenu: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  GOLD_TEXT_CLASS: string;
  os: 'ios' | 'android' | 'desktop';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeFilter, setActiveFilter, setShowAddMenu, setSidebarOpen, sidebarOpen, GOLD_TEXT_CLASS, os
}) => {
  const isIOS = os === 'ios';

  return (
    <div className={`md:hidden fixed bottom-0 left-0 w-full z-40 safe-area-bottom flex justify-around items-center px-2 py-2
        ${isIOS 
            ? 'bg-white/85 dark:bg-black/85 backdrop-blur-xl border-t border-neutral-200/50 dark:border-neutral-800/50' 
            : 'bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'}
    `}>
        <button onClick={() => { setActiveFilter('all'); }} className={`flex flex-col items-center gap-1 p-2 rounded-xl w-14 ${activeFilter === 'all' ? 'text-univer-blue' : 'text-neutral-400 dark:text-neutral-500'}`}>
            <Home size={24} strokeWidth={activeFilter === 'all' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Início</span>
        </button>

        <button onClick={() => setActiveFilter('video')} className={`flex flex-col items-center gap-1 p-2 rounded-xl w-14 ${activeFilter === 'video' ? GOLD_TEXT_CLASS : 'text-neutral-400 dark:text-neutral-500'}`}>
            <Video size={24} strokeWidth={activeFilter === 'video' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Vídeos</span>
        </button>

        {/* CENTRAL ADD BUTTON */}
        <div className="relative -top-5">
            <button 
                onClick={() => setShowAddMenu(true)}
                className={`w-14 h-14 flex items-center justify-center text-white shadow-lg transform transition-transform active:scale-95 border-4 border-neutral-100 dark:border-neutral-950
                    ${isIOS ? 'bg-blue-500 rounded-full' : 'bg-blue-600 rounded-[20px]'}
                `}
            >
                <Plus size={32} strokeWidth={2.5} />
            </button>
        </div>

        <button onClick={() => setActiveFilter('image')} className={`flex flex-col items-center gap-1 p-2 rounded-xl w-14 ${activeFilter === 'image' ? 'text-blue-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
            <ImageIcon size={24} strokeWidth={activeFilter === 'image' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Fotos</span>
        </button>

        <button onClick={() => setSidebarOpen(true)} className={`flex flex-col items-center gap-1 p-2 rounded-xl w-14 ${sidebarOpen ? 'text-neutral-800 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
            <MoreVertical size={24} strokeWidth={2} />
            <span className="text-[10px] font-medium">Mais</span>
        </button>
    </div>
  );
};
