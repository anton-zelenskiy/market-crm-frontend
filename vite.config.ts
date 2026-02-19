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
            const reactDeps = [
              'react',
              'react-dom',
              'react-router',
              'antd',
              '@ant-design',
              'ag-grid-react',
              'ag-grid-community',
            ]
            
            if (reactDeps.some(dep => id.includes(dep))) {
              return 'react-vendor'
            }
            
            return 'vendor'
          }
        },
      },
      external: [],
    },
    chunkSizeWarningLimit: 1400,
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'ag-grid-react', 'ag-grid-community', 'react-router-dom'],
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
