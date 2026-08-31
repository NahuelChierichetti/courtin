<script setup>
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { Analytics } from '@vercel/analytics/vue'
</script>

<template>
  <!-- Visitas y navegación de la landing y de las páginas públicas. Es el
       complemento de Sentry: Sentry avisa qué se rompe, esto dice si alguien
       llegó. No usa cookies ni identifica al visitante, así que no necesita
       cartel de consentimiento.

       El componente escucha al router, o sea que también cuenta los cambios de
       ruta del SPA, y agrupa las rutas con parámetro: todas las visitas a
       /club/:slug entran juntas como /club/[slug] en vez de aparecer como un
       complejo distinto por fila.

       Los datos SÓLO se envían desde un deploy de Vercel; en local el script no
       existe y el paquete se limita a loguear el evento por consola. -->
  <Analytics />
  <Toast position="bottom-right" />
  <ConfirmDialog />
  <RouterView />
</template>
