<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlayClick">
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-black/[0.06] px-6 py-5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple-50 text-brand-purple-500">
              <i class="icon-[material-symbols--push-pin] text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-brand-green-900">Turnos fijos</h2>
              <p class="truncate text-sm text-stone-400">Se repiten todas las semanas, sin vencimiento</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
              @click="emit('close')"
            >
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-6">
            <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-center">
              <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-400"></i>
              <p class="mt-3 text-sm text-stone-500">Cargando...</p>
            </div>

            <div v-else-if="activos.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
                <i class="icon-[material-symbols--push-pin] text-xl text-stone-400"></i>
              </div>
              <h3 class="mt-4 text-base font-semibold text-brand-green-900">Todavía no hay turnos fijos</h3>
              <p class="!mt-2 max-w-xs text-sm text-stone-500">
                Abrí un turno del calendario y marcá "se repite todas las semanas" para fijarlo.
              </p>
            </div>

            <ul v-else class="space-y-3">
              <li
                v-for="r in activos"
                :key="r._id"
                class="rounded-xl border border-black/[0.06] p-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-brand-green-900">
                      {{ r.customer?.nombre || r.guestName || 'Sin nombre' }}
                    </p>
                    <p class="mt-0.5 text-xs text-stone-500">
                      {{ diaLabel(r) }} · {{ r.local?.horaInicio }} · {{ r.court?.nombre || 'Cancha' }}
                    </p>
                  </div>
                  <span
                    v-if="r.estado === 'pausado'"
                    class="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-600"
                  >Pausado</span>
                  <span
                    v-else
                    class="shrink-0 rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold uppercase text-success-700"
                  >Activo</span>
                </div>

                <div class="mt-2 flex items-center gap-3 text-xs text-stone-400">
                  <span>{{ formatCurrency(r.precioPorTurno, currency) }} por turno</span>
                  <span v-if="r.guestPhone">· {{ r.guestPhone }}</span>
                </div>

                <!-- Fechas que el job no pudo generar. Es el único aviso de que
                     un cliente fijo está por perder su horario, así que va
                     arriba de todo y no escondido en un tooltip. -->
                <div
                  v-if="r.conflictos?.length"
                  class="mt-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2"
                >
                  <p class="flex items-start gap-1.5 text-xs font-medium text-warning-700">
                    <i class="icon-[material-symbols--warning] mt-0.5 text-[10px]"></i>
                    <span>
                      {{ r.conflictos.length }}
                      {{ r.conflictos.length === 1 ? 'fecha trabada' : 'fechas trabadas' }}
                    </span>
                  </p>
                  <ul class="mt-1 space-y-0.5">
                    <li v-for="c in r.conflictos.slice(0, 3)" :key="c.fecha" class="text-xs text-warning-700/80">
                      {{ fechaLabel(c.fecha) }} — {{ MOTIVOS[c.motivo] }}
                    </li>
                  </ul>
                </div>

                <div class="mt-3 flex items-center gap-3 border-t border-black/[0.04] pt-3">
                  <button
                    class="text-xs font-medium text-stone-500 transition-colors hover:text-brand-green-900 cursor-pointer disabled:opacity-50"
                    :disabled="busyId === r._id"
                    @click="emit('toggle-pause', r)"
                  >
                    {{ r.estado === 'pausado' ? 'Reanudar' : 'Pausar' }}
                  </button>

                  <!-- La baja libera hasta 90 días de turnos de un cliente fiel:
                       es la acción más cara del panel y por eso pide confirmar
                       en dos pasos y sólo la ve el dueño. -->
                  <template v-if="isAdmin">
                    <button
                      v-if="confirmandoId !== r._id"
                      class="ml-auto text-xs font-medium text-error-500 transition-colors hover:text-error-600 cursor-pointer"
                      @click="confirmandoId = r._id"
                    >
                      Dar de baja
                    </button>
                  </template>
                </div>

                <div
                  v-if="confirmandoId === r._id"
                  class="mt-3 rounded-lg border border-error-200 bg-error-50 p-3"
                >
                  <p class="text-xs text-stone-600">
                    Se liberan todos los turnos futuros de
                    <strong>{{ r.customer?.nombre || r.guestName }}</strong>. Los turnos ya jugados no se tocan.
                  </p>
                  <div class="mt-2.5 flex gap-2">
                    <button
                      class="flex-1 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                      :disabled="busyId === r._id"
                      @click="confirmandoId = null"
                    >
                      No
                    </button>
                    <button
                      class="flex-1 rounded-full bg-error-500 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 cursor-pointer disabled:opacity-60"
                      :disabled="busyId === r._id"
                      @click="emit('cancel-rule', r)"
                    >
                      {{ busyId === r._id ? 'Dando de baja...' : 'Sí, dar de baja' }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'

const props = defineProps({
  visible: Boolean,
  loading: Boolean,
  // Reglas tal como las devuelve la API, con `local` ya traducido a la zona del club.
  recurring: { type: Array, default: () => [] },
  currency: { type: String, default: 'ARS' },
  timezone: { type: String, default: DEFAULT_TZ },
  // Dar de baja un turno fijo es sólo del dueño del complejo.
  isAdmin: Boolean,
  // Id de la regla sobre la que hay una acción en curso.
  busyId: { type: String, default: '' },
})

const emit = defineEmits(['close', 'cancel-rule', 'toggle-pause'])

const confirmandoId = ref(null)

// Al cerrar el drawer la confirmación vuelve a cero: si quedara abierta, un
// clic distraído al reabrir daría de baja el turno equivocado.
watch(() => props.visible, () => { confirmandoId.value = null })

const MOTIVOS = {
  ocupado: 'el horario está ocupado',
  cerrado: 'el complejo está cerrado',
  fuera_de_horario: 'queda fuera del horario de atención',
}

const DIAS = ['Domingos', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábados']

// Los finalizados no se listan: son historial, no algo que el complejo gestione.
const activos = computed(() => props.recurring.filter((r) => r.estado !== 'finalizado'))

const diaLabel = (r) => DIAS[r.local?.diaSemana ?? 0]

const fechaLabel = (iso) => dayjs.utc(iso).tz(props.timezone).format('DD MMM')

const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}
.drawer-enter-active > div:first-child,
.drawer-leave-active > div:first-child {
  transition: opacity 0.3s ease;
}
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}
.drawer-enter-from > div:first-child,
.drawer-leave-to > div:first-child {
  opacity: 0;
}
.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
