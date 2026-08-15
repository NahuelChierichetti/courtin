// Lista plana de ciudades, para los selectores que no piden provincia (hoy, la
// configuración del complejo). Usar un conjunto controlado evita duplicados por
// diferencias de tipeo ("San Isidro" vs "san isidro"), y alimenta el filtro de
// ciudades del buscador público.
//
// La fuente de verdad es provinces.js: acá sólo se aplana y ordena, así una
// ciudad nueva se agrega en un solo lugar y aparece en los dos selectores.

import { PROVINCES } from '@/utils/provinces'

export const CITIES = [...new Set(PROVINCES.flatMap((p) => p.cities))].sort((a, b) =>
  a.localeCompare(b, 'es'),
)
