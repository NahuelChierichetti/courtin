<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import subscriptionService from '@/services/subscriptionService'
import { formatCurrency, formatDateUTC } from '@/utils/datetime'

const { currentClubId, currentClub } = useAuth()
const toast = useToast()

const data = ref(null)
const planes = ref([])
const loading = ref(false)

const moneda = computed(() => currentClub.value?.moneda || 'ARS')
const money = (n) => formatCurrency(n, moneda.value)
const fecha = (d) => (d ? formatDateUTC(d, 'DD MMM YYYY') : '—')

const ESTADO_META = {
  trial: { label: 'Prueba gratis', clase: 'bg-brand-purple-100 text-brand-purple-700', icono: 'icon-[material-symbols--schedule]' },
  activo: { label: 'Al día', clase: 'bg-success-50 text-success-600', icono: 'icon-[material-symbols--check-circle-outline]' },
  impago: { label: 'Impago', clase: 'bg-warning-50 text-warning-600', icono: 'icon-[material-symbols--warning-outline]' },
  suspendido: { label: 'Suspendido', clase: 'bg-error-50 text-error-600', icono: 'icon-[material-symbols--block]' },
  cancelado: { label: 'Cancelado', clase: 'bg-stone-100 text-stone-600', icono: 'icon-[material-symbols--do-not-disturb-on-outline]' },
  inactivo: { label: 'Inactivo', clase: 'bg-stone-100 text-stone-600', icono: 'icon-[material-symbols--pause-circle-outline]' },
}
const estadoMeta = computed(() => ESTADO_META[data.value?.estado] || ESTADO_META.inactivo)

const FACTURA_META = {
  pagada: { label: 'Pagada', clase: 'bg-success-50 text-success-600' },
  pendiente: { label: 'Pendiente', clase: 'bg-warning-50 text-warning-600' },
  vencida: { label: 'Vencida', clase: 'bg-error-50 text-error-600' },
  anulada: { label: 'Anulada', clase: 'bg-stone-100 text-stone-500' },
}

// Aviso principal según el estado. Es lo que explica qué está pasando y qué
// falta hacer; el resto de la pantalla es contexto.
const aviso = computed(() => {
  if (!data.value) return null
  const { estado, mora } = data.value
  const corte = mora.proximoCorte

  if (estado === 'suspendido') {
    return {
      tono: 'error',
      titulo: 'Acceso bloqueado por falta de pago',
      texto: 'Tu complejo no aparece en las búsquedas y el panel está restringido. Regularizá el pago para reactivar todo. Los turnos ya reservados siguen funcionando con normalidad.',
    }
  }
  if (estado === 'impago') {
    return {
      tono: 'warning',
      titulo: 'Tu complejo está despublicado',
      texto: corte
        ? `Dejaste de recibir reservas y no podés cargar turnos nuevos. En ${corte.enDias} día${corte.enDias === 1 ? '' : 's'} también se bloquea el acceso al panel.`
        : 'Dejaste de recibir reservas y no podés cargar turnos nuevos.',
    }
  }
  if (mora.dias > 0 && corte) {
    return {
      tono: 'warning',
      titulo: `Tenés un pago vencido hace ${mora.dias} día${mora.dias === 1 ? '' : 's'}`,
      texto: `Si no lo regularizás, en ${corte.enDias} día${corte.enDias === 1 ? '' : 's'} tu complejo deja de aparecer en las búsquedas.`,
    }
  }
  if (estado === 'trial') {
    return {
      tono: 'info',
      titulo: 'Estás en tu prueba gratis',
      texto: `Podés usar todo sin límites hasta el ${fecha(data.value.suscripcion.trialHasta)}.`,
    }
  }
  return null
})

const TONOS = {
  error: 'border-error-100 bg-error-50',
  warning: 'border-warning-200 bg-warning-50',
  info: 'border-brand-purple-200 bg-brand-purple-50',
}

const fetchAll = async () => {
  if (!currentClubId.value) {
    data.value = null
    return
  }
  loading.value = true
  try {
    const [sub, cat] = await Promise.all([
      subscriptionService.getByClub(currentClubId.value),
      subscriptionService.getPlanes().catch(() => ({ planes: [] })),
    ])
    data.value = sub
    planes.value = cat.planes || []
  } catch (err) {
    console.error(err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo cargar la suscripción.',
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
watch(currentClubId, fetchAll)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-ink-500">Suscripción</h1>
      <p class="mt-1 text-sm text-stone-500">Tu plan, tu estado de pago y el historial de facturas.</p>
    </div>

    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--apartment] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-ink-500">Sin club seleccionado</h3>
    </div>

    <div v-else-if="loading" class="flex items-center justify-center py-16">
      <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
    </div>

    <template v-else-if="data">
      <!-- Aviso de estado -->
      <div v-if="aviso" class="flex flex-wrap items-start gap-3 rounded-2xl border px-5 py-4" :class="TONOS[aviso.tono]">
        <i :class="estadoMeta.icono" class="mt-0.5 shrink-0 text-xl text-ink-500"></i>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-ink-500">{{ aviso.titulo }}</p>
          <p class="mt-1 text-xs leading-relaxed text-stone-600">{{ aviso.texto }}</p>
        </div>
      </div>

      <!-- Resumen -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <p class="text-sm font-medium text-stone-500">Plan</p>
          <p class="mt-1 text-2xl font-bold font-secondary text-ink-500">{{ data.suscripcion.planLabel }}</p>
          <p class="mt-1 text-xs text-stone-400">
            {{ data.uso.canchas }} de {{ data.uso.limite ?? '∞' }} canchas
          </p>
        </div>

        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <p class="text-sm font-medium text-stone-500">Estado</p>
          <span class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" :class="estadoMeta.clase">
            <i :class="estadoMeta.icono" class="text-sm"></i>{{ estadoMeta.label }}
          </span>
          <p v-if="data.mora.dias > 0" class="mt-2 text-xs text-stone-400">
            Vencido hace {{ data.mora.dias }} día{{ data.mora.dias === 1 ? '' : 's' }}
          </p>
        </div>

        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <p class="text-sm font-medium text-stone-500">Abono {{ data.suscripcion.ciclo }}</p>
          <p class="mt-1 text-2xl font-bold font-secondary text-ink-500">{{ money(data.suscripcion.precio) }}</p>
        </div>

        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <p class="text-sm font-medium text-stone-500">
            {{ data.estado === 'trial' ? 'Prueba hasta' : 'Pago hasta' }}
          </p>
          <p class="mt-1 text-lg font-bold font-secondary text-ink-500">
            {{ fecha(data.estado === 'trial' ? data.suscripcion.trialHasta : data.suscripcion.vigenciaHasta) }}
          </p>
        </div>
      </div>

      <!-- Facturas -->
      <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div class="border-b border-black/[0.06] px-6 py-4">
          <h2 class="text-sm font-semibold text-ink-500">Facturas</h2>
        </div>

        <div v-if="!data.facturas.length" class="flex flex-col items-center justify-center py-14 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
            <i class="icon-[material-symbols--receipt-long-outline] text-xl text-stone-400"></i>
          </div>
          <h3 class="mt-4 text-sm font-semibold text-ink-500">Todavía no hay facturas</h3>
          <p class="mt-1 text-xs text-stone-500">Se emiten al terminar tu período de prueba.</p>
        </div>

        <div v-else class="divide-y divide-black/[0.05]">
          <div v-for="f in data.facturas" :key="f._id" class="flex flex-wrap items-center gap-4 px-6 py-3.5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink-500">{{ f.periodo }}</p>
              <p class="text-xs text-stone-400">
                Vence {{ fecha(f.vencimiento) }}
                <template v-if="f.pagadaEn"> · Pagada el {{ fecha(f.pagadaEn) }}</template>
              </p>
            </div>
            <span class="text-sm font-semibold font-secondary text-stone-700">{{ money(f.monto) }}</span>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="(FACTURA_META[f.estado] || FACTURA_META.pendiente).clase">
              {{ (FACTURA_META[f.estado] || FACTURA_META.pendiente).label }}
            </span>
            <!-- TODO(paso 4): botón de pago con el link de MercadoPago. -->
            <a
              v-if="f.linkPago && f.estado !== 'pagada'"
              :href="f.linkPago"
              target="_blank"
              rel="noopener"
              class="flex h-8 items-center rounded-full bg-brand-lime-500 px-4 text-xs font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600"
            >
              Pagar
            </a>
          </div>
        </div>
      </div>

      <!-- Planes -->
      <div v-if="planes.length" class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div class="border-b border-black/[0.06] px-6 py-4">
          <h2 class="text-sm font-semibold text-ink-500">Planes</h2>
          <p class="mt-0.5 text-xs text-stone-500">
            Todas las funciones están en todos los planes: sólo cambia cuántas canchas podés cargar.
            Escribinos para cambiar de plan.
          </p>
        </div>
        <div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
          <div
            v-for="p in planes"
            :key="p.key"
            class="rounded-2xl border p-5"
            :class="p.key === data.suscripcion.plan ? 'border-brand-green-400 bg-brand-green-50' : 'border-black/[0.08]'"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-bold text-ink-500">{{ p.label }}</p>
              <span v-if="p.key === data.suscripcion.plan" class="rounded-full bg-brand-green-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                Actual
              </span>
            </div>
            <p class="mt-1 text-xs text-stone-500">
              {{ p.maxCanchas ? `Hasta ${p.maxCanchas} canchas` : '7 canchas o más' }}
            </p>
            <p class="mt-3 text-xl font-bold font-secondary text-ink-500">{{ money(p.precios.mensual) }}</p>
            <p class="text-xs text-stone-400">por mes</p>
            <p class="mt-2 text-xs text-stone-500">
              o {{ money(p.precioMensualizadoAnual) }}/mes pagando el año ({{ money(p.precios.anual) }})
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
