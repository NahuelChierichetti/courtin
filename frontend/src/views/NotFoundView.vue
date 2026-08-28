<template>
  <section class="flex min-h-[60vh] items-center justify-center">
    <div class="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200">
      <p class="text-sm font-semibold uppercase tracking-wide text-brand-green-500">404</p>
      <h1 class="!mt-2 text-3xl font-bold text-brand-green-900">Página no encontrada</h1>
      <p class="mt-3 text-stone-600">
        La ruta que intentaste abrir no existe.
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex rounded-full bg-brand-lime-500 px-4 py-2 text-sm font-medium text-brand-green-900 transition hover:bg-brand-lime-600"
      >
        Volver al inicio
      </RouterLink>
    </div>
  </section>
</template>