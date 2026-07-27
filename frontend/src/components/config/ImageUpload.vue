<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import uploadService from '@/services/uploadService'

const props = defineProps({
  modelValue: { type: String, default: '' },
  variant: { type: String, default: 'wide' }, // 'logo' | 'wide' | 'thumb'
  placeholder: { type: String, default: 'Subir imagen' },
})
const emit = defineEmits(['update:modelValue'])

const { currentClubId } = useAuth()
const toast = useToast()

const input = ref(null)
const uploading = ref(false)
const dragOver = ref(false)

const frameClass = computed(() => {
  if (props.variant === 'logo') return 'h-28 w-28'
  if (props.variant === 'thumb') return 'aspect-square w-full'
  return 'h-44 w-full'
})

const pick = () => {
  if (!uploading.value) input.value?.click()
}

const handleFile = async (file) => {
  if (!file) return
  if (!/^image\//.test(file.type)) {
    toast.add({ severity: 'warn', summary: 'Archivo inválido', detail: 'Elegí una imagen.', life: 3000 })
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ severity: 'warn', summary: 'Imagen muy grande', detail: 'Máximo 5 MB.', life: 3000 })
    return
  }
  uploading.value = true
  try {
    const url = await uploadService.uploadImage(currentClubId.value, file)
    emit('update:modelValue', url)
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo subir la imagen.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}

const onChange = (e) => handleFile(e.target.files?.[0])
const onDrop = (e) => {
  dragOver.value = false
  handleFile(e.dataTransfer.files?.[0])
}
const remove = () => emit('update:modelValue', '')
</script>

<template>
  <div>
    <div
      class="group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed bg-stone-50 transition-colors"
      :class="[frameClass, dragOver ? 'border-brand-green-400 bg-brand-green-50' : 'border-black/[0.14] hover:border-brand-green-300']"
      @click="pick"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <img v-if="modelValue" :src="modelValue" alt="" class="h-full w-full object-cover" />
      <div v-else class="flex flex-col items-center gap-1 px-2 text-center text-stone-400">
        <i class="icon-[material-symbols--add-photo-alternate] text-2xl"></i>
        <span class="text-[11px] leading-tight">{{ placeholder }}</span>
      </div>

      <!-- Subiendo -->
      <div v-if="uploading" class="absolute inset-0 flex items-center justify-center bg-white/70">
        <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-brand-green-500"></i>
      </div>

      <!-- Acciones al hover (con imagen) -->
      <div v-else-if="modelValue" class="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <span class="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-stone-700">Cambiar</span>
        <button class="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-error-500 transition-colors hover:bg-white" @click.stop="remove">
          <i class="icon-[material-symbols--delete] text-sm"></i>
        </button>
      </div>
    </div>
    <input ref="input" type="file" accept="image/*" class="hidden" @change="onChange" />
  </div>
</template>
