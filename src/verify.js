const { sales } = require('./data');
const {
  totalSold,
  totalSoldM,
  unitsSold,
  unitSoldM,
  salesByCity,
  saleByCityM,
} = require('./analytics');

const city = 'Medellín';

const comparisons = [
  {
    name: 'totalSold',
    loop: totalSold(sales),
    methods: totalSoldM(sales),
  },
  {
    name: 'unitsSold',
    loop: unitsSold(sales),
    methods: unitSoldM(sales),
  },
  {
    name: 'salesByCity',
    loop: salesByCity(sales, city),
    methods: saleByCityM(sales, city),
  },
];

for (const { name, loop, methods } of comparisons) {
  const status = Object.is(loop, methods) ? 'OK' : 'DIFERENTE';
  console.log(`${name}: ${status}`);
}
