<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import Select from 'primevue/select'
import AutoComplete from 'primevue/autocomplete'
import geoService, { esCABA, normalizar, parseDireccion } from '@/services/geoService'

// Provincia, ciudad y dirección contra el nomenclador oficial (ver geoService).
//
// Vive en un componente compartido y no copiado en cada pantalla porque las tres
// cosas son un solo dato encadenado: la provincia acota las localidades, la
// localidad acota las calles, y la calle con altura es lo que devuelve las
// coordenadas. Partido en tres campos sueltos, cada pantalla reinventa el
// encadenado y alguna se olvida de limpiar la ciudad al cambiar de provincia.
//
// Contrato: los tres valores que se guardan son TEXTO (los nombres del censo),
// no ids. Los ids de georef se usan sólo para consultar y no se persisten: son
// de un dataset externo que puede renumerar, y el complejo no deja de estar en
// Rosario porque el INDEC cambie un código.

const props = defineProps({
  provincia: { type: String, default: '' },
  ciudad: { type: String, default: '' },
  direccion: { type: String, default: '' },
  // Clases del control, para que el componente se vea igual que el resto del
  // formulario que lo usa (el alta usa inputs de 3rem, la configuración no).
  controlClass: { type: String, default: '' },
  labelClass: { type: String, default: '' },
  // La configuración del complejo ya trae los campos en dos columnas.
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update:provincia', 'update:ciudad', 'update:direccion', 'update:ubicacion'])

const provincias = ref([])
const localidades = ref([])
const calles = ref([])

const cargandoLocalidades = ref(false)
const cargandoCalles = ref(false)
const errorGeo = ref('')

// Localidad elegida, con su id: es lo que necesitan las consultas de calles y
// direcciones. Se resuelve por nombre cuando el valor viene de la base (editar
// un complejo ya cargado) y no de un clic en la lista.
const localidadSel = ref(null)

// Distingue "la persona eligió otra ciudad" de "estamos reponiendo la que ya
// estaba guardada". Sin esta bandera, abrir la configuración de un complejo ya
// cargado dispara el watch de localidad como si fuera un cambio y le borra la
// dirección que tenía: el formulario se autovacía solo con abrirlo.
const hidratando = ref(false)

const sugerencias = ref([])
const direccionTexto = ref(props.direccion)
const direccionVerificada = ref(null)

// --- Carga inicial ---

onMounted(async () => {
  provincias.value = await geoService.getProvincias()
  if (props.provincia) await cargarLocalidades(props.provincia)
})

const cargarLocalidades = async (provincia) => {
  if (!provincia) {
    localidades.value = []
    return
  }

  cargandoLocalidades.value = true
  errorGeo.value = ''

  try {
    localidades.value = await geoService.getLocalidades(provincia)

    // Reenganchar la ciudad que venía guardada con su id.
    if (props.ciudad) {
      hidratando.value = true
      localidadSel.value =
        localidades.value.find((l) => normalizar(l.nombre) === normalizar(props.ciudad)) || null
      if (localidadSel.value) cargarCalles(localidadSel.value.id)
      // El watch de `localidadSel` corre después de este tick.
      await nextTick()
      hidratando.value = false
    }
  } catch {
    errorGeo.value = 'No pudimos cargar las localidades. Escribí la dirección a mano.'
    localidades.value = []
  } finally {
    cargandoLocalidades.value = false
  }
}

const cargarCalles = async (localidadId) => {
  cargandoCalles.value = true
  try {
    calles.value = await geoService.getCalles(localidadId)
  } catch {
    // Sin calles el campo sigue siendo un texto libre: se pierde el
    // autocompletado, no la posibilidad de cargar la dirección.
    calles.value = []
  } finally {
    cargandoCalles.value = false
  }
}

// --- Provincia ---

const provinciaSel = computed({
  get: () => props.provincia || null,
  set: (valor) => {
    emit('update:provincia', valor || '')
    // Cambiar de provincia invalida ciudad y dirección: dejarlas puestas produce
    // pares imposibles ("Rosario, Mendoza") que después nadie sabe de dónde
    // salieron.
    localidadSel.value = null
    calles.value = []
    direccionTexto.value = ''
    direccionVerificada.value = null
    emit('update:ciudad', '')
    emit('update:direccion', '')
    emit('update:ubicacion', null)
    cargarLocalidades(valor)
  },
})

// --- Ciudad ---

watch(localidadSel, (loc) => {
  emit('update:ciudad', loc?.nombre || '')

  // Reponer la ciudad guardada no es cambiarla: la dirección que ya estaba
  // cargada tiene que sobrevivir.
  if (hidratando.value) return

  direccionTexto.value = ''
  direccionVerificada.value = null
  emit('update:direccion', '')
  emit('update:ubicacion', null)

  calles.value = []
  if (loc) cargarCalles(loc.id)
})

// --- Dirección ---

// El filtrado es local: georef no busca por prefijo, así que una llamada por
// tecla no devolvería nada hasta tener el nombre completo. Ver geoService.
const buscarCalles = ({ query }) => {
  const { calle, altura } = parseDireccion(query)
  const term = normalizar(calle)

  if (!term || term.length < 2) {
    sugerencias.value = []
    return
  }

  const coincidencias = calles.value
    .filter((c) => normalizar(c).includes(term))
    // Las que empiezan con lo tipeado van primero: quien escribe "San" busca
    // "SAN MARTIN" antes que "PASAJE SAN JOSE".
    .sort((a, b) => {
      const aEmpieza = normalizar(a).startsWith(term)
      const bEmpieza = normalizar(b).startsWith(term)
      if (aEmpieza !== bEmpieza) return aEmpieza ? -1 : 1
      return a.localeCompare(b, 'es')
    })
    .slice(0, 8)

  // Si ya escribió la altura, se la devolvemos pegada a cada calle para que
  // elegir una opción complete la dirección entera y no la deje a medias.
  sugerencias.value = altura ? coincidencias.map((c) => `${c} ${altura}`) : coincidencias
}

const onDireccionInput = (valor) => {
  direccionTexto.value = valor
  direccionVerificada.value = null
  emit('update:direccion', valor || '')
  emit('update:ubicacion', null)
}

// Confirma la dirección contra el nomenclador y levanta las coordenadas. Corre
// al elegir una sugerencia y al salir del campo: nadie está obligado a usar la
// lista, y una dirección tipeada entera también merece geocodificarse.
const verificarDireccion = async () => {
  const texto = (direccionTexto.value || '').trim()
  if (!texto || !localidadSel.value) return

  const { altura } = parseDireccion(texto)
  // Sin altura no hay punto en el mapa, sólo una calle entera: no se consulta.
  if (!altura) return

  const resultado = await geoService.normalizarDireccion({
    localidadId: localidadSel.value.id,
    direccion: texto,
  })

  if (resultado?.ubicacion) {
    direccionVerificada.value = resultado
    emit('update:ubicacion', resultado.ubicacion)
  }
}

const onSeleccionCalle = async () => {
  emit('update:direccion', direccionTexto.value || '')
  await verificarDireccion()
}

// Reflejar cambios que vengan de afuera (cargar un complejo para editar).
watch(
  () => props.direccion,
  (valor) => {
    if (valor !== direccionTexto.value) direccionTexto.value = valor || ''
  },
)

watch(
  () => props.provincia,
  (valor) => {
    if (valor && !localidades.value.length) cargarLocalidades(valor)
  },
)

// En CABA lo que se elige es el barrio. Cambia sólo el rótulo: el dato se sigue
// guardando en `ciudad`, que es como lo busca el jugador ("canchas en Palermo").
const enCABA = computed(() => esCABA(props.provincia))
const etiquetaCiudad = computed(() => (enCABA.value ? 'Barrio' : 'Ciudad'))

const placeholderCiudad = computed(() => {
  if (!props.provincia) return 'Elegí primero la provincia'
  if (cargandoLocalidades.value) return 'Cargando localidades…'
  return enCABA.value ? 'Buscá tu barrio' : 'Buscá tu ciudad'
})

// Cómo se lee la dirección ya verificada.
//
// En CABA no se usa la `nomenclatura` que devuelve georef: viene con la comuna
// ("AV MEDRANO 950, Comuna 5, ...") y la persona eligió un barrio. Decirle
// "Comuna 5" cuando puso Almagro parece un error del sistema, así que se arma
// el texto con el barrio que eligió.
const nomenclaturaVisible = computed(() => {
  const v = direccionVerificada.value
  if (!v) return ''
  if (!enCABA.value) return v.nomenclatura
  return `${v.calle} ${v.altura}, ${localidadSel.value?.nombre}, CABA`
})

const ayudaDireccion = computed(() => {
  if (!localidadSel.value) return `Elegí ${enCABA.value ? 'el barrio' : 'la ciudad'} para buscar la calle.`
  if (cargandoCalles.value) return 'Cargando calles…'
  if (direccionVerificada.value) return `Verificada: ${nomenclaturaVisible.value}`
  if (!calles.value.length) return 'Escribí la calle y la altura.'
  return 'Escribí la calle y la altura. Ej: San Martín 1234'
})
</script>

<template>
  <div :class="compact ? 'contents' : 'space-y-5'">
    <div>
      <label :class="labelClass" for="geo-provincia">Provincia</label>
      <Select
        id="geo-provincia"
        v-model="provinciaSel"
        :options="provincias"
        option-label="nombre"
        option-value="nombre"
        placeholder="Elegí una provincia"
        filter
        filter-placeholder="Buscar provincia"
        empty-filter-message="Sin resultados"
        :class="['w-full', controlClass]"
      />
    </div>

    <div>
      <label :class="labelClass" for="geo-ciudad">{{ etiquetaCiudad }}</label>
      <Select
        id="geo-ciudad"
        v-model="localidadSel"
        :options="localidades"
        option-label="nombre"
        data-key="key"
        :placeholder="placeholderCiudad"
        :disabled="!provincia || cargandoLocalidades"
        :loading="cargandoLocalidades"
        filter
        filter-placeholder="Escribí para buscar"
        :empty-filter-message="enCABA ? 'No encontramos ese barrio' : 'No encontramos esa localidad'"
        empty-message="Elegí primero la provincia"
        :class="['w-full', controlClass]"
      >
        <!-- El departamento desempata a las homónimas: Santa Fe tiene dos
             "Aldao" y en la lista se verían idénticas. -->
        <template #option="{ option }">
          <div class="flex w-full items-baseline justify-between gap-3">
            <span>{{ option.nombre }}</span>
            <span v-if="option.departamento" class="shrink-0 text-xs text-stone-400">
              {{ option.departamento }}
            </span>
          </div>
        </template>
      </Select>
    </div>

    <div>
      <label :class="labelClass" for="geo-direccion">Dirección</label>
      <AutoComplete
        id="geo-direccion"
        :model-value="direccionTexto"
        :suggestions="sugerencias"
        :disabled="!localidadSel"
        placeholder="Ej: San Martín 1234"
        class="w-full"
        :input-class="['w-full', controlClass]"
        @complete="buscarCalles"
        @update:model-value="onDireccionInput"
        @item-select="onSeleccionCalle"
        @blur="verificarDireccion"
      />
      <p
        class="mt-2 flex items-start gap-1.5 text-xs leading-relaxed"
        :class="direccionVerificada ? 'text-brand-green-600' : 'text-stone-400'"
      >
        <i
          class="mt-px shrink-0 text-sm"
          :class="
            direccionVerificada
              ? 'icon-[material-symbols--check-circle]'
              : 'icon-[material-symbols--info-outline]'
          "
        ></i>
        {{ ayudaDireccion }}
      </p>
      <p v-if="errorGeo" class="mt-2 text-xs leading-relaxed text-warning-700">{{ errorGeo }}</p>
    </div>
  </div>
</template>
