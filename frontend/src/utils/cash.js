// Metadatos de presentación para la caja (categorías y métodos de pago).

// tipo: 'ingreso' | 'egreso' | 'both'
export const CATEGORIA_META = {
  reserva: { label: 'Pago de reserva', icon: 'icon-[material-symbols--event-available]', tipo: 'ingreso' },
  saldo: { label: 'Saldo de reserva', icon: 'icon-[material-symbols--account-balance-wallet]', tipo: 'ingreso' },
  alquiler: { label: 'Alquiler', icon: 'icon-[material-symbols--sports-tennis]', tipo: 'ingreso' },
  venta: { label: 'Venta', icon: 'icon-[material-symbols--shopping-bag]', tipo: 'ingreso' },
  gasto: { label: 'Gasto / insumos', icon: 'icon-[material-symbols--receipt-long]', tipo: 'egreso' },
  retiro: { label: 'Retiro de caja', icon: 'icon-[material-symbols--payments]', tipo: 'egreso' },
  otro: { label: 'Otro', icon: 'icon-[material-symbols--more-horiz]', tipo: 'both' },
}

export const categoriaMeta = (c) => CATEGORIA_META[c] || CATEGORIA_META.otro

export const METODO_META = {
  efectivo: 'Efectivo',
  mercadopago: 'MercadoPago',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
}
export const metodoLabel = (m) => METODO_META[m] || m

// Categorías ofrecidas al cargar un movimiento manual (la de 'reserva' es
// automática de los pagos online, no se carga a mano).
export const categoriasManuales = (tipo) =>
  tipo === 'ingreso' ? ['saldo', 'alquiler', 'venta', 'otro'] : ['gasto', 'retiro', 'otro']

export const METODOS = ['efectivo', 'mercadopago', 'tarjeta', 'transferencia', 'otro']
