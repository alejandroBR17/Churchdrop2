import React from 'react';
import { Home, Sparkles, ImageIcon, Upload, MoreVertical } from 'lucide-react';

interface MobileBottomNavProps {
  activeFilter: string;
  setActiveFilter: (filter: any) => void;
  onOpenUpload: () => void;
  onOpenHolyrics: () => void;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  GOLD_TEXT_CLASS: string;
  os: 'ios' | 'android' | 'desktop';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeFilter, setActiveFilter, onOpenUpload, onOpenHolyrics, setSidebarOpen, sidebarOpen, GOLD_TEXT_CLASS, os
}) => {
  return (
    <nav aria-label="Navegação principal" className="mobile-dock md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around">
      <button onClick={()=>setActiveFilter('all')} aria-current={activeFilter==='all' ? 'page' : undefined}><Home size={21}/><span>Biblioteca</span></button>
      <button onClick={onOpenHolyrics} aria-label="Formatador Holyrics"><Sparkles size={21}/><span>Holyrics</span></button>
      <button onClick={onOpenUpload} className="dock-upload" aria-label="Enviar arquivos"><Upload size={23}/><span>Enviar</span></button>
      <button onClick={()=>setActiveFilter('image')} aria-current={activeFilter==='image' ? 'page' : undefined}><ImageIcon size={21}/><span>Fotos</span></button>
      <button onClick={()=>setSidebarOpen(true)} aria-expanded={sidebarOpen}><MoreVertical size={21}/><span>Mais</span></button>
    </nav>
  );
};
