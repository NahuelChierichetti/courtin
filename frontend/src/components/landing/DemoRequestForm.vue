<script setup>
import { computed, reactive, ref } from 'vue'
import publicService from '@/services/publicService'

// Formulario de "agendá una demo" de la landing de complejos.
//
// Pide lo mínimo para poder llamar y saber de qué tamaño es el complejo: más
// campos en un formulario de contacto sólo bajan la conversión, y el resto se
// pregunta en la llamada.
//
// No crea cuenta ni complejo: eso ya lo hace /panel/registro. Esto es para
// quien todavía no quiere registrarse solo y prefiere que le muestren.

const CONTACTO_EMAIL = 'courtinapp@gmail.com'

const form = reactive({
  clubNombre: '',
  email: '',
  telefono: '',
  canchas: '',
})

const enviando = ref(false)
const enviado = ref(false)
const error = ref('')

const completo = computed(
  () => form.clubNombre.trim() && form.email.trim() && form.telefono.trim(),
)

const enviar = async () => {
  if (enviando.value) return
  error.value = ''
  enviando.value = true

  try {
    await publicService.requestDemo({
      clubNombre: form.clubNombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      // El campo es opcional: vacío viaja como null y el backend lo ignora.
      canchas: form.canchas === '' ? null : Number(form.canchas),
    })
    enviado.value = true
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      `No pudimos enviar el pedido. Escribinos a ${CONTACTO_EMAIL} y lo resolvemos.`
  } finally {
    enviando.value = false
  }
}

const inputBase =
  'h-12 w-full rounded-xl border border-black/[0.08] bg-white px-4 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100'
</script>

<template>
  <!-- Estado final: el formulario se reemplaza entero. Dejarlo visible invita a
       mandar el mismo pedido dos veces. -->
  <div
    v-if="enviado"
    class="rounded-2xl border border-brand-green-200 bg-brand-green-50 p-8"
  >
    <span
      class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-green-500 text-white"
    >
      <i class="icon-[material-symbols--check] text-xl"></i>
    </span>
    <h3 class="mt-4 text-xl font-semibold text-brand-green-900">Recibimos tu pedido</h3>
    <p class="mt-2 text-sm leading-relaxed text-stone-600">
      Te escribimos a <strong class="font-medium text-brand-green-900">{{ form.email }}</strong> para
      coordinar el día y la hora. Suele ser dentro de las 24 horas hábiles.
    </p>
    <p class="mt-4 text-sm text-stone-500">
      Si preferís adelantarte, escribinos a
      <a
        :href="`mailto:${CONTACTO_EMAIL}`"
        class="font-medium text-brand-purple-600 underline underline-offset-4 transition-colors hover:text-brand-purple-700"
        >{{ CONTACTO_EMAIL }}</a
      >.
    </p>
  </div>

  <form
    v-else
    class="rounded-2xl border border-black/[0.06] bg-white p-6 sm:p-8"
    @submit.prevent="enviar"
  >
    <div class="grid gap-5 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label for="demo-club" class="mb-1.5 block text-sm font-medium text-brand-green-900">
          Nombre del complejo
        </label>
        <input
          id="demo-club"
          v-model="form.clubNombre"
          type="text"
          required
          autocomplete="organization"
          placeholder="Ej: Club Los Pinos"
          :class="inputBase"
        />
      </div>

      <div>
        <label for="demo-email" class="mb-1.5 block text-sm font-medium text-brand-green-900">
          Email
        </label>
        <input
          id="demo-email"
          v-model="form.email"
          type="email"
          required
          autocomplete="email"
          placeholder="tu@complejo.com"
          :class="inputBase"
        />
      </div>

      <div>
        <label for="demo-telefono" class="mb-1.5 block text-sm font-medium text-brand-green-900">
          Teléfono
        </label>
        <input
          id="demo-telefono"
          v-model="form.telefono"
          type="tel"
          required
          autocomplete="tel"
          placeholder="Ej: +54 11 5555-5555"
          :class="inputBase"
        />
      </div>

      <div class="sm:col-span-2">
        <label for="demo-canchas" class="mb-1.5 block text-sm font-medium text-brand-green-900">
          Cantidad de canchas
          <span class="font-normal text-stone-400">(opcional)</span>
        </label>
        <input
          id="demo-canchas"
          v-model="form.canchas"
          type="number"
          min="1"
          inputmode="numeric"
          placeholder="Ej: 4"
          :class="inputBase"
        />
        <p class="mt-1.5 text-xs text-stone-400">
          Nos sirve para mostrarte el plan que se adapta a tu complejo.
        </p>
      </div>
    </div>

    <p
      v-if="error"
      class="mt-5 flex items-start gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600"
    >
      <i class="icon-[material-symbols--error] mt-0.5 shrink-0"></i>{{ error }}
    </p>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="submit"
        :disabled="enviando || !completo"
        class="inline-flex items-center justify-center gap-2 rounded-full bg-brand-lime-500 px-7 py-3.5 !cursor-pointer text-base font-medium text-brand-green-900 transition-all hover:bg-brand-lime-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
      >
        <i v-if="enviando" class="icon-[material-symbols--progress-activity] animate-spin"></i>
        {{ enviando ? 'Enviando…' : 'Solicitar demo' }}
      </button>
    </div>
  </form>
</template>
