/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // Vitest configuration
    globals: true,
    environment: 'node', // Use 'node' for pure utility functions (faster)
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    // No snapshot tests (as per test-plan.md)
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
})
