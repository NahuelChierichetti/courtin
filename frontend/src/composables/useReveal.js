// Animación de entrada al hacer scroll, como directiva: `v-reveal`.
//
// Uso:
//   <div v-reveal>…</div>          entra apenas asoma
//   <div v-reveal="120">…</div>    entra 120ms después (para escalonar una lista)
//   <div v-reveal.left>…</div>     entra desde la izquierda en vez de desde abajo
//
// Se hace con estilos en línea y no con clases de Tailwind porque el retardo es
// un número que sale del `v-for`, y una clase construida al vuelo
// (`delay-[${i}00ms]`) no la ve el compilador y no se genera nunca.
//
// El elemento arranca invisible, así que si algo falla queda contenido en blanco.
// Por eso hay dos redes de seguridad: si el navegador no tiene
// IntersectionObserver, o si la persona pidió menos movimiento, la directiva no
// oculta nada y se va sin hacer ruido.

const sinMovimiento = () =>
  typeof window === 'undefined' ||
  !('IntersectionObserver' in window) ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const DESPLAZAMIENTO = {
  up: 'translateY(18px)',
  left: 'translateX(-18px)',
  right: 'translateX(18px)',
  none: 'scale(0.97)',
}

export const vReveal = {
  mounted(el, binding) {
    if (sinMovimiento()) return

    const desde =
      Object.keys(binding.modifiers).find((m) => m in DESPLAZAMIENTO) || 'up'
    const retardo = Number(binding.value) || 0

    el.style.opacity = '0'
    el.style.transform = DESPLAZAMIENTO[desde]
    el.style.transition = `opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) ${retardo}ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) ${retardo}ms`
    el.style.willChange = 'opacity, transform'

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        el.style.opacity = '1'
        el.style.transform = 'none'
        // `willChange` se saca al terminar: dejarlo puesto mantiene una capa de
        // composición por elemento y en una landing larga eso se acumula.
        setTimeout(() => (el.style.willChange = ''), 700 + retardo)
        io.disconnect()
      },
      // El margen negativo abajo hace que la animación arranque cuando el
      // elemento ya entró de verdad, no cuando asoma un píxel.
      { threshold: 0.1, rootMargin: '0px 0px -80px 0px' },
    )

    io.observe(el)
    el.__reveal = io
  },

  unmounted(el) {
    el.__reveal?.disconnect()
  },
}
