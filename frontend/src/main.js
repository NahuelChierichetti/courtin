import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
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
    options: {
      // CourtIn es una interfaz clara y nada más: la paleta de marca está
      // definida sobre fondo arena y no tiene equivalente oscuro.
      //
      // Por defecto PrimeVue usa `darkModeSelector: 'system'`, o sea que sus
      // componentes se pasan a oscuro solos cuando el SISTEMA operativo está en
      // oscuro, mientras el resto de la app —que es Tailwind y no sabe nada de
      // esto— sigue en claro. El resultado son selects negros sobre tarjetas
      // blancas en la máquina de cualquiera que use macOS en oscuro. En false,
      // los componentes se quedan en claro siempre.
      darkModeSelector: false,
      // PrimeVue inyecta su CSS en runtime, o sea DESPUÉS de nuestra hoja de
      // estilos. Sin capas, ante igual especificidad gana él, y una clase de
      // Tailwind puesta sobre un componente suyo (`text-sm`, `bg-white`) no
      // tiene efecto: es lo que hacía que un Select se viera con letra de 16px
      // por más `text-sm` que se le pusiera.
      //
      // Metiéndolo en una capa `primevue` ubicada ANTES de `components` y
      // `utilities`, las utilidades de Tailwind le ganan siempre y los
      // componentes se pueden ajustar con clases como cualquier otro elemento.
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue, components, utilities',
      },
    },
  },
})
app.use(ToastService)
app.use(ConfirmationService)

app.mount('#app')
