import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-dom') ||
              id.includes('react/') ||
              id.includes('antd') ||
              id.includes('@ant-design') ||
              id.includes('ag-grid-react') ||
              id.includes('ag-grid-community')
            ) {
              return 'react-vendor'
            }
            if (id.includes('react-router')) {
              return 'router'
            }
            return 'vendor'
          }
        },
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'react-vendor') {
            return 'assets/react-vendor-[hash].js'
          }
          return 'assets/[name]-[hash].js'
        },
      },
    },
    chunkSizeWarningLimit: 1400,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'ag-grid-react', 'ag-grid-community'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: 'react',
      'react-dom': 'react-dom',
    },
  },
  server: {
    host: true,
    port: 3001,
    // Allow all hosts for development (useful for ngrok, etc.)
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 3001,
    // Allow all hosts for preview mode
    allowedHosts: true,
  },
})
