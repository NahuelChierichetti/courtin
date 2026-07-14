<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlay">
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-black/[0.06] px-6 py-5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#009ee3]/10 text-[#009ee3]">
              <i class="icon-[material-symbols--account-balance-wallet] text-lg"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-primitive-dark-500">Configurar MercadoPago</h2>
              <p class="text-sm text-neutral-400">Cobrá las reservas online</p>
            </div>
            <button class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer" @click="emit('close')">
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div class="flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs text-warning-700">
              <i class="icon-[material-symbols--info] mt-0.5 shrink-0"></i>
              <span>Maqueta de la integración. La conexión real con MercadoPago se implementa en una fase próxima.</span>
            </div>

            <template v-if="!conectado">
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Entorno</label>
                <div class="flex overflow-hidden rounded-full border border-black/[0.08]">
                  <button
                    v-for="m in modos"
                    :key="m.value"
                    class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                    :class="modo === m.value ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                    @click="modo = m.value"
                  >
                    {{ m.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Public Key</label>
                <input v-model="publicKey" type="text" placeholder="APP_USR-xxxxxxxx-xxxx-xxxx" class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100" />
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Access Token</label>
                <div class="relative">
                  <input v-model="accessToken" :type="showToken ? 'text' : 'password'" placeholder="••••••••••••••••" class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 pr-10 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" @click="showToken = !showToken">
                    <i :class="showToken ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                  </button>
                </div>
                <p class="mt-2.5 text-xs text-neutral-400">
                  Las encontrás en tu cuenta de MercadoPago → Desarrolladores → Credenciales.
                </p>
              </div>

              <div class="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Con la integración activa, los pagos de las reservas online caen directo en tu cuenta de MercadoPago y se registran automáticamente en el Control de caja.
              </div>
            </template>

            <!-- Estado conectado (mock) -->
            <div v-else class="flex flex-col items-center justify-center py-8 text-center">
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
                <i class="icon-[material-symbols--check] text-3xl text-success-500"></i>
              </div>
              <h3 class="mt-4 text-lg font-bold text-primitive-dark-500">Cuenta conectada</h3>
              <p class="mt-1 text-sm text-slate-500">MercadoPago quedó vinculado (demo). Entorno: {{ modo === 'prod' ? 'Producción' : 'Sandbox' }}.</p>
              <button class="mt-5 rounded-full border border-black/[0.08] px-4 py-2 text-sm font-medium text-error-500 transition-colors hover:bg-red-50 cursor-pointer" @click="conectado = false">
                Desvincular
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div v-if="!conectado" class="flex items-center justify-end gap-3 border-t border-black/[0.06] px-6 py-4">
            <button class="rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer" @click="emit('close')">
              Cancelar
            </button>
            <button class="flex items-center gap-2 rounded-full bg-[#009ee3] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95 cursor-pointer" @click="conectado = true">
              <i class="icon-[material-symbols--link] text-base"></i> Conectar cuenta
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])

const modos = [
  { label: 'Sandbox (prueba)', value: 'sandbox' },
  { label: 'Producción', value: 'prod' },
]
const modo = ref('sandbox')
const publicKey = ref('')
const accessToken = ref('')
const showToken = ref(false)
const conectado = ref(false)

watch(
  () => props.visible,
  (v) => {
    if (v) {
      // Reset a estado inicial al abrir (maqueta).
      showToken.value = false
    }
  },
)

const handleOverlay = (e) => {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active { transition: all 0.3s ease; }
.drawer-enter-active > div:first-child,
.drawer-leave-active > div:first-child { transition: opacity 0.3s ease; }
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child { transition: transform 0.3s ease; }
.drawer-enter-from > div:first-child,
.drawer-leave-to > div:first-child { opacity: 0; }
.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child { transform: translateX(100%); }
</style>
