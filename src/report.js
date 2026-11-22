const { sales } = require('./data');
const {
    totalSold,
    unitsSold,
    averageTicket,
    wholesale,
    totalByCity,
    unitsPerProcduct,
    topProductsPerValue,
    salesOfTheDay,

} = require('./analytics');

function formatCurrency(value) {
    return Number(value).toLocaleString('es-CO');
}

const highestSale = wholesale(sales);

console.log('=== Resumen general ===');
console.table([
    {
        totalSold: formatCurrency(totalSold(sales)),
        unitsSold: unitsSold(sales),
        averageTicket: formatCurrency(Number(averageTicket(sales).toFixed(2))),
        wholesale: highestSale
            ? `id ${highestSale.id} - ${highestSale.product} (${formatCurrency(highestSale.amount * highestSale.price)})`
            : 'null',
    },
]);

console.log('\n=== Ventas por ciudad ===');
console.table(totalByCity(sales));

console.log('\n=== Unidades por producto ===');
console.table(unitsPerProcduct(sales));

console.log('\n=== Top 3 de productos por valor ===');
console.table(
    topProductsPerValue(sales, 3).map((item, index) => ({
        rank: index + 1,
        product: item.product,
        value: formatCurrency(item.value),
    }))
);

console.log('\n=== Resumen de un día con ventas ===');
console.table([salesOfTheDay(sales, '2026-09-01')]);

console.log('\n=== Resumen de un día sin ventas ===');
console.table([salesOfTheDay(sales, '2026-09-08')]);