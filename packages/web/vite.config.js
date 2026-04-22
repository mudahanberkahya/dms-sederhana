import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode and look in current directory + root
  const env = loadEnv(mode, process.cwd(), '');
  
  // Decide target based on environment, default to 3001 if unconfigured
  const targetPort = env.PORT || 3001;
  const targetUrl = env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : `http://localhost:${targetPort}`;

  return {
    plugins: [react()],
    server: {
      port: 5174,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: targetUrl,
          changeOrigin: true,
        }
      }
    },
  }
})
