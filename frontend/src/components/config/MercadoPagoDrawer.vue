<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import clubService from '@/services/clubService'
import { dayjs, formatCurrency } from '@/utils/datetime'

const props = defineProps({
  visible: Boolean,
  clubId: String,
  // Subdocumento `pagos` del club, tal como lo devuelve /clubs/:id/config.
  pagos: { type: Object, default: () => ({}) },
  moneda: { type: String, default: 'ARS' },
})
const emit = defineEmits(['close', 'updated'])

const toast = useToast()

const form = ref({
  modalidad: 'total',
  senaTipo: 'porcentaje',
  senaValor: 50,
  permitePagoEnComplejo: true,
})
const saving = ref(false)
const connecting = ref(false)
const disconnecting = ref(false)
const confirmDisconnect = ref(false)

const mp = computed(() => props.pagos?.mp || {})
const conectado = computed(() => mp.value.conectado === true)

const conectadoDesde = computed(() =>
  mp.value.conectadoEn ? dayjs(mp.value.conectadoEn).format('D [de] MMMM [de] YYYY') : null,
)

// Turno de ejemplo para que el complejo vea cuánto se le cobra al jugador antes
// de guardar. Sin esto, "50% de seña" es un número abstracto.
const TURNO_EJEMPLO = 15000
const senaEjemplo = computed(() => {
  if (form.value.modalidad === 'total') return TURNO_EJEMPLO
  const valor = Number(form.value.senaValor) || 0
  const monto = form.value.senaTipo === 'porcentaje' ? (TURNO_EJEMPLO * valor) / 100 : valor
  return Math.min(Math.round(monto), TURNO_EJEMPLO)
})
const restoEjemplo = computed(() => TURNO_EJEMPLO - senaEjemplo.value)

const senaInvalida = computed(() => {
  if (form.value.modalidad !== 'sena') return false
  const valor = Number(form.value.senaValor)
  if (!Number.isFinite(valor) || valor <= 0) return true
  return form.value.senaTipo === 'porcentaje' && valor > 100
})

// Al abrir se rehidrata desde el club: si el complejo cerró el drawer sin
// guardar, no queremos que la próxima vez vea sus cambios descartados como si
// estuvieran vigentes.
watch(
  () => [props.visible, props.pagos],
  ([v]) => {
    if (!v) return
    confirmDisconnect.value = false
    form.value = {
      modalidad: props.pagos?.modalidad || 'total',
      senaTipo: props.pagos?.senaTipo || 'porcentaje',
      senaValor: props.pagos?.senaValor ?? 50,
      permitePagoEnComplejo: props.pagos?.permitePagoEnComplejo !== false,
    }
  },
  { immediate: true, deep: true },
)

const conectar = async () => {
  if (!props.clubId) return
  connecting.value = true
  try {
    const url = await clubService.getMpConnectUrl(props.clubId)
    // Salimos de la app: MercadoPago pide login y permiso, y vuelve al panel.
    window.location.href = url
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo iniciar la conexión con MercadoPago.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
    connecting.value = false
  }
}

const desconectar = async () => {
  if (!props.clubId) return
  disconnecting.value = true
  try {
    const club = await clubService.disconnectMp(props.clubId)
    emit('updated', club)
    confirmDisconnect.value = false
    toast.add({
      severity: 'success',
      summary: 'Cuenta desvinculada',
      detail: 'Las reservas online dejan de cobrarse por MercadoPago.',
      life: 4000,
    })
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desvincular la cuenta.', life: 5000 })
  } finally {
    disconnecting.value = false
  }
}

const guardar = async () => {
  if (!props.clubId || senaInvalida.value) return
  saving.value = true
  try {
    const club = await clubService.updateConfig(props.clubId, { pagos: { ...form.value } })
    emit('updated', club)
    toast.add({ severity: 'success', summary: 'Cobros actualizados', life: 3000 })
    emit('close')
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo guardar la configuración de cobros.'
    toast.add({ severity: 'error', summary: 'Error al guardar', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}

const handleOverlay = (e) => {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlay">
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-black/[0.06] px-6 py-5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#009ee3]/10 text-[#009ee3]">
              <img src="/images/mercado-pago.png" alt="MercadoPago" class="h-6 w-auto" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-ink-500">Cobros con MercadoPago</h2>
              <p class="text-sm text-stone-400">Cobrá las reservas online</p>
            </div>
            <button class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 cursor-pointer" @click="emit('close')">
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <!-- Estado de la cuenta -->
            <div v-if="!conectado" class="rounded-2xl border border-black/[0.08] p-5 text-center">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#009ee3]/10">
                <img src="/images/mercado-pago.png" alt="MercadoPago" class="h-8 w-auto" />
              </div>
              <h3 class="mt-3 text-base font-semibold text-ink-500">Conectá tu cuenta</h3>
              <p class="mt-1 text-sm text-stone-500">
                Te vamos a llevar a MercadoPago para que autorices a CourtIn a cobrar en tu nombre. La plata
                de cada reserva cae directo en tu cuenta.
              </p>
              <button
                class="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#009ee3] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-95 cursor-pointer disabled:opacity-60"
                :disabled="connecting"
                @click="conectar"
              >
                <i v-if="connecting" class="icon-[material-symbols--progress-activity] animate-spin"></i>
                <i v-else class="icon-[material-symbols--link] text-base"></i>
                {{ connecting ? 'Abriendo MercadoPago...' : 'Conectar con MercadoPago' }}
              </button>
            </div>

            <div v-else class="rounded-2xl border border-success-200 bg-success-50 p-5">
              <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100">
                  <i class="icon-[material-symbols--check] text-xl text-success-600"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-ink-500">Cuenta conectada</p>
                  <p v-if="mp.email" class="mt-0.5 truncate text-xs text-stone-500">{{ mp.email }}</p>
                  <p v-if="conectadoDesde" class="mt-0.5 text-xs text-stone-400">Desde el {{ conectadoDesde }}</p>
                </div>
              </div>

              <div v-if="!confirmDisconnect" class="mt-3 text-right">
                <button class="text-xs font-medium text-error-500 hover:underline cursor-pointer" @click="confirmDisconnect = true">
                  Desvincular cuenta
                </button>
              </div>
              <div v-else class="mt-3 rounded-xl border border-error-200 bg-white p-3">
                <p class="text-xs text-stone-600">
                  Si desvinculás, las reservas online dejan de cobrarse y los jugadores sólo van a poder
                  reservar para pagar en el complejo.
                </p>
                <div class="mt-2.5 flex gap-2">
                  <button class="flex-1 rounded-full border border-black/[0.08] px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer" @click="confirmDisconnect = false">
                    Cancelar
                  </button>
                  <button class="flex-1 rounded-full bg-error-500 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 cursor-pointer disabled:opacity-60" :disabled="disconnecting" @click="desconectar">
                    {{ disconnecting ? 'Desvinculando...' : 'Sí, desvincular' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Modalidad de cobro -->
            <div>
              <label class="mb-2 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Qué se cobra al reservar</label>
              <div class="space-y-2">
                <button
                  v-for="m in [
                    { value: 'total', label: 'El turno completo', desc: 'El jugador paga el 100% por adelantado' },
                    { value: 'sena', label: 'Una seña', desc: 'El resto se paga en el complejo' },
                  ]"
                  :key="m.value"
                  class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer"
                  :class="form.modalidad === m.value ? 'border-brand-green-400 bg-brand-green-50' : 'border-black/[0.08] hover:bg-stone-50'"
                  @click="form.modalidad = m.value"
                >
                  <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" :class="form.modalidad === m.value ? 'border-brand-green-500' : 'border-stone-300'">
                    <span v-if="form.modalidad === m.value" class="h-2.5 w-2.5 rounded-full bg-brand-green-500"></span>
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-ink-500">{{ m.label }}</p>
                    <p class="text-xs text-stone-400">{{ m.desc }}</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Valor de la seña -->
            <div v-if="form.modalidad === 'sena'">
              <label class="mb-2 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Cuánto es la seña</label>
              <div class="flex gap-2">
                <div class="flex overflow-hidden rounded-xl border border-black/[0.08]">
                  <button
                    v-for="t in [{ value: 'porcentaje', label: '%' }, { value: 'fijo', label: moneda }]"
                    :key="t.value"
                    class="px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                    :class="form.senaTipo === t.value ? 'bg-brand-purple-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'"
                    @click="form.senaTipo = t.value"
                  >
                    {{ t.label }}
                  </button>
                </div>
                <input
                  v-model.number="form.senaValor"
                  type="number"
                  min="1"
                  :max="form.senaTipo === 'porcentaje' ? 100 : undefined"
                  class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-ink-500 outline-none transition-colors focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
              </div>
              <p v-if="senaInvalida" class="mt-2 text-xs text-error-500">
                {{ form.senaTipo === 'porcentaje' ? 'El porcentaje tiene que estar entre 1 y 100.' : 'Ingresá un monto mayor a 0.' }}
              </p>
            </div>

            <!-- Ejemplo -->
            <div class="rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
              <p class="font-semibold text-stone-600">Ejemplo con un turno de {{ formatCurrency(TURNO_EJEMPLO, moneda) }}</p>
              <p class="mt-1">
                El jugador paga <span class="font-semibold text-ink-500">{{ formatCurrency(senaEjemplo, moneda) }}</span> online
                <template v-if="restoEjemplo > 0">
                  y {{ formatCurrency(restoEjemplo, moneda) }} en el complejo.
                </template>
                <template v-else>. No queda saldo pendiente.</template>
              </p>
            </div>

            <!-- Pago en el complejo -->
            <div class="flex items-start gap-3 rounded-xl border border-black/[0.08] p-4">
              <button
                class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer"
                :class="form.permitePagoEnComplejo ? 'bg-brand-green-500' : 'bg-stone-300'"
                @click="form.permitePagoEnComplejo = !form.permitePagoEnComplejo"
              >
                <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" :class="form.permitePagoEnComplejo ? 'left-[22px]' : 'left-0.5'"></span>
              </button>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-ink-500">Permitir reservar sin pagar</p>
                <p class="mt-0.5 text-xs text-stone-400">
                  El jugador puede elegir pagar al llegar al complejo. Apagalo para exigir el pago online y
                  reducir los turnos que nadie usa.
                </p>
              </div>
            </div>

            <div v-if="!conectado" class="flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs text-warning-700">
              <i class="icon-[material-symbols--info] mt-0.5 shrink-0"></i>
              <span>Sin la cuenta conectada, todas las reservas online entran como "pagar en el complejo".</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-black/[0.06] px-6 py-4">
            <button class="rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer" @click="emit('close')">
              Cancelar
            </button>
            <button
              class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer disabled:opacity-60"
              :disabled="saving || senaInvalida"
              @click="guardar"
            >
              <i v-if="saving" class="icon-[material-symbols--progress-activity] animate-spin"></i>
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

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
