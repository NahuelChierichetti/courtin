import { createApp } from 'vue'
import * as Sentry from '@sentry/vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import App from './App.vue'
import router from './router'
import CourtInPreset from './theme/courtinPreset'
import 'primeicons/primeicons.css'
import './style.css'

const app = createApp(App)

// Monitoreo de errores del navegador. Es el que más sirve en la práctica: el
// dueño de un complejo que abre el panel desde un Android viejo y ve algo roto
// no lo reporta, asume que el sistema anda mal. Acá el error llega solo.
//
// Sin `VITE_SENTRY_DSN` el SDK queda inerte, así que en local no molesta. Ojo
// que Vite hornea las variables en el build: cambiarla en Vercel exige un
// Redeploy manual, guardarla no alcanza (lo mismo que con VITE_API_URL).
Sentry.init({
  app,
  router,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration({ router }), Sentry.replayIntegration()],
  tracesSampleRate: 0.2,
  // Sin esto, las llamadas a la API se ven como pedidos a un dominio ajeno y se
  // pierde la conexión entre el error que ve el panel y el que registró el
  // backend para ese mismo pedido.
  tracePropagationTargets: ['localhost', /\/api/],
  // Grabación de sesión SÓLO cuando hubo un error: el plan gratuito trae 50 por
  // mes y grabar sesiones sanas las quema en dos días sin aportar nada. Cuando
  // un complejo llame por teléfono, se ve en video qué apretó antes de romperse.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  ignoreErrors: [/Java object is gone/, /Error invoking postMessage/],
  denyUrls: [/^iabjs:\/\//],
})

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
