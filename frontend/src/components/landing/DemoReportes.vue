<script setup>
import { computed, inject } from 'vue'
import AreaLineChart from '@/components/reportes/AreaLineChart.vue'
import DonutChart from '@/components/reportes/DonutChart.vue'
import { formatCurrency } from '@/utils/datetime'

const { reportes } = inject('demoPanel')

const money = (v) => formatCurrency(v, 'ARS')
// En el eje del gráfico el número entero no entra: se abrevia en miles.
const moneyShort = (v) => `$${Math.round(v / 1000)}k`

const kpis = computed(() => [
  {
    label: 'Ingresos del mes',
    value: money(reportes.value.kpis.ingresos),
    icon: 'icon-[material-symbols--payments]',
    tone: 'bg-success-50 text-success-600',
    valueClass: 'text-success-600',
  },
  {
    label: 'Reservas',
    value: reportes.value.kpis.reservas,
    icon: 'icon-[material-symbols--calendar-month]',
    tone: 'bg-brand-purple-50 text-brand-purple-500',
    valueClass: 'text-brand-green-900',
  },
  {
    label: 'Ocupación',
    value: `${reportes.value.kpis.ocupacion}%`,
    icon: 'icon-[material-symbols--pie-chart]',
    tone: 'bg-brand-green-50 text-brand-green-500',
    valueClass: 'text-brand-green-900',
  },
  {
    label: 'Ticket promedio',
    value: money(reportes.value.kpis.ticket),
    icon: 'icon-[material-symbols--receipt-long]',
    tone: 'bg-brand-green-50 text-brand-green-500',
    valueClass: 'text-brand-green-900',
  },
])

const maxIngresoCancha = computed(() =>
  Math.max(...reportes.value.porCancha.map((c) => c.ingresos)),
)
</script>

<template>
  <div class="space-y-4">
    <!-- KPIs -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div
        v-for="k in kpis"
        :key="k.label"
        class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"
      >
        <span class="flex h-9 w-9 items-center justify-center rounded-xl" :class="k.tone">
          <i :class="k.icon" class="text-base"></i>
        </span>
        <p class="mt-2.5 text-xs font-medium text-stone-500">{{ k.label }}</p>
        <p class="font-secondary mt-0.5 text-xl font-bold" :class="k.valueClass">{{ k.value }}</p>
      </div>
    </div>

    <!-- Ingresos por día -->
    <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-brand-green-900">Ingresos por día</h3>
        <span class="text-xs text-stone-500">Últimos 14 días</span>
      </div>
      <div class="mt-3">
        <AreaLineChart :points="reportes.porDia" :format="money" :height="170" :label-step="2" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <!-- Reservas por deporte -->
      <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-brand-green-900">Reservas por deporte</h3>
        <div class="mt-3">
          <DonutChart :segments="reportes.porDeporte" center-label="reservas" />
        </div>
      </div>

      <!-- Rendimiento por cancha -->
      <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-brand-green-900">Qué cancha te rinde más</h3>
        <ul class="mt-4 space-y-3.5">
          <li v-for="c in reportes.porCancha" :key="c.nombre">
            <div class="flex items-baseline justify-between">
              <span class="text-sm font-medium text-brand-green-900">{{ c.nombre }}</span>
              <span class="font-secondary text-sm font-semibold text-stone-600">
                {{ moneyShort(c.ingresos) }}
                <span class="ml-1 text-xs font-normal text-stone-400">{{ c.ocupacion }}% ocupada</span>
              </span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                class="h-full rounded-full bg-brand-green-500"
                :style="{ width: `${Math.round((c.ingresos / maxIngresoCancha) * 100)}%` }"
              ></div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
