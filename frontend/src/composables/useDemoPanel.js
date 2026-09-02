// Estado y guión de la demo interactiva de la landing (`/complejos`).
//
// La demo NO habla con el backend: todo vive en memoria y se descarta al salir.
// Eso es deliberado — la landing es pública y anónima, así que no puede haber
// ni una llamada autenticada; y si el visitante rompe algo, se arregla
// recargando.
//
// Lo que sí es real es la UI: el panel monta los mismos componentes que usa el
// backoffice (`ReservationCalendar`, `AreaLineChart`, `DonutChart`) con estos
// datos falsos. Por eso el día que se mejora el calendario, la demo mejora
// sola, y nunca muestra una pantalla que el producto ya no tiene.

import { computed, onUnmounted, ref } from 'vue'
import { sportHex } from '@/utils/sports'
import { minutesToTime, reservationLabel } from '@/utils/turnos'

// --- Geometría (espejo de ReservationCalendar) -----------------------------
// El calendario dibuja una hora cada 64px arrancando en `dayStartMin`, con un
// canal de horas de 64px a la izquierda. La demo necesita esos números para
// ubicar el punto pulsante encima de un hueco concreto de la grilla.
export const HOUR_HEIGHT = 64
export const GUTTER_WIDTH = 64

// La grilla arranca a las 18:00 a propósito: son 6 horas (384px) que entran
// enteras sin scroll, así el punto pulsante nunca queda fuera de vista. Y es el
// horario que le importa a un complejo — el prime time es la tarde-noche.
export const DAY_START_MIN = 18 * 60
export const DAY_END_MIN = 24 * 60

// Día y hora congelados. Se fija un viernes para que el guión (la grilla llena,
// los números del reporte) sea siempre el mismo, y las 19:40 para que se vea la
// línea de "ahora": un turno ya terminado en gris, otro en curso y el resto por
// venir. Esa mezcla es lo que hace que la grilla parezca viva.
export const DEMO_DATE_KEY = '2026-03-13'
export const DEMO_NOW_MIN = 19 * 60 + 40

const yFor = (min) => ((min - DAY_START_MIN) / 60) * HOUR_HEIGHT

// --- Datos base -------------------------------------------------------------

// `estado` y no un booleano: es el mismo campo que usa el modelo `Court`, y así
// las tarjetas de la demo se pintan con la misma condición que las del panel.
const COURTS = [
  { _id: 'c1', nombre: 'Pádel 1', tipo: 'padel', superficie: 'Cristal (Blindex)', cubierta: true, precio: 22000, estado: 'activa' },
  { _id: 'c2', nombre: 'Pádel 2', tipo: 'padel', superficie: 'Muro de cemento', cubierta: false, precio: 18000, estado: 'activa' },
  { _id: 'c3', nombre: 'Fútbol 5', tipo: 'futbol', superficie: 'Césped sintético', cubierta: false, jugadores: 5, precio: 30000, estado: 'activa' },
]

// Turnos del día. La forma es la que espera el calendario ya "enriquecida"
// (columnKey / startMin / endMin / _fechaKey), o sea lo que en el panel real
// sale de `calendarItems`.
const turno = (id, columnKey, hIni, mIni, dur, nombre, precio, estado = 'confirmada') => {
  const startMin = hIni * 60 + mIni
  return {
    _id: id,
    columnKey,
    _fechaKey: DEMO_DATE_KEY,
    startMin,
    endMin: startMin + dur,
    tipo: COURTS.find((c) => c._id === columnKey)?.tipo,
    estado,
    precioFinal: precio,
    guestName: nombre,
  }
}

const RESERVAS_INICIALES = () => [
  // Ya terminado: el calendario lo pinta gris como "completada".
  turno('r1', 'c1', 18, 0, 90, 'Laura Giménez', 33000),
  // El que se arrastra en el paso 2.
  turno('r2', 'c1', 20, 0, 90, 'Martín Suárez', 33000),
  // En curso a las 19:40.
  turno('r3', 'c2', 19, 0, 90, 'Diego Paz', 27000, 'pendiente'),
  turno('r4', 'c2', 22, 0, 90, 'Flor Aguirre', 27000),
  turno('r5', 'c3', 19, 0, 60, 'Julián Rossi', 30000),
  turno('r6', 'c3', 22, 0, 60, 'Pablo Medina', 30000),
]

// El hueco que se rellena en el paso 1: Fútbol 5 a las 20:30, entre los turnos
// de Julián y Pablo. Está en el medio de la grilla, que es donde mejor se ve.
const SLOT_NUEVO = { columnKey: 'c3', startMin: 20 * 60 + 30, duracion: 60 }

// Las que ofrece el cajón de alta. Viven acá y no en la vista porque la
// validación de solapamiento necesita saber cuáles hay que evaluar.
const DURACIONES = [60, 90, 120]
const CLIENTE_NUEVO = 'Nicolás Ferrari'

// El destino del arrastre del paso 2: de Pádel 1 a las 20:00 a Pádel 2 a las
// 20:30. Cambia de cancha Y de horario, que es justo lo que un dueño necesita
// hacer cuando le piden mover un turno.
const MOVIMIENTO = { reservaId: 'r2', columnKey: 'c2', startMin: 20 * 60 + 30 }

// La cancha que el paso 4 propone editar. La demo la resalta y es también la que
// abre sola si el visitante no hace nada: si fueran distintas, el guión estaría
// señalando una tarjeta y abriendo otra.
const CANCHA_PASO = 'c2'

// --- Guión ------------------------------------------------------------------

const IDLE_MS = 9000 // si el visitante no toca nada, el paso se hace solo

const PASOS = [
  {
    id: 'crear',
    tab: 'turnos',
    titulo: 'Cargá un turno',
    hint: 'Tocá el hueco libre de las 20:30 en Fútbol 5.',
    logro: 'Turno cargado. Eso es todo: dos toques y ya está en la grilla.',
  },
  {
    id: 'mover',
    tab: 'turnos',
    titulo: 'Movelo de lugar',
    hint: 'Te llaman para cambiarlo: arrastrá el turno de Martín a Pádel 2.',
    // Con el dedo no se arrastra: el gesto vertical sobre la grilla es el
    // scroll, así que en el panel real el calendario no lo toma como arrastre
    // (ver `ReservationCalendar`). En táctil el mismo movimiento son dos toques.
    hintTouch: 'Te llaman para cambiarlo: tocá el turno de Martín y después el hueco de Pádel 2.',
    logro: 'Turno movido. Sin borrar y volver a cargar, sin llamar a nadie.',
  },
  {
    id: 'reportes',
    tab: 'reportes',
    titulo: 'Mirá tus números',
    hint: 'Entrá a Reportes en el menú de la izquierda.',
    logro: 'Cuánto facturaste, qué cancha rinde y a qué hora. Sin planilla.',
  },
  {
    id: 'canchas',
    tab: 'canchas',
    titulo: 'Manejá tus canchas',
    hint: 'Entrá a Canchas, editá una y desactivala.',
    logro: 'La cancha deja de ofrecerse sola, también en tu link de reservas.',
  },
]

export { PASOS, COURTS, SLOT_NUEVO, MOVIMIENTO, CANCHA_PASO, DURACIONES, yFor }

// --- Composable -------------------------------------------------------------

export function useDemoPanel() {
  const courts = ref(COURTS.map((c) => ({ ...c })))
  const reservations = ref(RESERVAS_INICIALES())
  const tab = ref('turnos')
  const stepIndex = ref(0)
  const finished = ref(false)
  // La demo no arranca sola: espera a que aprieten "Iniciar" (o a que toquen el
  // panel). Antes arrancaba al entrar en pantalla, y el guión terminaba
  // corriendo abajo de alguien que ya se había ido scrolleando a otra sección.
  const started = ref(false)
  const toast = ref(null)
  // Borrador del turno nuevo mientras el cajón de la derecha está abierto.
  const draft = ref(null)

  const step = computed(() => (finished.value ? null : PASOS[stepIndex.value]))
  const stepId = computed(() => step.value?.id ?? null)

  // --- Timers -------------------------------------------------------------
  // Se centralizan para poder limpiarlos todos al desmontar: la demo vive en
  // una landing y el visitante scrollea rápido.
  let idleTimer = null
  let toastTimer = null
  let chainTimer = null

  const clearIdle = () => {
    clearTimeout(idleTimer)
    idleTimer = null
  }

  const clearAll = () => {
    clearIdle()
    clearTimeout(toastTimer)
    clearTimeout(chainTimer)
  }

  onUnmounted(clearAll)

  // `tono` separa el aviso de "salió bien" del de "no se puede". El segundo
  // existe desde que la demo valida solapamientos: sin un rojo que lo distinga,
  // un rechazo se leía igual que un logro.
  const showToast = (msg, tono = 'ok') => {
    toast.value = { msg, tono }
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = null), 3200)
  }

  // --- Solapamientos --------------------------------------------------------
  //
  // La landing promete, dos secciones más abajo, que "la grilla no te deja
  // pisar un horario". Si la demo dejara encimar dos turnos, el visitante
  // comprobaría lo contrario justo en la pantalla que tiene que convencerlo.
  // El backend real lo garantiza con un índice único parcial sobre Reservation;
  // acá se reproduce la misma regla en memoria.
  const chocaCon = (columnKey, startMin, endMin, ignorarId = null) =>
    reservations.value.find(
      (r) =>
        r._id !== ignorarId &&
        r.columnKey === columnKey &&
        r.estado !== 'cancelada' &&
        // Dos rangos se solapan si cada uno arranca antes de que termine el
        // otro. Tocarse en el borde (una termina 20:00 y la otra empieza 20:00)
        // no es solapar.
        startMin < r.endMin &&
        endMin > r.startMin,
    )

  // --- Avance del guión ----------------------------------------------------

  // Arranca el reloj de inactividad del paso actual. Si el visitante no hace
  // nada, el paso se ejecuta solo: una demo que se queda congelada esperando un
  // click que nunca llega no convence a nadie.
  const armIdle = () => {
    clearIdle()
    if (finished.value) return
    // Armar el reloj ES encender la demo: acá se marca `started` para que
    // también cuente como encendida la que arrancó porque el visitante tocó el
    // panel por su cuenta, sin apretar "Iniciar".
    started.value = true
    idleTimer = setTimeout(runCurrentStep, IDLE_MS)
  }

  const advance = () => {
    if (stepIndex.value >= PASOS.length - 1) {
      finished.value = true
      clearIdle()
      return
    }
    stepIndex.value += 1
    // Avanzar NO cambia de pantalla: el paso nuevo pide ir a otra sección y el
    // visitante tiene que poder ver dónde está antes de que se la muevan. Si
    // acá se saltara solo, "mirá tus números" pasaría de largo sin que se
    // llegue a ver un número.
    armIdle()
  }

  // Completa el paso `id` sólo si es el que está corriendo. Así una acción que
  // el visitante haga por su cuenta (mover un turno durante el paso 1, por
  // ejemplo) no saltea pasos del guión.
  const complete = (id) => {
    if (stepId.value !== id) return
    showToast(step.value.logro)
    advance()
  }

  // --- Acciones ------------------------------------------------------------

  const openDraft = ({ columnKey, startMin }) => {
    clearIdle()
    const court = courts.value.find((c) => c._id === columnKey)
    draft.value = {
      columnKey,
      startMin,
      duracion: court?.tipo === 'padel' ? 90 : 60,
      nombre: CLIENTE_NUEVO,
    }
  }

  const cancelDraft = () => {
    draft.value = null
    armIdle()
  }

  // Duraciones que entran en el hueco, para que el selector del cajón muestre
  // deshabilitadas las que pisarían el turno siguiente. Es mejor que dejar
  // elegir y rechazar después: se ve el límite antes de chocar con él.
  const duracionesPosibles = computed(() => {
    if (!draft.value) return {}
    const { columnKey, startMin } = draft.value
    return Object.fromEntries(
      DURACIONES.map((d) => [
        d,
        startMin + d <= DAY_END_MIN && !chocaCon(columnKey, startMin, startMin + d),
      ]),
    )
  })

  const confirmDraft = () => {
    if (!draft.value) return
    const { columnKey, startMin, duracion, nombre } = draft.value

    const choque = chocaCon(columnKey, startMin, startMin + duracion)
    if (choque) {
      showToast(
        `No entra: a las ${minutesToTime(choque.startMin)} ya está ${reservationLabel(choque)}.`,
        'error',
      )
      return
    }

    const court = courts.value.find((c) => c._id === columnKey)
    reservations.value = [
      ...reservations.value,
      {
        _id: `demo-${Date.now()}`,
        columnKey,
        _fechaKey: DEMO_DATE_KEY,
        startMin,
        endMin: startMin + duracion,
        tipo: court?.tipo,
        estado: 'confirmada',
        precioFinal: Math.round(((court?.precio || 0) * duracion) / 60),
        guestName: nombre,
      },
    ]
    draft.value = null
    complete('crear')
  }

  const moveReservation = ({ reservation, columnKey, startMin }) => {
    const endMin = startMin + (reservation.endMin - reservation.startMin)

    // El calendario ya soltó la tarjeta en el destino; si ahí hay otro turno,
    // no se aplica el cambio y vuelve sola a su lugar, que es lo que hace el
    // panel real cuando el backend rechaza el movimiento.
    const choque = chocaCon(columnKey, startMin, endMin, reservation._id)
    if (choque) {
      showToast(`Ahí no entra: se pisa con el turno de ${reservationLabel(choque)}.`, 'error')
      return
    }

    const court = courts.value.find((c) => c._id === columnKey)
    reservations.value = reservations.value.map((r) =>
      r._id === reservation._id
        ? {
            ...r,
            columnKey,
            startMin,
            endMin: startMin + (r.endMin - r.startMin),
            tipo: court?.tipo ?? r.tipo,
          }
        : r,
    )
    complete('mover')
  }

  const setTab = (next) => {
    tab.value = next
    clearIdle()
    // Sólo cuenta como paso cumplido si es el paso que toca. Si no, hay que
    // rearmar el reloj igual: sin este `else`, meterse en Reportes durante el
    // paso 1 dejaba la demo congelada para siempre.
    if (stepId.value === 'reportes' && next === 'reportes') complete('reportes')
    else armIdle()
  }

  // --- Canchas ------------------------------------------------------------
  // La cancha se edita en un cajón, igual que en el panel: la tarjeta sola no
  // tiene interruptor, y darle uno acá haría que la demo enseñara un gesto que
  // en el producto no existe.
  const courtDraft = ref(null)

  const openCourtDraft = (id) => {
    clearIdle()
    const court = courts.value.find((c) => c._id === id)
    if (court) courtDraft.value = { ...court }
  }

  const closeCourtDraft = () => {
    courtDraft.value = null
    armIdle()
  }

  const toggleCourtEstado = () => {
    const id = courtDraft.value?._id
    if (!id) return
    courts.value = courts.value.map((c) =>
      c._id === id ? { ...c, estado: c.estado === 'activa' ? 'inactiva' : 'activa' } : c,
    )
    courtDraft.value = null
    complete('canchas')
  }

  // --- Autoejecución del paso ---------------------------------------------

  function runCurrentStep() {
    const id = stepId.value
    if (!id) return
    if (id === 'crear') {
      openDraft(SLOT_NUEVO)
      chainTimer = setTimeout(confirmDraft, 1600)
      return
    }
    if (id === 'mover') {
      const reservation = reservations.value.find((r) => r._id === MOVIMIENTO.reservaId)
      if (reservation) moveReservation({ reservation, ...MOVIMIENTO })
      else advance()
      return
    }
    if (id === 'reportes') {
      setTab('reportes')
      return
    }
    if (id === 'canchas') {
      tab.value = 'canchas'
      openCourtDraft(CANCHA_PASO)
      chainTimer = setTimeout(toggleCourtEstado, 1600)
    }
  }

  const reset = () => {
    clearAll()
    courts.value = COURTS.map((c) => ({ ...c }))
    reservations.value = RESERVAS_INICIALES()
    draft.value = null
    courtDraft.value = null
    toast.value = null
    finished.value = false
    stepIndex.value = 0
    tab.value = PASOS[0].tab
    armIdle()
  }

  const start = () => {
    if (started.value) return
    armIdle()
  }

  // --- Derivados para la UI -----------------------------------------------

  const columns = computed(() =>
    courts.value.map((c) => ({
      key: c._id,
      label: c.nombre,
      sublabel: [c.superficie, c.cubierta ? 'Cubierta' : 'Descubierta'].filter(Boolean).join(' · '),
      tipo: c.tipo,
    })),
  )

  // Una cancha en mantenimiento sigue en la grilla pero cerrada todo el día:
  // es la misma señal que da el panel real (banda rayada) y se entiende sin
  // texto.
  const openRanges = computed(() =>
    Object.fromEntries(
      courts.value.map((c) => [
        c._id,
        c.estado === 'activa' ? { startMin: DAY_START_MIN, endMin: DAY_END_MIN } : null,
      ]),
    ),
  )

  // Posición del punto pulsante sobre la grilla, en las mismas coordenadas que
  // usa el calendario para dibujar las tarjetas.
  const hotspot = computed(() => {
    if (stepId.value === 'crear' && !draft.value) {
      const i = courts.value.findIndex((c) => c._id === SLOT_NUEVO.columnKey)
      return { colIndex: i, cols: courts.value.length, top: yFor(SLOT_NUEVO.startMin), height: HOUR_HEIGHT, clickable: true }
    }
    if (stepId.value === 'mover') {
      const r = reservations.value.find((x) => x._id === MOVIMIENTO.reservaId)
      if (!r) return null
      const i = courts.value.findIndex((c) => c._id === r.columnKey)
      return {
        colIndex: i,
        cols: courts.value.length,
        top: yFor(r.startMin),
        height: ((r.endMin - r.startMin) / 60) * HOUR_HEIGHT,
        clickable: false,
      }
    }
    return null
  })

  // --- Datos de las otras dos pantallas -----------------------------------

  const reportes = computed(() => {
    const total = reservations.value.length
    return {
      kpis: {
        ingresos: 1_842_000,
        reservas: 96 + (total - 6),
        ocupacion: 78,
        ticket: 27_500,
      },
      // Catorce días de facturación con la forma que tiene de verdad: picos los
      // fines de semana y el piso a mitad de semana.
      porDia: [
        { label: '01', value: 92000 }, { label: '02', value: 78000 },
        { label: '03', value: 64000 }, { label: '04', value: 71000 },
        { label: '05', value: 118000 }, { label: '06', value: 164000 },
        { label: '07', value: 151000 }, { label: '08', value: 88000 },
        { label: '09', value: 74000 }, { label: '10', value: 69000 },
        { label: '11', value: 96000 }, { label: '12', value: 127000 },
        { label: '13', value: 178000 }, { label: '14', value: 172000 },
      ],
      porDeporte: [
        { label: 'Pádel', value: 61, color: sportHex('padel') },
        { label: 'Fútbol', value: 28, color: sportHex('futbol') },
        { label: 'Tenis', value: 11, color: sportHex('tenis') },
      ],
      porCancha: [
        { nombre: 'Pádel 1', ingresos: 742000, ocupacion: 86 },
        { nombre: 'Fútbol 5', ingresos: 610000, ocupacion: 74 },
        { nombre: 'Pádel 2', ingresos: 490000, ocupacion: 68 },
      ],
    }
  })

  return {
    // estado
    courts,
    reservations,
    columns,
    openRanges,
    tab,
    draft,
    duracionesPosibles,
    courtDraft,
    toast,
    step,
    stepId,
    stepIndex,
    finished,
    started,
    hotspot,
    reportes,
    pasos: PASOS,
    // acciones
    start,
    reset,
    setTab,
    openDraft,
    cancelDraft,
    confirmDraft,
    moveReservation,
    openCourtDraft,
    closeCourtDraft,
    toggleCourtEstado,
  }
}
