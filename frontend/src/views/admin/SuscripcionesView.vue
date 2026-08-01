<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import subscriptionService from '@/services/subscriptionService'
import { formatCurrency, formatDateUTC } from '@/utils/datetime'

// Gestión comercial de las suscripciones. Mientras MercadoPago no esté
// integrado, ésta es la vía para cobrar: se emite la factura, el club transfiere
// y acá se marca el pago a mano.
const toast = useToast()

const filas = ref([])
const loading = ref(false)
const busyId = ref(null)
const detalle = ref(null)
const detalleLoading = ref(false)

const money = (n) => (n == null ? '—' : formatCurrency(n, 'ARS'))
const fecha = (d) => (d ? formatDateUTC(d, 'DD MMM YYYY') : '—')

const ESTADO_META = {
  trial: { label: 'Trial', clase: 'bg-brand-purple-100 text-brand-purple-700' },
  activo: { label: 'Al día', clase: 'bg-success-50 text-success-600' },
  impago: { label: 'Impago', clase: 'bg-warning-50 text-warning-600' },
  suspendido: { label: 'Suspendido', clase: 'bg-error-50 text-error-600' },
  cancelado: { label: 'Cancelado', clase: 'bg-stone-100 text-stone-600' },
  inactivo: { label: 'Inactivo', clase: 'bg-stone-100 text-stone-600' },
}
const meta = (e) => ESTADO_META[e] || ESTADO_META.inactivo

const stats = computed(() => ({
  total: filas.value.length,
  alDia: filas.value.filter((f) => f.estado === 'activo').length,
  enMora: filas.value.filter((f) => ['impago', 'suspendido'].includes(f.estado)).length,
  deuda: filas.value.reduce((acc, f) => acc + (f.deuda?.monto || 0), 0),
}))

const fetchAll = async () => {
  loading.value = true
  try {
    filas.value = await subscriptionService.list()
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las suscripciones.', life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

const abrirDetalle = async (fila) => {
  detalle.value = { club: fila, data: null }
  detalleLoading.value = true
  try {
    detalle.value.data = await subscriptionService.getByClub(fila._id)
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el detalle.', life: 4000 })
    detalle.value = null
  } finally {
    detalleLoading.value = false
  }
}

const emitir = async (clubId) => {
  busyId.value = clubId
  try {
    const f = await subscriptionService.emitirFactura(clubId)
    toast.add({ severity: 'success', summary: 'Factura emitida', detail: `Período ${f.periodo} · ${money(f.monto)}`, life: 4000 })
    if (detalle.value?.club._id === clubId) await abrirDetalle(detalle.value.club)
    await fetchAll()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo emitir', detail: err.response?.data?.message || 'Intentá de nuevo.', life: 5000 })
  } finally {
    busyId.value = null
  }
}

const marcarPagada = async (factura) => {
  busyId.value = factura._id
  try {
    const r = await subscriptionService.pagarManual(factura._id, 'Pago registrado manualmente')
    toast.add({ severity: 'success', summary: 'Pago registrado', detail: r.message, life: 4000 })
    if (detalle.value) await abrirDetalle(detalle.value.club)
    await fetchAll()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'No se pudo registrar', detail: err.response?.data?.message || 'Intentá de nuevo.', life: 5000 })
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-stone-900">Suscripciones</h1>
      <p class="mt-1 text-sm text-stone-500">
        {{ stats.total }} complejos · {{ stats.alDia }} al día · {{ stats.enMora }} en mora
        <template v-if="stats.deuda > 0"> · {{ money(stats.deuda) }} por cobrar</template>
      </p>
    </div>

    <div class="rounded-xl border border-stone-200 bg-white">
      <div class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-stone-100 px-6 py-3">
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-400">Complejo</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-400">Plan</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-400">Estado</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-400 text-right">Abono</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-400">Pago hasta</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-stone-400 text-right">Deuda</span>
        <span></span>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
      </div>

      <div v-else-if="!filas.length" class="py-16 text-center">
        <i class="icon-[material-symbols--credit-card-off-outline] text-4xl text-stone-200"></i>
        <p class="mt-3 text-sm text-stone-400">No hay suscripciones</p>
      </div>

      <div
        v-else
        v-for="f in filas"
        :key="f._id"
        class="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-stone-50 px-6 py-4 last:border-0 hover:bg-stone-50/50"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-stone-900">{{ f.nombre }}</p>
          <p class="truncate text-xs text-stone-400">
            /{{ f.slug }}<template v-if="f.sinSuscripcion"> · sin suscripción</template>
          </p>
        </div>
        <span class="text-sm text-stone-600">{{ f.plan }}</span>
        <div>
          <span class="inline-block rounded-full px-2.5 py-1 text-xs font-semibold" :class="meta(f.estado).clase">
            {{ meta(f.estado).label }}
          </span>
        </div>
        <span class="text-right text-sm text-stone-700">{{ money(f.precio) }}</span>
        <div>
          <span class="text-sm text-stone-600">{{ fecha(f.vigenciaHasta) }}</span>
          <p v-if="f.diasDeMora > 0" class="text-xs text-error-600">{{ f.diasDeMora }} días de mora</p>
        </div>
        <span class="text-right text-sm font-semibold" :class="f.deuda ? 'text-error-600' : 'text-stone-400'">
          {{ f.deuda ? money(f.deuda.monto) : '—' }}
        </span>
        <div class="flex items-center gap-1">
          <button
            :disabled="busyId === f._id"
            class="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
            @click="emitir(f._id)"
          >
            <i class="icon-[material-symbols--receipt-long-outline] text-sm"></i> Emitir
          </button>
          <button
            class="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-brand-green-600 transition-colors hover:bg-brand-green-50 cursor-pointer"
            @click="abrirDetalle(f)"
          >
            Ver
          </button>
        </div>
      </div>
    </div>

    <!-- Detalle -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="detalle" class="fixed inset-0 z-50 flex justify-end" @click.self="detalle = null">
          <div class="absolute inset-0 bg-black/30"></div>
          <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div class="flex items-center justify-between border-b border-stone-200 px-6 py-5">
              <div class="min-w-0">
                <h2 class="truncate text-lg font-semibold text-stone-900">{{ detalle.club.nombre }}</h2>
                <p class="text-sm text-stone-400">Facturación</p>
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 cursor-pointer"
                @click="detalle = null"
              >
                <i class="icon-[material-symbols--close] text-sm"></i>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-6 py-6">
              <div v-if="detalleLoading" class="flex justify-center py-10">
                <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
              </div>

              <template v-else-if="detalle.data">
                <div class="mb-6 grid grid-cols-2 gap-3">
                  <div class="rounded-2xl border border-stone-200 p-4">
                    <p class="text-xs text-stone-400">Plan</p>
                    <p class="mt-1 text-lg font-bold text-stone-900">{{ detalle.data.suscripcion.planLabel }}</p>
                  </div>
                  <div class="rounded-2xl border border-stone-200 p-4">
                    <p class="text-xs text-stone-400">Pago hasta</p>
                    <p class="mt-1 text-sm font-semibold text-stone-900">{{ fecha(detalle.data.suscripcion.vigenciaHasta) }}</p>
                  </div>
                </div>

                <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">Facturas</p>
                <div v-if="!detalle.data.facturas.length" class="rounded-2xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400">
                  Sin facturas emitidas
                </div>
                <div v-else class="space-y-2">
                  <div
                    v-for="f in detalle.data.facturas"
                    :key="f._id"
                    class="flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-stone-900">{{ f.periodo }} · {{ money(f.monto) }}</p>
                      <p class="text-xs text-stone-400">
                        Vence {{ fecha(f.vencimiento) }}
                        <template v-if="f.metodoPago"> · {{ f.metodoPago }}</template>
                      </p>
                    </div>
                    <span v-if="f.estado === 'pagada'" class="rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600">
                      Pagada
                    </span>
                    <button
                      v-else
                      :disabled="busyId === f._id"
                      class="flex h-8 items-center rounded-full bg-brand-lime-500 px-3 text-xs font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-50 cursor-pointer"
                      @click="marcarPagada(f)"
                    >
                      Marcar pagada
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
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
