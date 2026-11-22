const { salesGenerator } = require('./generator');
const {
  totalSoldInstrumented,
  wholesaleInstrumented,
  totalByCityInstrumented,
  firstSale,
} = require('./analytics');

const SIZES = [100, 1000, 10000, 100000];

function countOperations(measure, sales) {
  const counter = { visits: 0, comparisons: 0 };
  measure(sales, counter);
  return counter.visits + counter.comparisons;
}

const rows = SIZES.map((n) => {
  const sales = salesGenerator(n);
  return {
    n,
    totalSold: countOperations(totalSoldInstrumented, sales),
    wholesale: countOperations(wholesaleInstrumented, sales),
    totalByCity: countOperations(totalByCityInstrumented, sales),
    firstSale: countOperations(firstSale, sales),
  };
});

const base = rows[0];
const growth = rows.map((row) => ({
  n: row.n,
  totalSold: row.totalSold / base.totalSold,
  wholesale: row.wholesale / base.wholesale,
  totalByCity: row.totalByCity / base.totalByCity,
  firstSale: row.firstSale / base.firstSale,
}));

console.log('=== Operations ===');
console.table(rows);
console.log('=== Growth factor (vs n = 100) ===');
console.table(growth);
