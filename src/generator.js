const PRODUCTS = [
  { product: 'Origen Huila 500 g', price: 42000 },
  { product: 'Origen Nariño 250 g', price: 26000 },
  { product: 'Prensa francesa', price: 95000 },
  { product: 'Origen Sierra 500 g', price: 45000 },
  { product: 'Molino manual', price: 120000 },
];

const CITIES = ['Medellín', 'Bogotá', 'Cali', 'Pereira'];
const PRICES = PRODUCTS.map((item) => item.price);
const DATE = '2026-09-01';

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function salesGenerator(n) {
  const total = Number(n);
  if (!Number.isFinite(total) || total <= 0) return [];

  const count = Math.floor(total);
  const maxClients = Math.max(1, Math.floor(count / 3));
  const clientCount = Math.floor(Math.random() * maxClients) + 1;
  const clients = Array.from(
    { length: clientCount },
    (_, index) => `C${String(index + 1).padStart(2, '0')}`
  );

  const sales = [];
  for (let id = 1; id <= count; id++) {
    const productIndex = Math.floor(Math.random() * PRODUCTS.length);
    sales.push({
      id,
      date: DATE,
      client: randomItem(clients),
      product: PRODUCTS[productIndex].product,
      city: randomItem(CITIES),
      amount: Math.floor(Math.random() * 5) + 1,
      price: PRICES[productIndex],
    });
  }

  return sales;
}

module.exports = { salesGenerator };
