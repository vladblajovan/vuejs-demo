import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'

async function startMockApi() {
  if (import.meta.env.VITE_API_MODE === 'real') return

  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

async function bootstrap() {
  await startMockApi()
  createApp(App).mount('#app')
}

void bootstrap()
