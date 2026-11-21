const test = require('node:test');
const assert = require('node:assert/strict');
const { sales } = require('./data');
const {
  totalVendido,
  unidadesVendidas,
  ventaMayor,
  ticketPromedio,
  ventasPorCiudad,
} = require('./analytics');

test('totalVendido: full array, single element, empty array', () => {
  assert.equal(totalVendido(sales), 985000);
  assert.equal(totalVendido([sales[0]]), 84000);
  assert.equal(totalVendido([]), 0);
});

test('unidadesVendidas: full array, single element, empty array', () => {
  assert.equal(unidadesVendidas(sales), 21);
  assert.equal(unidadesVendidas([sales[0]]), 2);
  assert.equal(unidadesVendidas([]), 0);
});

test('ventaMayor: full array, single element, empty array', () => {
  assert.equal(ventaMayor(sales), sales[9]);
  assert.equal(ventaMayor([sales[0]]), sales[0]);
  assert.equal(ventaMayor([]), null);
});

test('ticketPromedio: full array, single element, empty array', () => {
  assert.equal(ticketPromedio(sales), 985000 / 11);
  assert.equal(ticketPromedio([sales[0]]), 84000);
  assert.equal(ticketPromedio([]), 0);
});

test('ventasPorCiudad: full array, single element, empty array', () => {
  assert.equal(ventasPorCiudad(sales, 'Medellín'), 356000);
  assert.equal(ventasPorCiudad(sales, 'medellín'), 356000);
  assert.equal(ventasPorCiudad([sales[0]], 'Medellín'), 84000);
  assert.equal(ventasPorCiudad([], 'Medellín'), 0);
});

test('a zero-quantity record is not a valid purchase', () => {
  const zeroSale = sales[7];
  assert.equal(totalVendido([zeroSale]), 0);
  assert.equal(unidadesVendidas([zeroSale]), 0);
  assert.equal(ventaMayor([zeroSale]), null);
  assert.equal(ticketPromedio([zeroSale]), 0);
});
