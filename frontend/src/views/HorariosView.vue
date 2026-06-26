<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Horarios de apertura</h1>
        <p class="mt-1 text-sm text-slate-500">
          Definí los días y horas en que el complejo acepta reservas.
        </p>
      </div>
      <div v-if="currentClubId && !loading && !error" class="flex items-center gap-3">
        <Button
          :label="saving ? 'Guardando...' : 'Guardar cambios'"
          size="small"
          :loading="saving"
          @click="save"
        />
      </div>
    </div>

    <!-- No club selected -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-building text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">Sin club seleccionado</h3>
      <p class="!mt-2 text-sm text-slate-500">
        Seleccioná un club desde el selector en el encabezado para configurar los horarios.
      </p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-neutral-400"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando horarios...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50">
        <i class="pi pi-exclamation-triangle text-2xl text-error-500"></i>
      </div>
      <p class="mt-4 text-sm text-slate-500">{{ error }}</p>
      <Button label="Reintentar" icon="pi pi-refresh" severity="secondary" size="small" class="mt-4" @click="fetchHorarios" />
    </div>

    <!-- Content -->
    <div v-else-if="horarios" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Weekly schedule -->
      <div class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Horario semanal regular</h2>
            <p class="mt-0.5 text-sm text-neutral-400">Aplica a todas las canchas salvo excepciones puntuales</p>
          </div>
          <button
            class="text-sm font-medium text-primitive-orange-500 transition-colors hover:text-primitive-orange-600 cursor-pointer"
            @click="copyToAll"
          >
            Copiar a todas
          </button>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            v-for="dia in diasSemana"
            :key="dia.key"
            class="flex items-center gap-4 px-6 py-4"
          >
            <span class="w-24 shrink-0 text-sm font-medium text-slate-900">{{ dia.label }}</span>

            <div class="flex items-center gap-2" :class="{ 'opacity-40': !horarios.semanal[dia.key].abierto }">
              <TimePicker
                v-model="horarios.semanal[dia.key].horaInicio"
                :disabled="!horarios.semanal[dia.key].abierto"
                class="w-28"
              />
              <span class="text-slate-300">&mdash;</span>
              <TimePicker
                v-model="horarios.semanal[dia.key].horaFin"
                :disabled="!horarios.semanal[dia.key].abierto"
                class="w-28"
              />
            </div>

            <span class="hidden flex-1 text-xs text-neutral-400 sm:block">
              <template v-if="horarios.semanal[dia.key].abierto">
                ~{{ slotsCount(horarios.semanal[dia.key]) }} turnos de 1h
              </template>
            </span>

            <div class="ml-auto flex items-center gap-3">
              <span class="text-sm" :class="horarios.semanal[dia.key].abierto ? 'text-slate-600' : 'text-neutral-400'">
                {{ horarios.semanal[dia.key].abierto ? 'Abierto' : 'Cerrado' }}
              </span>
              <button
                type="button"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors"
                :class="horarios.semanal[dia.key].abierto ? 'bg-primitive-orange-500' : 'bg-slate-300'"
                @click="horarios.semanal[dia.key].abierto = !horarios.semanal[dia.key].abierto"
              >
                <span
                  class="inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform"
                  :class="horarios.semanal[dia.key].abierto ? 'translate-x-[22px]' : 'translate-x-0.5'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="space-y-6">
        <!-- Special days -->
        <div class="rounded-2xl border border-slate-200 bg-white">
          <div class="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 class="text-base font-semibold text-slate-900">Días especiales</h2>
              <p class="mt-0.5 text-sm text-neutral-400">Feriados y excepciones</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              @click="openNewSpecialDay"
            >
              <i class="pi pi-plus text-sm"></i>
            </button>
          </div>

          <div v-if="horarios.diasEspeciales.length === 0" class="px-6 py-8 text-center text-sm text-neutral-400">
            No hay días especiales cargados.
          </div>

          <div v-else class="divide-y divide-slate-100">
            <div
              v-for="(dia, idx) in horarios.diasEspeciales"
              :key="dia._id || idx"
              class="group flex items-center gap-3 px-6 py-4"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                :class="dia.tipo === 'especial' ? 'bg-primitive-orange-100 text-primitive-orange-500' : 'bg-slate-100 text-neutral-400'"
              >
                <i :class="dia.tipo === 'especial' ? 'pi pi-star' : 'pi pi-power-off'" class="text-sm"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-900">{{ dia.nombre }}</p>
                <p class="text-xs text-neutral-400">
                  {{ formatDate(dia.fecha) }} &middot;
                  {{ dia.tipo === 'especial' ? `Extendido ${dia.horaInicio} – ${dia.horaFin}` : 'Cerrado' }}
                </p>
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 cursor-pointer group-hover:opacity-100"
                @click="openEditSpecialDay(dia, idx)"
              >
                <i class="pi pi-pencil text-sm"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Booking settings -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 class="text-base font-semibold text-slate-900">Ajustes de reserva</h2>

          <div class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
            La duración del turno se configura por cancha (60, 90 o 120 min) desde la sección
            <RouterLink to="/canchas" class="font-medium text-primitive-orange-500 hover:text-primitive-orange-600">Canchas</RouterLink>,
            para contemplar deportes con duraciones distintas.
          </div>

          <div class="mt-5 space-y-5">
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-700">Tolerancia para cancelar</p>
                <p class="text-xs text-neutral-400">Tiempo antes del turno para cancelar sin costo</p>
              </div>
              <div class="relative shrink-0">
                <select
                  v-model.number="horarios.reservas.toleranciaCancelacionHoras"
                  class="w-32 appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                >
                  <option v-for="opt in toleranciaOptions" :key="opt" :value="opt">{{ opt }} horas</option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
              </div>
            </div>

            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sm font-medium text-slate-700">Reserva anticipada máx.</p>
                <p class="text-xs text-neutral-400">Cuánto se puede reservar con antelación</p>
              </div>
              <div class="relative shrink-0">
                <select
                  v-model.number="horarios.reservas.anticipacionMaximaDias"
                  class="w-32 appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                >
                  <option v-for="opt in anticipacionOptions" :key="opt" :value="opt">{{ opt }} días</option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Special day drawer -->
    <SpecialDayDrawer
      :visible="showDrawer"
      :dia-especial="editingDia"
      :index="editingIndex"
      @close="showDrawer = false"
      @save="handleSaveSpecialDay"
      @delete="handleDeleteSpecialDay"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import SpecialDayDrawer from '@/components/horarios/SpecialDayDrawer.vue'
import TimePicker from '@/components/common/TimePicker.vue'
import scheduleService from '@/services/scheduleService'
import { useAuth } from '@/composables/useAuth'
import { formatDateUTC } from '@/utils/datetime'

const { currentClubId } = useAuth()
const toast = useToast()

const horarios = ref(null)
const loading = ref(false)
const saving = ref(false)
const error = ref(null)

const showDrawer = ref(false)
const editingDia = ref(null)
const editingIndex = ref(-1)

const diasSemana = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const toleranciaOptions = [0, 1, 2, 4, 6, 12, 24, 48]
const anticipacionOptions = [7, 15, 30, 45, 60, 90]

const slotsCount = (dia) => {
  if (!dia.abierto || !dia.horaInicio || !dia.horaFin) return 0
  const [hi, mi] = dia.horaInicio.split(':').map(Number)
  const [hf, mf] = dia.horaFin.split(':').map(Number)
  let mins = hf * 60 + mf - (hi * 60 + mi)
  if (mins <= 0) mins += 24 * 60 // cierre pasada la medianoche
  return Math.floor(mins / 60)
}

const formatDate = (value) => formatDateUTC(value, 'DD MMM YYYY')

const fetchHorarios = async () => {
  if (!currentClubId.value) return
  loading.value = true
  error.value = null
  try {
    horarios.value = await scheduleService.getHorarios(currentClubId.value)
  } catch (err) {
    error.value = 'Error al cargar los horarios'
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los horarios.', life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(fetchHorarios)

watch(currentClubId, (newId) => {
  if (newId) fetchHorarios()
  else horarios.value = null
})

const copyToAll = () => {
  const ref0 = horarios.value.semanal[diasSemana[0].key]
  diasSemana.slice(1).forEach(({ key }) => {
    horarios.value.semanal[key].horaInicio = ref0.horaInicio
    horarios.value.semanal[key].horaFin = ref0.horaFin
    horarios.value.semanal[key].abierto = ref0.abierto
  })
  toast.add({
    severity: 'info',
    summary: 'Horario copiado',
    detail: 'Se aplicó el horario del lunes a todos los días. Recordá guardar los cambios.',
    life: 4000,
  })
}

const openNewSpecialDay = () => {
  editingDia.value = null
  editingIndex.value = -1
  showDrawer.value = true
}

const openEditSpecialDay = (dia, idx) => {
  editingDia.value = dia
  editingIndex.value = idx
  showDrawer.value = true
}

const handleSaveSpecialDay = ({ dia, index }) => {
  const editing = index >= 0
  if (editing) {
    horarios.value.diasEspeciales.splice(index, 1, dia)
  } else {
    horarios.value.diasEspeciales.push(dia)
  }
  showDrawer.value = false
  toast.add({
    severity: 'success',
    summary: editing ? 'Día especial actualizado' : 'Día especial agregado',
    detail: `"${dia.nombre}". Recordá guardar los cambios.`,
    life: 4000,
  })
}

const handleDeleteSpecialDay = (index) => {
  if (index >= 0) horarios.value.diasEspeciales.splice(index, 1)
  showDrawer.value = false
  toast.add({
    severity: 'success',
    summary: 'Día especial eliminado',
    detail: 'Recordá guardar los cambios.',
    life: 4000,
  })
}

const save = async () => {
  if (!currentClubId.value || !horarios.value) return
  saving.value = true
  error.value = null
  try {
    horarios.value = await scheduleService.updateHorarios(currentClubId.value, {
      semanal: horarios.value.semanal,
      diasEspeciales: horarios.value.diasEspeciales,
      reservas: horarios.value.reservas,
    })
    toast.add({ severity: 'success', summary: 'Cambios guardados', detail: 'Los horarios se actualizaron correctamente.', life: 3000 })
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudieron guardar los horarios.'
    toast.add({ severity: 'error', summary: 'Error al guardar', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}
</script>
