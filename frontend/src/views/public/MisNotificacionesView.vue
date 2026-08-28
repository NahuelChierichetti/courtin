<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useUserNotifications } from '@/composables/useUserNotifications'
import { dayjs } from '@/utils/datetime'

const { notifications, unreadCount, isLoading, fetch, markRead, markAllRead } =
  useUserNotifications()

// Un ícono y un color por tipo de evento, para poder barrer la lista de un
// vistazo sin leer cada título.
const TIPO_META = {
  confirmacion: {
    icon: 'icon-[material-symbols--check-circle-outline]',
    bg: 'bg-success-50',
    text: 'text-success-600',
  },
  pago: {
    icon: 'icon-[material-symbols--payments-outline]',
    bg: 'bg-brand-green-50',
    text: 'text-brand-green-600',
  },
  cancelacion: {
    icon: 'icon-[material-symbols--cancel-outline]',
    bg: 'bg-error-50',
    text: 'text-error-600',
  },
  recordatorio: {
    icon: 'icon-[material-symbols--alarm-outline]',
    bg: 'bg-warning-50',
    text: 'text-warning-600',
  },
  sistema: {
    icon: 'icon-[material-symbols--info-outline]',
    bg: 'bg-stone-100',
    text: 'text-stone-500',
  },
}

const metaOf = (n) => TIPO_META[n.tipo] || TIPO_META.sistema
const cuandoOf = (n) => dayjs(n.createdAt).fromNow()

onMounted(fetch)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-brand-green-900">Notificaciones</h1>
        <p class="mt-1 text-sm text-stone-500">Novedades de tus reservas y tus complejos.</p>
      </div>
      <button
        v-if="unreadCount > 0"
        class="rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 cursor-pointer"
        @click="markAllRead"
      >
        Marcar todas como leídas
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading && notifications.length === 0"
      class="flex flex-col items-center justify-center py-24 text-center"
    >
      <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-400"></i>
      <p class="mt-4 text-sm text-stone-500">Cargando...</p>
    </div>

    <!-- Vacío -->
    <div
      v-else-if="notifications.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--notifications-outline] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-brand-green-900">No tenés notificaciones</h3>
      <p class="mt-1 max-w-sm text-sm text-stone-500">
        Acá te vamos a avisar cuando se confirme una reserva, se acerque un turno o haya
        novedades de un complejo.
      </p>
      <RouterLink
        :to="{ name: 'public-buscar' }"
        class="mt-5 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
      >
        Buscar canchas
      </RouterLink>
    </div>

    <!-- Lista -->
    <div v-else class="mt-6 space-y-2">
      <article
        v-for="n in notifications"
        :key="n._id"
        class="flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors"
        :class="
          n.leida
            ? 'border-black/[0.06] bg-white'
            : 'border-brand-green-100 bg-brand-green-50/40'
        "
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          :class="[metaOf(n).bg, metaOf(n).text]"
        >
          <i :class="metaOf(n).icon" class="text-base"></i>
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-semibold text-brand-green-900">
              {{ n.titulo }}
              <span
                v-if="!n.leida"
                class="ml-1.5 inline-block h-2 w-2 rounded-full bg-brand-green-500 align-middle"
                aria-label="Sin leer"
              ></span>
            </p>
            <span class="shrink-0 text-xs text-stone-400">{{ cuandoOf(n) }}</span>
          </div>

          <p v-if="n.mensaje" class="mt-1 text-sm leading-relaxed text-stone-600">
            {{ n.mensaje }}
          </p>

          <div class="mt-2 flex flex-wrap items-center gap-3">
            <RouterLink
              v-if="n.reservation"
              :to="{ name: 'mis-reservas' }"
              class="text-xs font-semibold text-brand-green-600 no-underline hover:underline"
            >
              Ver mis reservas
            </RouterLink>
            <RouterLink
              v-if="n.club?.slug"
              :to="{ name: 'public-club', params: { slug: n.club.slug } }"
              class="text-xs font-semibold text-stone-500 no-underline hover:underline"
            >
              {{ n.club.nombre }}
            </RouterLink>
            <button
              v-if="!n.leida"
              class="text-xs font-semibold text-stone-400 transition-colors hover:text-stone-600 cursor-pointer"
              @click="markRead(n._id)"
            >
              Marcar como leída
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
