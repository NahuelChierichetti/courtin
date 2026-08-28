<script setup>
import { computed, inject } from 'vue'
import CourtIllustration from '@/components/canchas/CourtIllustration.vue'
import { sportMeta } from '@/utils/sports'
import { formatCurrency } from '@/utils/datetime'

// Réplica de `views/CanchasView.vue`: mismo encabezado con el contador y los
// filtros, misma grilla de tarjetas con la ilustración de la cancha arriba.
// La ilustración es el componente de producción (`CourtIllustration`), así que
// eso no puede quedar desactualizado.

const { courts, courtDraft, openCourtDraft, closeCourtDraft, toggleCourtEstado } =
  inject('demoPanel')

const activas = computed(() => courts.value.filter((c) => c.estado === 'activa').length)
const deportes = computed(() => new Set(courts.value.map((c) => c.tipo)).size)

// Los filtros del panel real salen de los deportes habilitados del club.
const filtros = computed(() => [
  { value: 'todas', label: 'Todas' },
  ...[...new Set(courts.value.map((c) => c.tipo))].map((t) => ({
    value: t,
    label: sportMeta(t).label,
  })),
])
</script>

<template>
  <!-- `relative` para que el cajón de la derecha se ancle acá y no al panel
       entero: si se anclara afuera, taparía también la barra de título.
       `min-h-full` porque con tres tarjetas el contenido es más bajo que el
       panel, y sin eso el cajón quedaba cortado a media altura. -->
  <div class="relative min-h-full space-y-6">
    <!-- Encabezado -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-brand-green-900">Canchas</h1>
        <p class="mt-1 text-sm text-stone-500">
          {{ activas }} canchas activas &middot; {{ deportes }} deportes
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex overflow-hidden rounded-full border border-black/[0.06] bg-white shadow-sm">
          <span
            v-for="(f, i) in filtros"
            :key="f.value"
            class="px-4 py-2 text-sm font-medium"
            :class="i === 0 ? 'bg-brand-purple-500 text-white' : 'bg-white text-stone-600'"
          >
            {{ f.label }}
          </span>
        </div>
        <span
          class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-4 py-2.5 text-sm font-semibold text-brand-green-900"
        >
          <i class="icon-[material-symbols--add] text-base"></i> Nueva cancha
        </span>
      </div>
    </div>

    <!-- Grilla de tarjetas -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="court in courts"
        :key="court._id"
        class="group relative overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition-shadow hover:shadow-md"
        :class="{ 'opacity-50': court.estado === 'inactiva' }"
      >
        <div
          class="relative flex h-40 items-center justify-center overflow-hidden"
          :class="sportMeta(court.tipo).bgSoft"
        >
          <CourtIllustration :tipo="court.tipo" />
        </div>

        <div class="p-5">
          <div class="flex items-center justify-between gap-2">
            <h3 class="truncate text-base font-semibold text-brand-green-900">{{ court.nombre }}</h3>
            <span
              class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="[sportMeta(court.tipo).bgSoft, sportMeta(court.tipo).text]"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(court.tipo).dot"></span>
              {{ sportMeta(court.tipo).label }}
            </span>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span class="flex items-center gap-1">
              <i class="icon-[material-symbols--grid-view] text-[10px]"></i>
              {{ court.superficie }}
            </span>
            <span class="flex items-center gap-1">
              <i class="icon-[material-symbols--cloud] text-[10px]"></i>
              {{ court.cubierta ? 'Cubierta' : 'Descubierta' }}
            </span>
            <span v-if="court.jugadores" class="flex items-center gap-1">
              <i class="icon-[material-symbols--group] text-[10px]"></i>
              F {{ court.jugadores }}
            </span>
          </div>

          <div class="mt-4 flex items-end justify-between">
            <div class="flex items-center gap-1">
              <p class="font-secondary text-lg font-bold text-brand-green-900">
                {{ formatCurrency(court.precio) }}
              </p>
              <p class="mt-1 text-xs text-stone-400">/ hora</p>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                :aria-label="`Editar ${court.nombre}`"
                @click="openCourtDraft(court._id)"
              >
                <i class="icon-[material-symbols--edit] text-md"></i>
              </button>
              <span
                class="flex h-8 w-8 items-center justify-center rounded-full text-error-600 opacity-60"
              >
                <i class="icon-[material-symbols--delete] text-md"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cajón de edición. Versión corta del de producción: los campos que se
         ven al abrirlo y el "Desactivar" del pie, que es lo que el paso pide. -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-4 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-x-4 opacity-0"
    >
      <div
        v-if="courtDraft"
        class="absolute inset-y-0 right-0 z-30 flex w-80 flex-col border-l border-black/[0.06] bg-white shadow-2xl"
      >
        <div class="flex items-start justify-between border-b border-black/[0.06] px-5 py-4">
          <div>
            <p class="text-base font-semibold text-brand-green-900">Editar cancha</p>
            <p class="mt-0.5 text-xs text-stone-500">{{ courtDraft.nombre }}</p>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="Cerrar"
            @click="closeCourtDraft"
          >
            <i class="icon-[material-symbols--close] text-base"></i>
          </button>
        </div>

        <div class="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
          <div>
            <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">
              Nombre
            </label>
            <input
              v-model="courtDraft.nombre"
              type="text"
              class="h-9 w-full rounded-lg border border-black/[0.08] px-3 text-sm text-brand-green-900 outline-none focus:ring-2 focus:ring-brand-green-200"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">
              Deporte
            </label>
            <div
              class="flex h-9 items-center gap-2 rounded-lg border border-black/[0.08] px-3 text-sm text-brand-green-900"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(courtDraft.tipo).dot"></span>
              {{ sportMeta(courtDraft.tipo).label }}
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">
              Superficie
            </label>
            <div
              class="flex h-9 items-center rounded-lg border border-black/[0.08] px-3 text-sm text-brand-green-900"
            >
              {{ courtDraft.superficie }}
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">
              Precio por hora
            </label>
            <input
              v-model.number="courtDraft.precio"
              type="number"
              class="h-9 w-full rounded-lg border border-black/[0.08] px-3 text-sm text-brand-green-900 outline-none focus:ring-2 focus:ring-brand-green-200"
            />
          </div>

          <label class="flex items-center justify-between rounded-xl border border-black/[0.06] p-3.5">
            <div class="pr-4">
              <p class="text-sm font-semibold text-stone-800">Cancha cubierta</p>
              <p class="text-xs text-stone-400">Se juega con lluvia</p>
            </div>
            <span
              class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              :class="courtDraft.cubierta ? 'bg-brand-green-500' : 'bg-stone-300'"
            >
              <span
                class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="courtDraft.cubierta ? 'translate-x-5' : ''"
              ></span>
            </span>
          </label>
        </div>

        <div class="flex items-center justify-between border-t border-black/[0.06] px-5 py-4">
          <button
            type="button"
            class="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-error-500 transition-colors hover:text-error-600"
            @click="toggleCourtEstado"
          >
            <i class="icon-[material-symbols--power-settings-new] text-xs"></i>
            {{ courtDraft.estado === 'activa' ? 'Desactivar' : 'Activar' }}
          </button>
          <span class="rounded-full bg-brand-green-500 px-5 py-2 text-sm font-semibold text-white">
            Guardar
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>
