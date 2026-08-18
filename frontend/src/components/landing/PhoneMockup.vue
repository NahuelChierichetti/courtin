<script setup>
import { ref } from 'vue'

// Maqueta de la ficha pública de un complejo (`/club/:slug`) dentro de un
// teléfono. Es una maqueta y no el componente real porque `ClubDetailView`
// necesita un club en la base y una llamada a la API: para la landing alcanza
// con reproducir el mismo flujo de tres pasos —día, cancha, horario— con los
// mismos tokens de marca.
//
// Los chips SÍ responden al toque: cuesta poco y le deja ver a quien mira que
// reservar son tres decisiones, no un formulario.

const DIAS = [
  { dow: 'VIE', day: '13' },
  { dow: 'SÁB', day: '14' },
  { dow: 'DOM', day: '15' },
  { dow: 'LUN', day: '16' },
  { dow: 'MAR', day: '17' },
]

const CANCHAS = [
  { nombre: 'Pádel 1', dot: 'bg-sport-padel-500' },
  { nombre: 'Pádel 2', dot: 'bg-sport-padel-500' },
  { nombre: 'Fútbol 5', dot: 'bg-sport-futbol-500' },
]

const HORARIOS = [
  { hora: '18:00', libre: true },
  { hora: '19:30', libre: false },
  { hora: '21:00', libre: true },
  { hora: '22:30', libre: true },
]

const dia = ref(1)
const cancha = ref(0)
const hora = ref('21:00')
const favorito = ref(false)
</script>

<template>
  <div class="mx-auto w-[300px] shrink-0">
    <!-- Carcasa -->
    <div class="rounded-[2.75rem] border-[10px] border-ink-500 bg-ink-500 shadow-2xl shadow-brand-green-900/25">
      <div class="relative overflow-hidden rounded-[2rem] bg-brand-sand-500">
        <!-- Muesca -->
        <div class="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-ink-500"></div>

        <!-- Barra del navegador -->
        <div class="flex items-center justify-center gap-1.5 bg-white px-4 pt-8 pb-2.5">
          <i class="icon-[material-symbols--lock] text-[10px] text-stone-400"></i>
          <span class="text-[11px] text-stone-400">courtinapp.com/club/los-amigos</span>
        </div>

        <!-- `min-h` y no `h`: con alto fijo, el bloque de la seña quedaba
             cortado abajo del recorte. El teléfono se estira lo que haga falta. -->
        <div class="min-h-[500px] overflow-hidden">
          <!-- Foto de portada. El mismo dibujo de cancha que usa la ficha real
               cuando el complejo todavía no subió fotos. -->
          <div class="relative h-28 bg-gradient-to-br from-ink-500 to-brand-purple-500">
            <div class="absolute inset-4 rounded-lg border border-white/15">
              <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/15"></div>
              <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15"></div>
              <div
                class="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"
              ></div>
            </div>
          </div>

          <div class="px-4 py-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-base font-bold text-ink-500">Complejo Los Amigos</p>
                <p class="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
                  <i class="icon-[material-symbols--location-on] text-[11px]"></i>
                  Av. Rivadavia 4820, Ramos Mejía
                </p>
              </div>
              <!-- Corazón de favorito, no una calificación: las reseñas todavía
                   no existen en el producto y un 4.8 inventado en la landing es
                   una promesa que la ficha real no cumple. -->
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/[0.08] bg-white transition-colors"
                :class="favorito ? 'text-error-500' : 'text-stone-400 hover:text-stone-600'"
                :aria-pressed="favorito"
                aria-label="Guardar en favoritos"
                @click="favorito = !favorito"
              >
                <i
                  :class="
                    favorito
                      ? 'icon-[material-symbols--favorite]'
                      : 'icon-[material-symbols--favorite-outline]'
                  "
                  class="text-base"
                ></i>
              </button>
            </div>

            <div class="mt-3 rounded-2xl border border-black/[0.06] bg-white p-3.5">
              <p class="text-sm font-bold text-ink-500">Reservá esta cancha</p>

              <p class="mt-3 text-[10px] font-bold tracking-wide text-stone-500 uppercase">Día</p>
              <div class="mt-1.5 flex gap-1.5">
                <button
                  v-for="(d, i) in DIAS"
                  :key="d.day"
                  type="button"
                  class="flex w-9 shrink-0 cursor-pointer flex-col items-center rounded-md border py-1.5 transition-colors"
                  :class="
                    dia === i
                      ? 'border-brand-green-500 bg-brand-green-500 text-white'
                      : 'border-black/[0.08] bg-white text-stone-600'
                  "
                  @click="dia = i"
                >
                  <span class="text-[8px] font-semibold" :class="dia === i ? 'text-white/75' : 'text-stone-400'">
                    {{ d.dow }}
                  </span>
                  <span class="text-xs leading-tight font-bold">{{ d.day }}</span>
                </button>
              </div>

              <p class="mt-3 text-[10px] font-bold tracking-wide text-stone-500 uppercase">Cancha</p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  v-for="(c, i) in CANCHAS"
                  :key="c.nombre"
                  type="button"
                  class="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
                  :class="
                    cancha === i
                      ? 'border-brand-green-500 bg-brand-green-50 text-brand-green-700'
                      : 'border-black/[0.08] bg-white text-stone-600'
                  "
                  @click="cancha = i"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="c.dot"></span>{{ c.nombre }}
                </button>
              </div>

              <div class="mt-3 flex items-center justify-between">
                <p class="text-[10px] font-bold tracking-wide text-stone-500 uppercase">Horario</p>
                <span class="text-[10px] font-semibold text-success-600">3/4 libres</span>
              </div>
              <div class="mt-1.5 grid grid-cols-3 gap-1.5">
                <button
                  v-for="h in HORARIOS"
                  :key="h.hora"
                  type="button"
                  :disabled="!h.libre"
                  class="rounded-full border py-1.5 text-[11px] font-semibold transition-colors"
                  :class="
                    !h.libre
                      ? 'cursor-not-allowed border-black/[0.04] bg-stone-50 text-stone-300 line-through'
                      : hora === h.hora
                        ? 'cursor-pointer border-brand-green-500 bg-brand-green-500 text-white'
                        : 'cursor-pointer border-black/[0.08] bg-white text-ink-500'
                  "
                  @click="hora = h.hora"
                >
                  {{ h.hora }}
                </button>
              </div>

              <div class="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-2.5">
                <div>
                  <p class="text-[10px] text-stone-500">Seña (50%)</p>
                  <p class="font-secondary text-sm font-bold text-ink-500">$ 11.000</p>
                </div>
                <span
                  class="rounded-full bg-brand-lime-500 px-4 py-2 text-xs font-bold text-brand-green-900"
                >Reservar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
