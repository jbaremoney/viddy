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
        { src: 'images', dest: '.' }
  
        // If you have *static*, hand-written scripts (not bundled by Vite), list them here
      ]
    })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: './popup/popup.html'
        // add more .html entry points if needed
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});

