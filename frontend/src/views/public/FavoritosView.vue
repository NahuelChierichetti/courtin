<script setup>
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useFavorites } from '@/composables/useFavorites'
import AccountNav from '@/components/public/AccountNav.vue'
import ClubCard from '@/components/public/ClubCard.vue'

const router = useRouter()
const { clubs, isLoading, isLoaded, load } = useFavorites()

const abrirClub = (club) => {
  router.push({ name: 'public-club', params: { slug: club.slug } })
}

// `force`: al entrar acá se refresca contra el servidor. El Set en memoria puede
// venir de haber tocado corazones en el buscador, y esta vista necesita además
// los datos completos de cada complejo.
onMounted(() => load({ force: true }))
</script>

<template>
  <!--
    `max-w-2xl` es el ancho del área de cuenta: lo comparten Mis reservas, Mi
    cuenta y Notificaciones. Si esta vista usa otro, cambiar de pestaña mueve
    todo el contenido de lugar.
  -->
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-bold text-ink-500">Favoritos</h1>
    <p class="mt-1 text-sm text-stone-500">Los complejos que guardaste para reservar rápido.</p>

    <div class="mt-6">
      <AccountNav />
    </div>

    <!-- Loading -->
    <div v-if="isLoading && !isLoaded" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-400"></i>
      <p class="mt-4 text-sm text-stone-500">Cargando tus favoritos...</p>
    </div>

    <!-- Vacío -->
    <div v-else-if="clubs.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--favorite-outline] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-ink-500">Todavía no guardaste ningún complejo</h3>
      <p class="mt-1 max-w-sm text-sm text-stone-500">
        Tocá el corazón en cualquier complejo y va a aparecer acá para reservar sin buscarlo de nuevo.
      </p>
      <RouterLink
        :to="{ name: 'public-buscar' }"
        class="mt-5 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
      >
        Explorar complejos
      </RouterLink>
    </div>

    <!-- Grilla -->
    <div v-else class="mt-6 grid gap-5 sm:grid-cols-2">
      <ClubCard v-for="club in clubs" :key="club._id" :club="club" @select="abrirClub" />
    </div>
  </div>
</template>
