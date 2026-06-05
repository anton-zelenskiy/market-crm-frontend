import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Ensure React is properly transformed
      jsxRuntime: 'automatic',
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-ag-grid': ['ag-grid-community', 'ag-grid-react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'ag-grid-react', 'ag-grid-community', 'react-router-dom'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
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
