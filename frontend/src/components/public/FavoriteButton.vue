<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import { useFavorites } from '@/composables/useFavorites'

const props = defineProps({
  club: { type: [Object, String], required: true },
  // 'overlay' se apoya sobre la foto de una card; 'plain' va sobre fondo claro.
  variant: { type: String, default: 'overlay' },
})

const router = useRouter()
const toast = useToast()
const { isAuthenticated } = useAuth()
const { isFavorite, toggle } = useFavorites()

const saving = ref(false)

const clubId = computed(() =>
  typeof props.club === 'string' ? props.club : props.club?._id,
)
const activo = computed(() => isFavorite(clubId.value))

const onClick = async () => {
  // Sin cuenta no hay dónde guardarlo. Se manda al login con `redirect` para
  // volver a donde estaba en vez de dejarlo en la home.
  if (!isAuthenticated.value) {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }

  saving.value = true
  try {
    const guardado = await toggle(props.club)
    toast.add({
      severity: 'success',
      summary: guardado ? 'Guardado en favoritos' : 'Quitado de favoritos',
      life: 2500,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo guardar',
      detail: error.response?.data?.message || 'Probá de nuevo en un momento.',
      life: 4000,
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <button
    type="button"
    :disabled="saving"
    :aria-pressed="activo"
    :aria-label="activo ? 'Quitar de favoritos' : 'Guardar en favoritos'"
    :title="activo ? 'Quitar de favoritos' : 'Guardar en favoritos'"
    class="flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-60 cursor-pointer"
    :class="
      variant === 'overlay'
        ? 'bg-white/90 shadow-sm backdrop-blur hover:bg-white'
        : 'border border-black/[0.08] bg-white hover:bg-stone-50'
    "
    @click.stop="onClick"
  >
    <i
      class="text-lg transition-colors"
      :class="
        activo
          ? 'icon-[material-symbols--favorite] text-error-500'
          : 'icon-[material-symbols--favorite-outline] text-stone-500'
      "
    ></i>
  </button>
</template>
