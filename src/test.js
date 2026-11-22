const { sales } = require('./data');
const {
  totalSold,
  totalByCity,
  unitsSold,
  wholesale,
  averageTicket,
  salesByCity,
} = require('./analytics');

const cases = [
  { name: 'Full (12)', data: sales },
  { name: 'Single element', data: [sales[0]] },
  { name: 'Empty', data: [] },
];

function describeSale(sale) {
  return sale === null ? 'null' : `id ${sale.id} (${sale.amount * sale.price})`;
}

console.log('=== Results by input ===');
const rows = [];
for (const testCase of cases) {
  rows.push({
    input: testCase.name,
    totalSold: totalSold(testCase.data),
    unitsSold: unitsSold(testCase.data),
    wholesale: describeSale(wholesale(testCase.data)),
    averageTicket: Number(averageTicket(testCase.data).toFixed(2)),
    'salesByCity(Medellín)': salesByCity(testCase.data, 'Medellín'),
    totalByCity: JSON.stringify(totalByCity(testCase.data)),
  });
}
console.table(rows);

const checks = [
  ['totalSold([sales[0]]) = 84000', totalSold([sales[0]]) === 84000],
  ['totalSold([zero-quantity sale]) = 0', totalSold([sales[7]]) === 0],
  [
    'totalByCity groups case variants and skips invalid sales',
    JSON.stringify(totalByCity(sales)) ===
      JSON.stringify({ Medellín: 356000, Bogotá: 276000, Cali: 185000, Pereira: 168000 }),
  ],
  ['totalByCity([]) = {}', JSON.stringify(totalByCity([])) === '{}'],
  ['salesByCity(sales, "") = 0', salesByCity(sales, '') === 0],
  ['totalSold(sales) = 985000', totalSold(sales) === 985000],
  ['unitsSold(sales) = 21', unitsSold(sales) === 21],
  ['wholesale(sales) is id 10', wholesale(sales).id === 10],
  ['wholesale([sales[0]]) is id 1', wholesale([sales[0]]).id === 1],
  ['averageTicket(sales) = 985000 / 11', averageTicket(sales) === 985000 / 11],
  [
    'salesByCity(sales, "Medellín") = 356000 (includes "medellín")',
    salesByCity(sales, 'Medellín') === 356000,
  ],
  [
    'salesByCity ignores case and spaces ("  MEDELLÍN ") = 356000',
    salesByCity(sales, '  MEDELLÍN ') === 356000,
  ],
  ['salesByCity for a city with no sales = 0', salesByCity(sales, 'Cartagena') === 0],
  ['totalSold([]) = 0', totalSold([]) === 0],
  ['unitsSold([]) = 0', unitsSold([]) === 0],
  ['wholesale([]) = null', wholesale([]) === null],
  ['averageTicket([]) = 0 (not NaN)', averageTicket([]) === 0],
  ['salesByCity([], "Medellín") = 0', salesByCity([], 'Medellín') === 0],
  ['wholesale with no valid sales = null', wholesale([sales[7]]) === null],
  ['averageTicket with no valid sales = 0', averageTicket([sales[7]]) === 0],
];

console.log('\n=== Tests ===');
let failures = 0;
for (const [description, passed] of checks) {
  console.log(`${passed ? 'PASS  ' : 'FAIL  '}  ${description}`);
  if (!passed) failures++;
}
console.log(`\n${checks.length - failures}/${checks.length} checks passed.`);
if (failures > 0) process.exitCode = 1;
