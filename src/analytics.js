function claveTexto(texto) {
  if (typeof texto !== 'string') return '';
  return texto.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
}

function esVentaValida(venta) {
  return Boolean(venta) && Number.isFinite(venta.amount) && Number.isFinite(venta.price) && venta.amount > 0;
}

function valorVenta(venta) {
  return venta.amount * venta.price;
}

function totalVendido(ventas) {
  let total = 0;
  for (const venta of ventas) {
    if (!esVentaValida(venta)) continue;
    total += valorVenta(venta);
  }
  return total;
}

function unidadesVendidas(ventas) {
  let unidades = 0;
  for (const venta of ventas) {
    if (!esVentaValida(venta)) continue;
    unidades += venta.amount;
  }
  return unidades;
}

function ventaMayor(ventas) {
  let mayor = null;
  let valorMayor = 0;
  for (const venta of ventas) {
    if (!esVentaValida(venta)) continue;
    const valor = valorVenta(venta);
    if (mayor === null || valor > valorMayor) {
      mayor = venta;
      valorMayor = valor;
    }
  }
  return mayor;
}

function ticketPromedio(ventas) {
  let total = 0;
  let validas = 0;
  for (const venta of ventas) {
    if (!esVentaValida(venta)) continue;
    total += valorVenta(venta);
    validas += 1;
  }
  if (validas === 0) return 0;
  return total / validas;
}

function ventasPorCiudad(ventas, ciudad) {
  const buscada = claveTexto(ciudad);
  if (buscada === '') return 0;
  let total = 0;
  for (const venta of ventas) {
    if (!esVentaValida(venta)) continue;
    if (claveTexto(venta.city) === buscada) {
      total += valorVenta(venta);
    }
  }
  return total;
}

module.exports = {
  totalVendido,
  unidadesVendidas,
  ventaMayor,
  ticketPromedio,
  ventasPorCiudad,
};
