import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    sourcemap: false, // Bloqueia exibição de código-fonte no DevTools de navegadores
    minify: 'esbuild',
    chunkSizeWarningLimit: 1200
  },
  esbuild: {
    // Remove chamadas de console e depurador em modo de produção
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
});
