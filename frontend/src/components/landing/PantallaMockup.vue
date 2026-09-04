<script setup>
// Una pantalla del producto, apoyada sobre un panel de color como en los
// bloques de aikido.dev.
//
// La captura entra ENTERA: se ve la aplicación como es, con su menú lateral, su
// encabezado y su contenido. Recortada mostraba pedazos sueltos y dejaba de
// parecerse a lo que la persona va a usar.
//
// Las cuatro son de 1456×800, sacadas del panel real (ver public/images/producto).
// Se muestran a poco más de la mitad de ese ancho, así que quedan a densidad
// retina y no se pixelan.
defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true },
  // Ruta que se muestra en la barra. Distingue el panel del complejo de la
  // página pública, que es de lo que habla cada bloque.
  url: { type: String, default: 'courtinapp.com/panel' },
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green-100/70 via-neutral-100 to-brand-lime-100/50 p-6 sm:p-9"
  >
    <!-- La ventana. La sombra va en dos capas: una corta que la apoya contra
         el panel y una larga que la despega. Una sola sombra grande da una
         mancha, no un objeto. -->
    <div
      class="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(18,36,26,0.14),0_2px_10px_-2px_rgba(18,36,26,0.1),0_30px_60px_-28px_rgba(18,36,26,0.4)] ring-1 ring-black/[0.09]"
    >
      <div class="flex items-center gap-2 border-b border-black/[0.06] bg-neutral-50 px-4 py-2.5">
        <span class="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-neutral-300"></span>
        <span
          class="ml-2 hidden truncate rounded-md bg-white px-2.5 py-1 text-[11px] text-neutral-400 ring-1 ring-black/[0.05] sm:block"
        >{{ url }}</span>
      </div>

      <img
        :src="src"
        :alt="alt"
        width="1456"
        height="800"
        loading="lazy"
        decoding="async"
        class="block w-full"
      />
    </div>
  </div>
</template>
