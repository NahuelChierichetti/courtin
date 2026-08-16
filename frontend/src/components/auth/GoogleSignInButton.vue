<script setup>
import { onMounted, onBeforeUnmount, ref, useTemplateRef } from 'vue'

// Botón oficial de "Iniciar sesión con Google" (Google Identity Services).
//
// Se usa el botón que dibuja Google y no uno propio porque el flujo depende de
// eso: GIS abre su ventana en respuesta al clic sobre SU botón y nos devuelve un
// ID token firmado. Un botón nuestro sería sólo una fachada.
//
// El script se carga desde el CDN de Google en vez de instalarse por npm porque
// no existe como paquete: Google publica sólo el script hospedado, y es el único
// que sabe hablar con la sesión del navegador.
//
// Lo que este componente devuelve (`credential`) NO es una sesión: es la prueba
// que hay que mandarle al backend para que la verifique. Acá no se decide nada
// sobre quién es la persona.

const props = defineProps({
  // Texto del botón: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'.
  // Ojo con 'signup_with': en español Google lo traduce igual que 'signin_with'
  // ("Acceder con Google"), así que para registrarse conviene 'continue_with'.
  text: { type: String, default: 'continue_with' },
  // Ancho en píxeles. GIS lo exige numérico y lo topa en 400.
  width: { type: Number, default: 360 },
})

const emit = defineEmits(['credential', 'error'])

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SRC = 'https://accounts.google.com/gsi/client'

const contenedor = useTemplateRef('contenedor')
const error = ref('')

// Sin client id configurado el botón no se muestra: es preferible a mostrar uno
// que al tocarlo no hace nada.
const habilitado = Boolean(CLIENT_ID)
defineExpose({ habilitado })

// El script se carga una sola vez aunque haya varios botones en la página (el
// login y el modal de reserva pueden convivir).
let cargando = null
const cargarScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (cargando) return cargando

  cargando = new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${SRC}"]`)
    if (existente) {
      existente.addEventListener('load', resolve)
      existente.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  return cargando
}

const onCredential = (respuesta) => {
  if (respuesta?.credential) emit('credential', respuesta.credential)
}

onMounted(async () => {
  if (!habilitado) return

  try {
    await cargarScript()
  } catch {
    // Con el script de Google caído (o bloqueado por una extensión) el botón no
    // se puede dibujar. No es un error del que haya que avisar en grande: el
    // formulario de email y contraseña sigue ahí al lado.
    error.value = 'No se pudo cargar el acceso con Google.'
    emit('error', error.value)
    return
  }

  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: onCredential,
    // Un solo botón, sin One Tap: el cartelito flotante de Google aparece cuando
    // quiere, tapa contenido y en Safari muchas veces ni sale. El botón explícito
    // es predecible.
    auto_select: false,
    cancel_on_tap_outside: true,
  })

  window.google.accounts.id.renderButton(contenedor.value, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    shape: 'pill',
    text: props.text,
    logo_alignment: 'center',
    width: props.width,
  })
})

onBeforeUnmount(() => {
  // Cierra cualquier ventana de GIS que haya quedado abierta al desmontarse el
  // botón (cerrar el modal de reserva a mitad del login, por ejemplo).
  window.google?.accounts?.id?.cancel()
})
</script>

<template>
  <div v-if="habilitado" class="flex flex-col items-center">
    <!-- GIS dibuja el botón acá adentro; el contenedor sólo lo centra. -->
    <div ref="contenedor" class="flex min-h-[44px] justify-center"></div>
    <p v-if="error" class="mt-2 text-center text-xs text-stone-400">{{ error }}</p>
  </div>
</template>
