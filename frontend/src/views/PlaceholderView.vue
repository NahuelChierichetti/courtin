<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const title = route.meta.title || 'Página'
</script>

<template>
  <div class="flex flex-col items-center justify-center py-24 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green-50">
      <i class="icon-[material-symbols--build] text-2xl text-brand-green-500"></i>
    </div>
    <h1 class="mt-4 text-xl font-bold text-brand-green-900">{{ title }}</h1>
    <p class="!mt-2 text-sm text-stone-500">Esta sección estará disponible próximamente.</p>
  </div>
</template>
