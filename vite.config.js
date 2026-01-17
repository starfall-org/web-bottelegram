import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core (excluding scheduler which is bundled with react-dom)
          if (id.includes('node_modules/react/') && !id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/react-dom')) {
            return 'react-dom-vendor'
          }
          // Radix UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui'
          }
          // Telegram bot library
          if (id.includes('node_modules/grammy')) {
            return 'grammy'
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide'
          }
          // Syntax highlighter - split into separate chunks
          if (id.includes('node_modules/react-syntax-highlighter')) {
            // Split languages from core
            if (id.includes('/languages/')) {
              return 'syntax-languages'
            }
            return 'syntax-highlighter'
          }
          // Zustand state management
          if (id.includes('node_modules/zustand')) {
            return 'zustand'
          }
          // Split large components
          if (id.includes('/src/components/ChatArea')) {
            return 'chat-area'
          }
          if (id.includes('/src/components/MessageList')) {
            return 'message-list'
          }
          if (id.includes('/src/lib/markdown')) {
            return 'markdown'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443,
      protocol: 'wss'
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
