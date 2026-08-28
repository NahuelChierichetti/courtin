<script setup>
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import authService from '@/services/authService'

// Aviso de email sin confirmar. La verificación es blanda: esto no bloquea nada,
// sólo empuja a confirmar. Por eso se puede ocultar — pero vuelve en la próxima
// sesión, porque el estado real vive en el servidor y no en localStorage.
const { user, isEmailVerified, refreshUser } = useAuth()
const toast = useToast()

const oculto = ref(false)
const enviando = ref(false)

const reenviar = async () => {
  enviando.value = true
  try {
    const data = await authService.resendVerification()
    toast.add({ severity: 'success', summary: 'Email enviado', detail: data.message, life: 5000 })
  } catch (error) {
    // Si ya estaba confirmado en otra pestaña, se refresca y el aviso se va solo.
    if (error.response?.status === 400) await refreshUser()
    toast.add({
      severity: 'error',
      summary: 'No se pudo enviar',
      detail: error.response?.data?.message || 'Probá de nuevo en un momento.',
      life: 5000,
    })
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div
    v-if="user && !isEmailVerified && !oculto"
    class="flex flex-wrap items-center gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-3.5"
  >
    <i class="icon-[material-symbols--mark-email-unread-outline] shrink-0 text-xl text-warning-600"></i>

    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-brand-green-900">Confirmá tu email</p>
      <p class="mt-0.5 text-xs leading-relaxed text-stone-600">
        Te mandamos un link a <span class="font-medium">{{ user.email }}</span
        >. Sin confirmarlo no vas a poder recuperar tu contraseña si la olvidás.
      </p>
    </div>

    <button
      :disabled="enviando"
      class="flex h-9 items-center gap-1.5 rounded-full bg-warning-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-warning-700 disabled:opacity-60 cursor-pointer"
      @click="reenviar"
    >
      <i v-if="enviando" class="icon-[material-symbols--progress-activity] animate-spin text-sm"></i>
      {{ enviando ? 'Enviando...' : 'Reenviar link' }}
    </button>

    <button
      class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-warning-100 hover:text-stone-600 cursor-pointer"
      aria-label="Ocultar aviso"
      @click="oculto = true"
    >
      <i class="icon-[material-symbols--close] text-sm"></i>
    </button>
  </div>
</template>
