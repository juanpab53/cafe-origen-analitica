/**
 * Manual exploration script for the Café Origen sales dataset.
 */
const { sales } = require('./data');

console.log('=== Café Origen · Data exploration ===\n');

console.log('Number of records:', sales.length);

console.log('\nFirst record (index 0):');
console.log(sales[0]);

console.log(`\nLast record (index ${sales.length - 1}):`);
console.log(sales[sales.length - 1]);

console.log('\nProduct of the record in position 4 (sales[3]):', sales[3].product);

console.log('\nComplete table:');
console.table(sales);