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
    colorScheme: {
      light: {
        // Neutros cálidos (la escala `stone` de Tailwind, que es la que usa toda
        // la app en sus `text-stone-*`).
        //
        // El neutro de Aura es un gris azulado: al lado del fondo arena se nota
        // enseguida que es de otra paleta, y era lo que hacía que el placeholder
        // de un Select se viera celeste mientras el del input de al lado —puro
        // Tailwind— se veía marrón. Definirlo acá lo arregla en TODOS los
        // componentes de PrimeVue a la vez, en vez de perseguirlos con
        // `!important` de a uno.
        surface: {
          0: '#ffffff',
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
        // Espejo exacto de los inputs de Tailwind de la app:
        //   border  → border-black/[0.08]
        //   texto   → text-ink-500
        //   placeholder → placeholder:text-stone-400
        //   foco    → border-brand-green-400 + ring brand-green-100
        formField: {
          background: '#ffffff',
          // Deshabilitado TAMBIÉN en blanco. El gris de Aura (#fafaf9) es casi
          // idéntico al fondo arena de la app (#f9f9f5): el campo se ve sin
          // caja, como si le faltara el fondo. Que esté deshabilitado ya se
          // entiende por el texto en gris y, sobre todo, porque el placeholder
          // lo dice con todas las letras ("Elegí primero la provincia").
          disabledBackground: '#ffffff',
          borderColor: 'rgba(22, 36, 27, 0.08)',
          hoverBorderColor: 'rgba(22, 36, 27, 0.16)',
          focusBorderColor: '#4d9269',
          color: '#16241b',
          disabledColor: '#a8a29e',
          placeholderColor: '#a8a29e',
          shadow: 'none',
        },
      },
    },
  },
})

export default CourtInPreset
