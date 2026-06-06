import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import router from './router'
import CourtInPreset from './theme/courtinPreset'
import 'primeicons/primeicons.css'
import './style.css'

const app = createApp(App)

app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: CourtInPreset,
  },
})

app.mount('#app')
