import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: '',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'images', dest: '.' },
        { src: 'content', dest: '.' },
        { src: 'background', dest: '.' }
      ]
    })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: './popup/popup.html'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});