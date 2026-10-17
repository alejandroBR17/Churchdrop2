import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Como seus arquivos estão na raiz e não em src/, o Vite lida bem, 
  // mas garantimos que ele saiba onde procurar.
  root: './',
  build: {
    outDir: 'dist',
    target: 'esnext' // Permite recursos modernos como top-level await
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
});