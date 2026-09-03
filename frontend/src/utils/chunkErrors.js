// Un deploy nuevo cambia el hash de cada chunk y Vercel borra los del anterior.
// La pestaña que quedó abierta sigue teniendo el index.html viejo, así que al
// navegar a una ruta con `import()` pide un archivo que ya no existe.
//
// Cada navegador cuenta lo mismo con otras palabras, y hay que reconocerlas a
// todas porque el error llega como texto:
//   Chrome   → "Failed to fetch dynamically imported module"
//   Firefox  → "error loading dynamically imported module"
//   Safari   → "'text/html' is not a valid JavaScript MIME type" (el rewrite de
//              Vercel le devuelve el index.html en vez de un 404) o bien
//              "Importing a module script failed"
// El de CSS es el mismo problema por el lado del `modulepreload` de Vite.
const CHUNK_ERROR_PATTERNS = [
  /dynamically imported module/i,
  /Importing a module script failed/i,
  /not a valid JavaScript MIME type/i,
  /Unable to preload CSS/i,
]

const isChunkLoadError = (error) => {
  const message = typeof error === 'string' ? error : (error?.message ?? '')
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export { CHUNK_ERROR_PATTERNS, isChunkLoadError }
