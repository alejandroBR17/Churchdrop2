import React from 'react';
import { MediaItem } from './types';
import { getServiceName } from './services/churchService';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

// Mock Data
export const MOCK_MEDIA: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    name: 'Louvor_Abertura.jpg',
    url: 'https://picsum.photos/seed/church1/800/600',
    downloadUrl: 'https://picsum.photos/seed/church1/800/600',
    size: '2.4 MB',
    date: today,
    eventName: getServiceName(today)
  },
  {
    id: '2',
    type: 'video',
    name: 'Pregacao_Trecho.mp4',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    downloadUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnail: 'https://picsum.photos/seed/church2/800/450',
    size: '15.8 MB',
    date: today,
    eventName: getServiceName(today)
  },
  {
    id: '3',
    type: 'image',
    name: 'Foto_Grupo.jpg',
    url: 'https://picsum.photos/seed/church3/800/600',
    downloadUrl: 'https://picsum.photos/seed/church3/800/600',
    size: '3.1 MB',
    date: yesterday,
    eventName: getServiceName(yesterday)
  },
  {
    id: '4',
    type: 'pdf',
    name: 'Avisos_Semana.pdf',
    url: '',
    downloadUrl: '',
    size: '500 KB',
    date: today,
    eventName: getServiceName(today)
  }
];

export const APP_NAME = "ChurchDrop";