<script setup>
import { computed, reactive, ref, watch } from 'vue'
import invitationService from '@/services/invitationService'

const props = defineProps({
  visible: { type: Boolean, default: false },
  clubId: { type: String, default: null },
})

const emit = defineEmits(['close', 'invited'])

const ROLES = [
  {
    value: 'employee',
    label: 'Empleado',
    icon: 'icon-[material-symbols--badge-outline]',
    description: 'Carga turnos, cobra y gestiona clientes. No cambia la configuración del complejo.',
  },
  {
    value: 'tenant_admin',
    label: 'Administrador',
    icon: 'icon-[material-symbols--shield-outline]',
    description: 'Acceso total: configuración, canchas, precios, reportes y equipo.',
  },
]

const form = reactive({ email: '', nombre: '', role: 'employee' })
const isSending = ref(false)
const errorMessage = ref('')

// Formulario limpio en cada apertura: si no, reaparece la invitación anterior.
watch(
  () => props.visible,
  (open) => {
    if (open) {
      form.email = ''
      form.nombre = ''
      form.role = 'employee'
      errorMessage.value = ''
    }
  },
)

const canSubmit = computed(() => form.email.trim().length > 3 && !isSending.value)

const handleSubmit = async () => {
  errorMessage.value = ''
  isSending.value = true

  try {
    await invitationService.create({
      clubId: props.clubId,
      email: form.email.trim(),
      role: form.role,
      nombre: form.nombre.trim() || undefined,
    })
    emit('invited', form.email.trim())
    emit('close')
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'No se pudo enviar la invitación.'
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <div class="absolute inset-0 bg-black/30"></div>

        <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-black/[0.06] px-4 py-5 sm:px-6">
            <div>
              <h2 class="text-lg font-semibold text-brand-green-900">Invitar al equipo</h2>
              <p class="mt-0.5 text-sm text-stone-500">Le llega un email para crear su acceso.</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
              @click="emit('close')"
            >
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <form class="space-y-5 px-4 py-5 sm:px-6 sm:py-6" @submit.prevent="handleSubmit">
            <div
              v-if="errorMessage"
              class="flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600"
            >
              <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="invite-email">Email</label>
              <div class="relative">
                <i class="icon-[material-symbols--mail-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="invite-email"
                  v-model="form.email"
                  type="email"
                  placeholder="persona@ejemplo.com"
                  required
                  class="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="invite-nombre">
                Nombre <span class="font-normal text-stone-400">(opcional)</span>
              </label>
              <div class="relative">
                <i class="icon-[material-symbols--person-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="invite-nombre"
                  v-model="form.nombre"
                  type="text"
                  placeholder="Cómo se llama"
                  class="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
              </div>
            </div>

            <div>
              <span class="mb-2 block text-sm font-medium text-brand-green-900">Rol</span>
              <div class="space-y-2">
                <button
                  v-for="r in ROLES"
                  :key="r.value"
                  type="button"
                  class="flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer"
                  :class="
                    form.role === r.value
                      ? 'border-brand-green-400 bg-brand-green-50'
                      : 'border-black/[0.08] bg-white hover:bg-stone-50'
                  "
                  @click="form.role = r.value"
                >
                  <span
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    :class="form.role === r.value ? 'bg-brand-green-500 text-white' : 'bg-stone-100 text-stone-500'"
                  >
                    <i :class="r.icon" class="text-lg"></i>
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-brand-green-900">{{ r.label }}</span>
                    <span class="mt-0.5 block text-xs leading-relaxed text-stone-500">{{ r.description }}</span>
                  </span>
                </button>
              </div>
            </div>

            <div class="flex gap-3 pt-1">
              <button
                type="button"
                class="h-11 flex-1 rounded-full border border-black/[0.08] bg-white text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 cursor-pointer"
                @click="emit('close')"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="!canSubmit"
                class="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-60 cursor-pointer"
              >
                <i v-if="isSending" class="icon-[material-symbols--progress-activity] animate-spin"></i>
                {{ isSending ? 'Enviando...' : 'Enviar invitación' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
