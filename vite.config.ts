import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (
              id.includes('react-dom') ||
              id.includes('react/') ||
              id.includes('antd') ||
              id.includes('@ant-design')
            ) {
              return 'react-vendor'
            }
            if (id.includes('react-router')) {
              return 'router'
            }
            return 'vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1400,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd'],
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
