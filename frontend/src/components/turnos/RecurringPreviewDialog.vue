<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="fixed inset-0 z-[60] flex items-center justify-center p-4" @click="handleOverlayClick">
        <div class="absolute inset-0 bg-black/40" />

        <div class="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-start gap-4 border-b border-black/[0.06] px-6 py-5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple-50 text-brand-purple-500">
              <i class="icon-[material-symbols--push-pin] text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-brand-green-900">Turno fijo</h2>
              <p class="truncate text-sm text-stone-400">{{ subtitle }}</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
              @click="emit('close')"
            >
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <div v-if="loading" class="flex flex-col items-center justify-center py-12 text-center">
              <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-400"></i>
              <p class="mt-3 text-sm text-stone-500">Calculando las fechas...</p>
            </div>

            <div
              v-else-if="error"
              class="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-600"
            >
              <i class="icon-[material-symbols--error] mt-0.5 text-xs"></i>
              <span>{{ error }}</span>
            </div>

            <template v-else>
              <!-- Lo que hace el turno fijo, en una frase. Es la promesa que el
                   complejo le está haciendo al cliente, y conviene que la lea. -->
              <div class="rounded-xl border border-brand-purple-100 bg-brand-purple-50/50 px-4 py-3">
                <p class="text-sm font-medium text-brand-green-900">
                  Todos los {{ diaLabel }} a las {{ horaLabel }}, sin fecha de fin.
                </p>
                <p class="mt-1 text-xs text-stone-500">
                  Se generan {{ horizonteDias }} días por adelantado y la ventana avanza sola todos los días. El turno
                  sólo se libera si lo das de baja.
                </p>
              </div>

              <!-- Conflictos: lo más importante de esta pantalla. Si el complejo
                   no los ve acá, se entera cuando el cliente llega y la cancha
                   está ocupada. -->
              <div
                v-if="conflictos > 0"
                class="mt-4 flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2.5 text-sm text-warning-700"
              >
                <i class="icon-[material-symbols--warning] mt-0.5 text-xs"></i>
                <span>
                  {{ conflictos }} {{ conflictos === 1 ? 'fecha no se va a generar' : 'fechas no se van a generar' }}.
                  Podés crearlo igual: el resto de la serie se genera normalmente y las trabadas quedan marcadas
                  para que las resuelvas.
                </span>
              </div>

              <p class="mt-5 mb-2 text-xs font-semibold tracking-wider text-stone-400 uppercase">
                Próximas {{ fechas.length }} fechas
              </p>
              <ul class="divide-y divide-black/[0.04] rounded-xl border border-black/[0.06]">
                <li
                  v-for="f in fechas"
                  :key="f.inicio"
                  class="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <span class="text-sm" :class="f.estado === 'libre' ? 'text-brand-green-900' : 'text-stone-400'">
                    {{ fechaLabel(f.inicio) }}
                  </span>
                  <span
                    class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase leading-tight"
                    :class="ESTADO_FECHA[f.estado].cls"
                  >
                    {{ ESTADO_FECHA[f.estado].label }}
                  </span>
                </li>
              </ul>
            </template>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-black/[0.06] px-6 py-4">
            <button
              class="rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
              @click="emit('close')"
            >
              Cancelar
            </button>
            <button
              class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="loading || saving || !!error"
              @click="emit('confirm')"
            >
              <i v-if="saving" class="icon-[material-symbols--progress-activity] animate-spin text-xs"></i>
              {{ saving ? 'Creando...' : 'Crear turno fijo' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { dayjs, DEFAULT_TZ } from '@/utils/datetime'

const props = defineProps({
  visible: Boolean,
  loading: Boolean,
  saving: Boolean,
  error: { type: String, default: '' },
  // Respuesta de `POST /recurring/club/:id/preview`.
  preview: { type: Object, default: null },
  timezone: { type: String, default: DEFAULT_TZ },
  clienteNombre: { type: String, default: '' },
  canchaNombre: { type: String, default: '' },
})

const emit = defineEmits(['close', 'confirm'])

const ESTADO_FECHA = {
  libre: { label: 'Se genera', cls: 'bg-success-100 text-success-700' },
  ocupado: { label: 'Ocupado', cls: 'bg-warning-100 text-warning-700' },
  cerrado: { label: 'Cerrado', cls: 'bg-stone-200 text-stone-600' },
  fuera_de_horario: { label: 'Fuera de horario', cls: 'bg-stone-200 text-stone-600' },
}

const fechas = computed(() => props.preview?.fechas || [])
const conflictos = computed(() => props.preview?.conflictos || 0)
const horizonteDias = computed(() => props.preview?.horizonteDias || 90)

const DIAS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']

// El backend devuelve el día y la hora ya traducidos a la zona del club: en la
// base todo es UTC y la traducción pasa en el borde.
const diaLabel = computed(() => DIAS[props.preview?.local?.diaSemana ?? 0])
const horaLabel = computed(() => props.preview?.local?.horaInicio || '')

const subtitle = computed(() =>
  [props.clienteNombre, props.canchaNombre].filter(Boolean).join(' · ') || 'Se repite todas las semanas',
)

const fechaLabel = (iso) => {
  const l = dayjs.utc(iso).tz(props.timezone).format('ddd DD [de] MMMM')
  return l.charAt(0).toUpperCase() + l.slice(1)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
