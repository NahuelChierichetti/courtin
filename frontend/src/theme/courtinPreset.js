import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// El primario de PrimeVue es el verde de marca (#347048). El amarillo (#B9CF32)
// y el violeta (#926699) se aplican a mano en los botones según jerarquía.
const CourtInPreset = definePreset(Aura, {
  primitive: {
    brandGreen: {
      50: '#eef6f1',
      100: '#d7ebde',
      200: '#b0d6bf',
      300: '#7fb997',
      400: '#4d9269',
      500: '#347048',
      600: '#2a5b3a',
      700: '#22492f',
      800: '#1b3a26',
      900: '#12281a',
      950: '#0a170f',
    },
  },
  semantic: {
    primary: {
      50: '{brandGreen.50}',
      100: '{brandGreen.100}',
      200: '{brandGreen.200}',
      300: '{brandGreen.300}',
      400: '{brandGreen.400}',
      500: '{brandGreen.500}',
      600: '{brandGreen.600}',
      700: '{brandGreen.700}',
      800: '{brandGreen.800}',
      900: '{brandGreen.900}',
      950: '{brandGreen.950}',
    },
  },
})

export default CourtInPreset
