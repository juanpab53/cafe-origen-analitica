function Normalize(texto) {
  if (typeof texto !== 'string') return ''
  return texto.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

function isValidSale(sale) {
  return quantity(sale) > 0 && Number.isFinite(sale.amount) && Number.isFinite(sale.price);
}

function salePrice(sale) {
  return sale.amount * sale.price;
}

function quantity(sale) {
  if (!sale) return 0;
  const amount = Number(sale.amount);
  return Number.isFinite(amount) ? amount : 0;
}

function price(sale) {
  if (!sale) return 0;
  const price = Number(sale.price);
  return Number.isFinite(price) ? price : 0;
}

function countValidSales(sales) {
  let validas = 0;
  for (const sale of sales) {
    if (isValidSale(sale)) validas++;
  }
  return validas;
}


function totalSold(sales) {
  let total = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    total += salePrice(sale);
  }
  return total;
}

function unitsSold(sales) {
  let units = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    units += quantity(sale);
  }
  return units;
}

function wholesale(sales) {
  let may = null;
  let valueMay = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    const valor = salePrice(sale);
    if (may === null || valor > valueMay) {
      may = sale;
      valueMay = valor;
    }
  }
  return may;
}

function averageTicket(sales) {
  let total = 0;
  let valid = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    total += salePrice(sale);
    valid += 1;
  }
  if (valid === 0) return 0;
  return total / valid;
}

function salesByCity(sales, city) {
  const buscada = Normalize(city);
  if (buscada === '') return 0;
  let total = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    if (Normalize(sale.city) === buscada) {
      total += salePrice(sale);
    }
  }
  return total;
}

module.exports = {
  totalSold,
  unitsSold,
  wholesale,
  averageTicket,
  salesByCity,
};
