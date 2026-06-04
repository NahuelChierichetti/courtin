<template>
  <section class="flex min-h-[60vh] items-center justify-center">
    <div class="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <p class="text-sm font-semibold uppercase tracking-wide text-blue-600">404</p>
      <h1 class="mt-2 text-3xl font-bold text-slate-900">Página no encontrada</h1>
      <p class="mt-3 text-slate-600">
        La ruta que intentaste abrir no existe.
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Volver al inicio
      </RouterLink>
    </div>
  </section>
</template>