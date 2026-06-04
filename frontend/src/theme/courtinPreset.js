import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const CourtInPreset = definePreset(Aura, {
  primitive: {
    orange: {
      50: '#fff6ed',
      100: '#ffecd6',
      200: '#ffd3ad',
      300: '#ffb375',
      400: '#ff8b33',
      500: '#ff6a00',
      600: '#db5800',
      700: '#b54800',
      800: '#963b00',
      900: '#7a3000',
      950: '#4d1d00',
    },
  },
  semantic: {
    primary: {
      50: '{orange.50}',
      100: '{orange.100}',
      200: '{orange.200}',
      300: '{orange.300}',
      400: '{orange.400}',
      500: '{orange.500}',
      600: '{orange.600}',
      700: '{orange.700}',
      800: '{orange.800}',
      900: '{orange.900}',
      950: '{orange.950}',
    },
  },
})

export default CourtInPreset