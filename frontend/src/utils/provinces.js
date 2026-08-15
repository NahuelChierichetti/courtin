// Provincias y ciudades de Argentina, para los selectores encadenados del alta
// de complejos y de la configuración.
//
// Por qué una lista fija y no un input libre: la ciudad es el filtro principal
// del buscador público. Escrita a mano se convierte en "Cordoba", "córdoba" y
// "Cba" — tres ciudades distintas para la base y ningún resultado para el
// jugador. Con la lista cerrada, todos los complejos de una ciudad caen en el
// mismo cajón.
//
// No pretende ser el padrón completo de localidades del país: son las ciudades
// donde hay (o va a haber) complejos. Para el resto está la opción "Otra", que
// deja escribirla a mano — la excepción existe para que un complejo del interior
// pueda darse de alta igual, no para reemplazar a la lista.
//
// Agregar una ciudad es sumarla al array de su provincia y nada más.

export const PROVINCES = [
  {
    name: 'Ciudad Autónoma de Buenos Aires',
    cities: ['CABA'],
  },
  {
    name: 'Buenos Aires',
    cities: [
      'Avellaneda',
      'Azul',
      'Bahía Blanca',
      'Berazategui',
      'Campana',
      'Castelar',
      'Chivilcoy',
      'Escobar',
      'Florencio Varela',
      'Garín',
      'Ituzaingó',
      'José C. Paz',
      'Junín',
      'La Plata',
      'Lanús',
      'Lomas de Zamora',
      'Luján',
      'Mar del Plata',
      'Martínez',
      'Mercedes',
      'Miramar',
      'Moreno',
      'Morón',
      'Necochea',
      'Nordelta',
      'Olavarría',
      'Olivos',
      'Pergamino',
      'Pilar',
      'Pinamar',
      'Quilmes',
      'Ramos Mejía',
      'San Fernando',
      'San Isidro',
      'San Martín',
      'San Miguel',
      'San Nicolás de los Arroyos',
      'Tandil',
      'Tigre',
      'Vicente López',
      'Villa Gesell',
      'Zárate',
    ],
  },
  {
    name: 'Catamarca',
    cities: ['San Fernando del Valle de Catamarca', 'Andalgalá', 'Belén', 'Santa María', 'Tinogasta'],
  },
  {
    name: 'Chaco',
    cities: [
      'Resistencia',
      'Barranqueras',
      'Charata',
      'Presidencia Roque Sáenz Peña',
      'Villa Ángela',
    ],
  },
  {
    name: 'Chubut',
    cities: ['Comodoro Rivadavia', 'Esquel', 'Puerto Madryn', 'Rawson', 'Trelew'],
  },
  {
    name: 'Córdoba',
    cities: [
      'Córdoba',
      'Alta Gracia',
      'Cosquín',
      'Jesús María',
      'La Falda',
      'Río Cuarto',
      'Río Tercero',
      'San Francisco',
      'Villa Carlos Paz',
      'Villa María',
    ],
  },
  {
    name: 'Corrientes',
    cities: ['Corrientes', 'Curuzú Cuatiá', 'Goya', 'Mercedes', 'Paso de los Libres'],
  },
  {
    name: 'Entre Ríos',
    cities: [
      'Paraná',
      'Concepción del Uruguay',
      'Concordia',
      'Gualeguay',
      'Gualeguaychú',
      'Victoria',
    ],
  },
  {
    name: 'Formosa',
    cities: ['Formosa', 'Clorinda', 'Pirané'],
  },
  {
    name: 'Jujuy',
    cities: [
      'San Salvador de Jujuy',
      'Libertador General San Martín',
      'Palpalá',
      'Perico',
      'San Pedro de Jujuy',
    ],
  },
  {
    name: 'La Pampa',
    cities: ['Santa Rosa', 'General Pico', 'Toay'],
  },
  {
    name: 'La Rioja',
    cities: ['La Rioja', 'Chamical', 'Chilecito'],
  },
  {
    name: 'Mendoza',
    cities: [
      'Mendoza',
      'Godoy Cruz',
      'Guaymallén',
      'Las Heras',
      'Luján de Cuyo',
      'Maipú',
      'San Martín',
      'San Rafael',
      'Tunuyán',
    ],
  },
  {
    name: 'Misiones',
    cities: ['Posadas', 'Apóstoles', 'Eldorado', 'Oberá', 'Puerto Iguazú'],
  },
  {
    name: 'Neuquén',
    cities: [
      'Neuquén',
      'Centenario',
      'Cutral Có',
      'Plottier',
      'San Martín de los Andes',
      'Villa La Angostura',
      'Zapala',
    ],
  },
  {
    name: 'Río Negro',
    cities: [
      'San Carlos de Bariloche',
      'Cipolletti',
      'El Bolsón',
      'General Roca',
      'Viedma',
      'Villa Regina',
    ],
  },
  {
    name: 'Salta',
    cities: [
      'Salta',
      'Cafayate',
      'Rosario de la Frontera',
      'San Ramón de la Nueva Orán',
      'Tartagal',
    ],
  },
  {
    name: 'San Juan',
    cities: ['San Juan', 'Chimbas', 'Pocito', 'Rawson (San Juan)', 'Rivadavia'],
  },
  {
    name: 'San Luis',
    cities: ['San Luis', 'La Punta', 'Merlo (San Luis)', 'Villa Mercedes'],
  },
  {
    name: 'Santa Cruz',
    cities: ['Río Gallegos', 'Caleta Olivia', 'El Calafate', 'Pico Truncado'],
  },
  {
    name: 'Santa Fe',
    cities: [
      'Rosario',
      'Santa Fe',
      'Esperanza',
      'Funes',
      'Rafaela',
      'Reconquista',
      'Roldán',
      'San Lorenzo',
      'Venado Tuerto',
      'Villa Gobernador Gálvez',
    ],
  },
  {
    name: 'Santiago del Estero',
    cities: ['Santiago del Estero', 'Añatuya', 'La Banda', 'Termas de Río Hondo'],
  },
  {
    name: 'Tierra del Fuego',
    cities: ['Ushuaia', 'Río Grande', 'Tolhuin'],
  },
  {
    name: 'Tucumán',
    cities: [
      'San Miguel de Tucumán',
      'Banda del Río Salí',
      'Concepción',
      'Tafí del Valle',
      'Tafí Viejo',
      'Yerba Buena',
    ],
  },
]

export const PROVINCE_NAMES = PROVINCES.map((p) => p.name)

// --- CABA ---------------------------------------------------------------
//
// Caso aparte, y por eso está acá y no sale de la API.
//
// georef modela toda la Ciudad de Buenos Aires como UNA sola localidad censal
// (id 02000010), así que el selector de ciudad mostraría una única opción que no
// le sirve a nadie. Sus "departamentos" tampoco ayudan: son las 15 comunas, y
// nadie ubica un complejo diciendo "Comuna 5" — dice Almagro.
//
// La salida es listar los 48 barrios oficiales y hacerlos apuntar todos al mismo
// id censal. Las calles de CABA están indexadas a nivel ciudad, así que el
// autocompletado de dirección y la verificación con coordenadas siguen andando
// igual; el barrio es la etiqueta que se guarda en `Club.ciudad`, que además es
// como la busca un jugador ("canchas en Palermo").

export const CABA_PROVINCIA = 'Ciudad Autónoma de Buenos Aires'
export const CABA_LOCALIDAD_ID = '02000010'

export const CABA_BARRIOS = [
  'Agronomía',
  'Almagro',
  'Balvanera',
  'Barracas',
  'Belgrano',
  'Boedo',
  'Caballito',
  'Chacarita',
  'Coghlan',
  'Colegiales',
  'Constitución',
  'Flores',
  'Floresta',
  'La Boca',
  'La Paternal',
  'Liniers',
  'Mataderos',
  'Monte Castro',
  'Montserrat',
  'Nueva Pompeya',
  'Núñez',
  'Palermo',
  'Parque Avellaneda',
  'Parque Chacabuco',
  'Parque Chas',
  'Parque Patricios',
  'Puerto Madero',
  'Recoleta',
  'Retiro',
  'Saavedra',
  'San Cristóbal',
  'San Nicolás',
  'San Telmo',
  'Vélez Sársfield',
  'Versalles',
  'Villa Crespo',
  'Villa del Parque',
  'Villa Devoto',
  'Villa General Mitre',
  'Villa Lugano',
  'Villa Luro',
  'Villa Ortúzar',
  'Villa Pueyrredón',
  'Villa Real',
  'Villa Riachuelo',
  'Villa Santa Rita',
  'Villa Soldati',
  'Villa Urquiza',
]

// Valor centinela del select de ciudad. Al elegirlo aparece un campo de texto
// para escribirla: sin esta salida, un complejo de un pueblo que no está en la
// lista no podría completar el registro.
export const OTRA_CIUDAD = '__otra__'

/** Ciudades de una provincia, ordenadas. Vacío si la provincia no existe. */
export const citiesOf = (provincia) =>
  PROVINCES.find((p) => p.name === provincia)?.cities ?? []
