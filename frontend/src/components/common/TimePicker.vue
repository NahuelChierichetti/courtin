<script setup>
import { computed } from 'vue'
import DatePicker from 'primevue/datepicker'

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

// Convierte entre el string "HH:MM" (contrato del v-model) y el Date que usa DatePicker.
// Sólo importan horas/minutos; la conversión a UTC la hace el backend.
const dateValue = computed({
  get() {
    if (!props.modelValue) return null
    const [h, m] = props.modelValue.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return null
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d
  },
  set(d) {
    if (!d) {
      emit('update:modelValue', '')
      return
    }
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    emit('update:modelValue', `${hh}:${mm}`)
  },
})
</script>

<template>
  <DatePicker
    v-model="dateValue"
    time-only
    hour-format="24"
    :step-minute="30"
    show-icon
    icon-display="input"
    :disabled="disabled"
    fluid
    :pt="{ pcInputText: { root: 'text-sm' } }"
  />
</template>
