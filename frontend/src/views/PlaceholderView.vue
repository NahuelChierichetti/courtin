<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const title = route.meta.title || 'Página'
</script>

<template>
  <div class="flex flex-col items-center justify-center py-24 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
      <i class="pi pi-wrench text-2xl text-slate-400"></i>
    </div>
    <h1 class="mt-4 text-xl font-semibold text-slate-900">{{ title }}</h1>
    <p class="mt-2 text-sm text-slate-500">Esta sección estará disponible próximamente.</p>
  </div>
</template>
