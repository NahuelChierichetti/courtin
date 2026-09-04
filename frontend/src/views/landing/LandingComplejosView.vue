<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { vReveal } from '@/composables/useReveal'
import CanalesDiagrama from '@/components/landing/CanalesDiagrama.vue'
import GrillaAnimada from '@/components/landing/GrillaAnimada.vue'
import PantallaMockup from '@/components/landing/PantallaMockup.vue'
import PlanPorCanchas from '@/components/landing/PlanPorCanchas.vue'
import PreguntasAbiertas from '@/components/landing/PreguntasAbiertas.vue'
import SenaSimulador from '@/components/landing/SenaSimulador.vue'
import DemoRequestForm from '@/components/landing/DemoRequestForm.vue'
import WhatsappBubble from '@/components/landing/WhatsappBubble.vue'

// Página de venta para dueños de complejo: /complejos.
//
// Es la única pantalla de CourtIn que no le habla al jugador sino a quien paga,
// y por eso no usa `PublicLayout`: ese layout tiene el buscador de canchas en el
// encabezado, que acá sería ruido. Va con su propio encabezado y pie.
//
// Cinco decisiones que la sostienen, para que no se deshagan al editarla:
//
//   1. CAPTURAS REALES, NO MAQUETAS. La versión anterior de esta página dibujaba
//      el producto con divs. Acá van capturas del panel de verdad, completas y
//      sin recortar. Una pantalla dibujada le dice al que evalúa "esto todavía
//      no existe", que es lo contrario de lo que necesitamos que piense.
//
//   2. CERO ETIQUETAS DE SECCIÓN. Nada de rótulos chiquitos arriba de cada
//      título. Ocho rótulos iguales seguidos son la textura que hace que una
//      página se lea escrita a máquina. El título solo alcanza: la sección ya
//      se sabe qué es por dónde está.
//
//   3. UN SOLO ACENTO. Verde para la marca y la estructura, lima para el único
//      botón que importa. El violeta queda para los widgets que ya lo traen
//      (el simulador de seña), no se agrega en la página.
//
//   4. NADA INVENTADO. No hay logos de clientes, ni testimonios, ni "más de X
//      complejos": no los tenemos. La confianza la tiene que dar lo que sí es
//      verificable (0% de comisión, la plata a tu MercadoPago, sin tarjeta,
//      sin permanencia) y el producto mostrado como es.
//
//   5. OTRA TIPOGRAFÍA. La página va en Bricolage Grotesque (clase
//      `.font-landing`) y no en la Poppins de la app. Poppins es una geométrica
//      redondeada: buena para el producto, blanda y genérica para vender.
//
// Formas: botones y chips en píldora (como todo el resto de CourtIn), tarjetas
// en 16px, inputs en 12px. No mezclar otra escala.

const TITULO = 'CourtIn para complejos deportivos: turnos, cobros y caja'
const DESCRIPCION =
  'Dejá de atender el WhatsApp para dar un turno: tus clientes reservan desde tu link y pagan la seña. ' +
  'La grilla, los cobros y la caja del complejo en un solo lugar. Primer mes gratis, sin tarjeta y sin comisión.'

// La página se comparte por WhatsApp y por Instagram, así que el título y la
// descripción son lo primero que ve mucha gente. El router no los maneja, se
// ponen acá y se devuelven al salir para no ensuciar el resto de la app.
let tituloPrevio = ''
let metaCreada = false

onMounted(() => {
  tituloPrevio = document.title
  document.title = TITULO

  let meta = document.querySelector('meta[name="description"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'description')
    document.head.appendChild(meta)
    metaCreada = true
  }
  meta.setAttribute('content', DESCRIPCION)
})

onBeforeUnmount(() => {
  if (tituloPrevio) document.title = tituloPrevio
  if (metaCreada) document.querySelector('meta[name="description"]')?.remove()
})

// --- Contenido --------------------------------------------------------------

const NAV = [
  { href: '#producto', label: 'Producto' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#precios', label: 'Precios' },
  { href: '#preguntas', label: 'Preguntas' },
]


// Los tres bloques de producto, cada uno con su captura del panel real. Van
// alternando de lado; tres es el techo, a la cuarta fila el zigzag se lee como
// plantilla.
const BLOQUES = [
  {
    titulo: 'La grilla no te deja pisar un horario',
    texto:
      'Cada cancha con su columna y cada turno en su lugar. Lo que está ocupado se ve ocupado, y mover un turno es arrastrarlo.',
    puntos: ['Vista por día', 'Vista por semana', 'Filtro por cancha', 'Turnos fijos', 'Arrastrar para mover'],
    enlace: 'Ver la grilla en una demo',
    img: '/images/producto/turnos.webp',
    alt: 'Grilla del día: cuatro canchas en columnas, cada turno con su horario, el nombre de quien reservó y el monto.',
    url: 'courtinapp.com/panel/turnos',
  },
  {
    titulo: 'Una caja que siempre cierra',
    texto:
      'Cada cobro y cada gasto queda registrado con fecha, método y responsable. Lo que se paga online entra sin que nadie lo anote.',
    puntos: ['Ingresos y egresos', 'Balance neto', 'Por categoría', 'Por método de pago', 'Detalle movimiento a movimiento'],
    enlace: 'Ver cómo cierra la caja',
    img: '/images/producto/caja.webp',
    alt: 'Control de caja con ingresos, egresos, balance y el detalle de cada movimiento.',
    url: 'courtinapp.com/panel/caja',
  },
  {
    titulo: 'Los números del mes, sin planilla',
    texto:
      'Ingresos, reservas, ocupación y ticket promedio. Sin cargar nada por fuera: sale de los turnos que ya tenés.',
    puntos: ['Ingresos', 'Ocupación', 'Ticket promedio', 'Por deporte', 'Exportar a CSV o PDF'],
    enlace: 'Ver los reportes en vivo',
    img: '/images/producto/reportes.webp',
    alt: 'Reportes con el filtro por deporte, el rango de fechas y las métricas de ingresos, reservas, ocupación y ticket promedio.',
    url: 'courtinapp.com/panel/reportes',
  },
]

const PASOS = [
  {
    verbo: 'Compartís tu link',
    texto:
      'Cada complejo tiene su propia página. La pegás en tu Instagram, en el estado de WhatsApp o en Google.',
    icon: 'icon-[material-symbols--link]',
  },
  {
    verbo: 'Elige día, cancha y horario',
    texto:
      'Ve la disponibilidad real de tus canchas. No descarga ninguna app: entra desde el teléfono y reserva.',
    icon: 'icon-[material-symbols--touch-app-outline]',
  },
  {
    verbo: 'Paga la seña',
    texto:
      'Con MercadoPago. El turno le queda bloqueado 15 minutos: si no paga, se libera solo y vuelve a estar disponible.',
    icon: 'icon-[material-symbols--payments-outline]',
  },
  {
    verbo: 'Aparece en tu grilla',
    texto:
      'El turno entra cargado, con el nombre y el pago hecho, y el ingreso queda registrado en tu caja.',
    icon: 'icon-[material-symbols--calendar-month-outline]',
  },
]

const PERSONAS = [
  {
    titulo: 'Para vos, que llevás el complejo',
    icon: 'icon-[material-symbols--person-outline]',
    puntos: [
      'La grilla del día completa, cancha por cancha',
      'Cuánto entró este mes, sin abrir una planilla',
      'Los turnos fijos semanales ya cargados',
      'El link tomando reservas mientras dormís',
    ],
  },
  {
    titulo: 'Para el que atiende el mostrador',
    icon: 'icon-[material-symbols--storefront-outline]',
    puntos: [
      'Se toca un hueco y se carga el turno',
      'Se arrastra el turno para cambiarlo de hora',
      'Su propio usuario, así sabés quién cargó qué',
      'Funciona igual desde el celular',
    ],
  },
  {
    titulo: 'Para el que quiere jugar',
    icon: 'icon-[material-symbols--sports-tennis-outline]',
    puntos: [
      'Entra a tu link y no descarga nada',
      'Ve los horarios que están libres de verdad',
      'Paga la seña y le queda el turno',
      'Le llega el email con su reserva',
    ],
  },
]
</script>

<template>
  <!-- `overflow-x-clip` y no `-hidden`: las entradas laterales de `v-reveal`
       arrancan 18px corridas y en celular eso alcanza para que la página se
       mueva de costado. `clip` las recorta sin romper el `sticky` del
       encabezado, que `hidden` en un ancestro sí rompe. -->
  <div class="font-landing relative min-h-screen overflow-x-clip bg-white">
    <!-- ---------- Encabezado -------------------------------------------- -->
    <!-- Fuera de `PublicLayout` a propósito: ese layout le habla al jugador y
         trae el buscador de canchas, que acá sería ruido. -->
    <header class="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 backdrop-blur">
      <div class="mx-auto flex h-[68px] w-full max-w-6xl items-center gap-8 px-4">
        <RouterLink to="/complejos" class="flex shrink-0 items-center gap-2.5 no-underline">
          <!-- Siempre `logo-lime.svg`. Es el único archivo del logo que está en
               la paleta de CourtIn: `logo-blancosvg.svg` trae el pin en naranja
               (#f95c03), que no es un color de la marca. -->
          <img src="/images/logo-lime.svg" alt="CourtIn" class="h-9 w-auto" />
          <span class="text-lg tracking-tight text-brand-green-900">
            Court<span class="text-brand-lime-500">in</span>
          </span>
        </RouterLink>

        <!-- El subrayado crece desde la izquierda en vez de aparecer entero:
             sigue la dirección de lectura y no mueve nada de lugar, así que el
             encabezado no tiembla al pasar el mouse. -->
        <nav class="hidden items-center gap-7 md:flex">
          <a
            v-for="n in NAV"
            :key="n.href"
            :href="n.href"
            class="group relative py-1 text-sm text-neutral-600 no-underline transition-colors hover:text-brand-green-900"
          >
            {{ n.label }}
            <span
              class="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-brand-green-500 transition-transform duration-200 ease-out group-hover:scale-x-100"
              aria-hidden="true"
            ></span>
          </a>
        </nav>

        <div class="ml-auto flex shrink-0 items-center gap-4">
          <RouterLink
            to="/panel/login"
            class="hidden text-sm text-neutral-600 no-underline transition-colors hover:text-brand-green-900 sm:block"
          >
            Ingresar
          </RouterLink>
          <RouterLink
            to="/panel/registro"
            class="rounded-full bg-brand-lime-500 px-4 py-2 text-sm font-medium text-brand-green-900 no-underline transition duration-150 hover:bg-brand-lime-600 motion-safe:active:scale-[0.98]"
          >
            Probar gratis
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- ---------- Hero ---------------------------------------------------- -->
    <!-- La grilla que se reserva sola es todo el fondo del bloque. No lleva
         además otra textura: serían dos peleándose. -->
    <section
      id="producto"
      class="relative flex min-h-[36rem] scroll-mt-20 items-center overflow-hidden px-4 py-16 lg:min-h-[40rem]"
    >
      <GrillaAnimada />

      <div class="relative mx-auto w-full max-w-3xl text-center">
        <h1
          v-reveal
          class="text-4xl leading-[1.08] font-semibold tracking-tight text-balance text-brand-green-900 sm:text-5xl lg:text-[3.4rem]"
        >
          Dejá de atender el WhatsApp para dar un turno.
        </h1>

        <p v-reveal="90" class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-neutral-600">
          Tus clientes eligen día, cancha y horario en tu link, pagan la seña y el turno entra solo
          a tu grilla.
        </p>

        <div v-reveal="170" class="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <RouterLink
            to="/panel/registro"
            class="rounded-full bg-brand-lime-500 px-7 py-3.5 text-center text-base font-medium text-brand-green-900 no-underline transition duration-150 hover:bg-brand-lime-600 motion-safe:active:scale-[0.98]"
          >
            Probar gratis 1 mes
          </RouterLink>
          <a
            href="#agendar"
            class="rounded-full border border-black/[0.12] bg-white px-7 py-3.5 text-center text-base font-medium text-brand-green-900 no-underline transition duration-150 hover:border-black/20 hover:bg-neutral-100 motion-safe:active:scale-[0.98]"
          >
            Agendar una demo
          </a>
        </div>

        <p v-reveal="240" class="mt-5 text-sm text-neutral-500">
          Sin tarjeta. Sin instalar nada. Sin permanencia.
        </p>
      </div>
    </section>

    <!-- ---------- Qué hace ------------------------------------------------ -->
    <section class="px-4 py-24">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="max-w-2xl">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Todo lo del complejo, en la misma pantalla
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600">
            Los turnos, la plata del día y los clientes dejan de estar en el cuaderno, en el
            WhatsApp y en la cabeza de una sola persona.
          </p>
        </div>

        <!-- Bloques de producto. Sin tarjetas: el texto va suelto sobre el
             fondo de la sección y la única caja de la fila es la pantalla. Una
             tarjeta alrededor del texto lo pone al mismo nivel visual que la
             captura, y acá la captura es la que tiene que ganar. -->
        <div class="mt-16 space-y-20 lg:space-y-28">
          <!-- Las pistas se invierten junto con el orden. `order` cambia dónde
               se ve un item, no en qué pista cae: dejando siempre 5fr+7fr, la
               fila invertida metía la captura en la columna angosta y esa
               pantalla salía más chica que las otras dos. -->
          <div
            v-for="(b, i) in BLOQUES"
            :key="b.titulo"
            class="grid items-center gap-10 lg:gap-14"
            :class="
              i % 2 === 1
                ? 'lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]'
                : 'lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'
            "
          >
            <!-- Se alternan los lados. En celular el orden del DOM manda y el
                 texto va siempre primero, que es como se lee. -->
            <div v-reveal.left :class="i % 2 === 1 ? 'lg:order-2' : 'lg:order-1'">
              <h3 class="text-2xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-[1.75rem]">
                {{ b.titulo }}
              </h3>
              <p class="mt-4 max-w-lg text-[17px] leading-relaxed text-neutral-600">{{ b.texto }}</p>

              <!-- Fichas y no viñetas con tilde: son las capacidades del
                   módulo, se recorren de un vistazo y no piden leerse en
                   orden. Es el mismo recurso de los bloques de aikido.dev.
                   Entran de a una, que es como se leen. -->
              <ul class="mt-7 flex flex-wrap gap-2">
                <li
                  v-for="(t, j) in b.puntos"
                  :key="t"
                  v-reveal="140 + j * 70"
                  class="rounded-lg border border-black/[0.09] bg-white px-3.5 py-2 text-sm text-neutral-700 shadow-[0_1px_2px_rgba(18,36,26,0.04)]"
                >
                  {{ t }}
                </li>
              </ul>

              <a
                v-reveal="360"
                href="#agendar"
                class="group/link mt-8 inline-flex items-center gap-2 text-base font-medium text-brand-green-700 no-underline transition-colors hover:text-brand-green-900"
              >
                {{ b.enlace }}
                <i
                  class="icon-[material-symbols--arrow-forward] text-lg transition-transform duration-200 ease-out group-hover/link:translate-x-1"
                ></i>
              </a>
            </div>

            <!-- Las dos clases de orden van en el mismo binding y no una en
                 `class` y otra en `:class`: Vue las mezcla en vez de pisarlas,
                 y con `lg:order-1 lg:order-2` juntas gana la que esté más
                 abajo en la hoja, no la que corresponda. -->
            <div v-reveal="80" :class="i % 2 === 1 ? 'lg:order-1' : 'lg:order-2'">
              <PantallaMockup :src="b.img" :alt="b.alt" :url="b.url" />
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ---------- Cómo funciona ------------------------------------------- -->
    <section id="como-funciona" class="scroll-mt-20 border-t border-black/[0.06] bg-neutral-100 px-4 py-24">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="max-w-2xl">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            De tu link al turno cobrado
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600">
            Hoy cada turno pasa por vos: te preguntan, mirás, respondés, anotás y después cobrás.
            Así queda el recorrido con CourtIn.
          </p>
        </div>

        <ol class="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          <li
            v-for="(p, i) in PASOS"
            :key="p.verbo"
            v-reveal="i * 80"
            class="relative"
          >
            <!-- La línea que une los pasos vive en cada uno y se apaga en el
                 último: dibujarla como un elemento aparte obliga a adivinar la
                 altura de la columna más alta. -->
            <span
              v-if="i < PASOS.length - 1"
              class="absolute top-5 left-12 hidden h-px w-[calc(100%-1rem)] bg-black/[0.12] lg:block"
              aria-hidden="true"
            ></span>

            <span
              class="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.07] bg-white text-brand-green-600"
            >
              <i :class="p.icon" class="text-xl"></i>
            </span>
            <h3 class="mt-5 text-base font-medium text-brand-green-900">{{ p.verbo }}</h3>
            <p class="mt-2 text-[15px] leading-relaxed text-neutral-600">{{ p.texto }}</p>
          </li>
        </ol>

        <!-- La única captura de la página pública: es lo que ve el cliente, no
             el panel, y por eso la barra muestra la dirección del complejo. -->
        <div class="mt-20 grid items-center gap-10 lg:mt-24 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
          <div v-reveal.left>
            <h3 class="text-2xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-[1.75rem]">
              Tu página, con tus canchas y tus precios
            </h3>
            <p class="mt-4 max-w-lg text-[17px] leading-relaxed text-neutral-600">
              El link lo elegís vos y la página va con tus fotos, tus horarios de atención y lo
              que cobrás por cada cancha. Los horarios que se ven libres están libres de verdad.
            </p>
            <p
              class="mt-7 inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-black/[0.09] bg-white px-4 py-2.5"
            >
              <i class="icon-[material-symbols--lock-outline] shrink-0 text-sm text-neutral-400"></i>
              <span class="truncate text-sm text-neutral-600">
                courtinapp.com/club/<span class="font-medium text-brand-green-900">tu-complejo</span>
              </span>
            </p>
          </div>

          <div v-reveal="80">
            <PantallaMockup
              src="/images/producto/link-reserva.webp"
              alt="Página pública del complejo: se elige la cancha y se ve qué horarios quedan libres."
              url="courtinapp.com/club/tu-complejo"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ---------- Canales ---------------------------------------------- -->
    <section class="border-t border-black/[0.06] px-4 py-24">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="max-w-2xl">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Cinco lugares distintos, un solo lugar
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600">
            Hoy te reservan por WhatsApp, por Instagram, por teléfono y en el mostrador, y después
            vos juntás todo eso a mano. Entre por donde entre, el turno termina en la misma grilla
            y la plata en la misma caja.
          </p>
        </div>

        <div v-reveal="80" class="mt-12">
          <CanalesDiagrama />
        </div>
      </div>
    </section>

    <!-- ---------- Seña ----------------------------------------------------- -->
    <!-- <section class="px-4 py-24">
      <div class="mx-auto grid w-full max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16">
        <div v-reveal.left>
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Cobrá la seña antes de que lleguen
          </h2>
          <p class="mt-4 max-w-lg text-lg leading-relaxed text-neutral-600">
            El que no vino y no avisó te costó un turno vacío. Con la seña cobrada, o viene o al
            menos no perdiste el día.
          </p>
          <p class="mt-4 max-w-lg text-[15px] leading-relaxed text-neutral-600">
            Vos decidís si cobrás el turno completo o una parte, y si esa parte es un porcentaje o
            un monto fijo. Y si preferís cobrar en el mostrador, el pago al llegar sigue estando:
            lo dejás prendido y listo.
          </p>

          <dl class="mt-9 grid gap-x-8 gap-y-6 border-t border-black/[0.08] pt-7 sm:grid-cols-2">
            <div>
              <dt class="text-base font-medium text-brand-green-900">La plata es tuya</dt>
              <dd class="mt-1.5 text-[15px] leading-relaxed text-neutral-600">
                Va directo a tu cuenta de MercadoPago. Nosotros nunca la tocamos.
              </dd>
            </div>
            <div>
              <dt class="text-base font-medium text-brand-green-900">El turno se guarda mientras paga</dt>
              <dd class="mt-1.5 text-[15px] leading-relaxed text-neutral-600">
                Le queda bloqueado 15 minutos. Si no paga, se libera solo.
              </dd>
            </div>
          </dl>
        </div>

        <div v-reveal.right="120">
          <SenaSimulador />
        </div>
      </div>
    </section> -->

    <!-- ---------- Para quién ---------------------------------------------- -->
    <!-- Tres columnas separadas por filetes y sin tarjetas: es una lectura
         comparada, no tres productos distintos. -->
    <section class="px-4 py-24">
      <div class="mx-auto w-full max-w-6xl">
        <h2 v-reveal class="max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
          Lo usa el complejo entero, no una sola persona
        </h2>

        <div class="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-0">
          <div
            v-for="(p, i) in PERSONAS"
            :key="p.titulo"
            v-reveal="i * 90"
            :class="[
              'lg:px-9',
              i === 0 ? 'lg:pl-0' : 'lg:border-l lg:border-black/[0.08]',
              i === PERSONAS.length - 1 ? 'lg:pr-0' : '',
            ]"
          >
            <span
              class="flex h-10 w-10 items-center justify-center rounded-full border border-brand-green-200 text-brand-green-600"
            >
              <i :class="p.icon" class="text-xl"></i>
            </span>
            <h3 class="mt-5 text-lg font-medium text-brand-green-900">{{ p.titulo }}</h3>
            <ul class="mt-4 space-y-3">
              <li
                v-for="(t, j) in p.puntos"
                :key="t"
                v-reveal="i * 90 + 140 + j * 70"
                class="flex items-start gap-2.5 text-[15px] leading-relaxed text-neutral-600"
              >
                <i class="icon-[material-symbols--check] mt-1 shrink-0 text-base text-brand-green-500"></i>
                {{ t }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ---------- Precios --------------------------------------------------- -->
    <section id="precios" class="scroll-mt-20 border-y border-black/[0.06] bg-neutral-100 px-4 py-24">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="max-w-2xl">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Un abono fijo, sin comisión por reserva
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600">
            El precio lo define una sola cosa: cuántas canchas tenés. Nada más.
          </p>
        </div>

        <div v-reveal="80" class="mt-11">
          <PlanPorCanchas />
        </div>
      </div>
    </section>

    <!-- ---------- Preguntas -------------------------------------------------- -->
    <section id="preguntas" class="scroll-mt-20 px-4 py-24">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="max-w-2xl">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Lo que todos preguntan antes de decidirse
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600">
            ¿Te quedó otra duda?
            <a
              href="mailto:courtinapp@gmail.com"
              class="font-medium text-brand-green-600 underline underline-offset-4 transition-colors hover:text-brand-green-700"
            >Escribinos</a>
            y te la sacamos.
          </p>
        </div>

        <div v-reveal="80" class="mt-12">
          <PreguntasAbiertas />
        </div>
      </div>
    </section>

    <!-- ---------- Agendar demo ----------------------------------------------- -->
    <section id="agendar" class="scroll-mt-20 border-t border-black/[0.06] bg-neutral-100 px-4 py-24">
      <div class="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-16">
        <div v-reveal.left>
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Te lo mostramos funcionando
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-neutral-600">
            Una llamada de 20 minutos con el sistema andando: la grilla de turnos, la caja del día
            y el link público. Hacemos una reserva de punta a punta y vos preguntás lo que quieras
            sobre tu caso.
          </p>
        </div>

        <div v-reveal="80">
          <DemoRequestForm />
        </div>
      </div>
    </section>

    <!-- ---------- Cierre y pie ----------------------------------------------- -->
    <!-- El único bloque oscuro de la página, y va al final pegado al pie para
         que se lea como el fondo del sitio y no como una sección invertida en
         el medio del scroll. -->
    <footer class="textura-grano relative bg-brand-green-900 px-4 pt-24 pb-10">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="max-w-2xl">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl">
            Probalo con tus canchas
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-white/70">
            Un mes gratis, con todas las funciones y sin tarjeta. Cargás tus canchas y tus
            horarios, y ya tenés tu link para empezar a compartir.
          </p>

          <div class="mt-9 flex flex-col gap-3 sm:flex-row">
            <RouterLink
              to="/panel/registro"
              class="rounded-full bg-brand-lime-500 px-7 py-3.5 text-center text-base font-medium text-brand-green-900 no-underline transition duration-150 hover:bg-brand-lime-600 motion-safe:active:scale-[0.98]"
            >
              Probar gratis 1 mes
            </RouterLink>
            <a
              href="#agendar"
              class="rounded-full border border-white/25 px-7 py-3.5 text-center text-base font-medium text-white no-underline transition duration-150 hover:bg-white/10 motion-safe:active:scale-[0.98]"
            >
              Agendar una demo
            </a>
          </div>
        </div>

        <div
          class="mt-20 flex flex-col gap-6 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2.5">
            <img src="/images/logo-lime.svg" alt="" class="h-8 w-auto" />
            <span class="text-sm font-medium text-white">
              Court<span class="text-brand-lime-500">In</span>
            </span>
          </div>

          <nav class="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
            <a href="#precios" class="text-white/60 no-underline transition-colors hover:text-white">Precios</a>
            <a href="#agendar" class="text-white/60 no-underline transition-colors hover:text-white">Agendar una demo</a>
            <a
              href="mailto:courtinapp@gmail.com"
              class="text-white/60 no-underline transition-colors hover:text-white"
            >courtinapp@gmail.com</a>
            <RouterLink to="/" class="text-white/60 no-underline transition-colors hover:text-white">Buscar canchas</RouterLink>
            <RouterLink to="/panel/login" class="text-white/60 no-underline transition-colors hover:text-white">Ingresar</RouterLink>
          </nav>

          <p class="text-xs text-white/40">© {{ new Date().getFullYear() }} CourtIn</p>
        </div>
      </div>
    </footer>

    <WhatsappBubble />
  </div>
</template>
