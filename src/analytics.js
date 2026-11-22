/**
 * ======= BLOCK FOR AUXILIARY FUNCTIONS =======
 */

/**
 * Normalizes text for case- and accent-insensitive comparisons.
 * @param {*} text - Value to normalize.
 * @returns {string} Trimmed, lowercase text without diacritics, or an empty string when input is not a string.
 */
function normalizeText(text) {
  if (typeof text !== 'string') return ''
  return text.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

/**
 * Checks whether a sale has valid quantity and price values.
 * @param {Object} sale - Sale record to validate.
 * @returns {boolean} True when quantity is greater than zero and both quantity and price are finite numbers.
 */
function isValidSale(sale) {
  return quantity(sale) > 0 && Number.isFinite(quantity(sale)) && Number.isFinite(price(sale));
}

/**
 * Calculates the monetary value of a sale.
 * @param {Object} sale - Sale record containing amount and price.
 * @returns {number} Total value for the sale.
 */
function salePrice(sale) {
  return quantity(sale) * price(sale);
}

/**
 * Gets the numeric quantity from a sale record.
 * @param {Object} sale - Sale record containing amount.
 * @returns {number} Finite quantity, or 0 when missing or invalid.
 */
function quantity(sale) {
  if (!sale) return 0;
  const amount = Number(sale.amount);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Gets the numeric unit price from a sale record.
 * @param {Object} sale - Sale record containing price.
 * @returns {number} Finite price, or 0 when missing or invalid.
 */
function price(sale) {
  if (!sale) return 0;
  const price = Number(sale.price);
  return Number.isFinite(price) ? price : 0;
}

/**
 * Counts how many sales are valid.
 * @param {Array<Object>} sales - Sales records to evaluate.
 * @returns {number} Number of valid sales.
 */
function countValidSales(sales) {
  let valid = 0;
  for (const sale of sales) {
    if (isValidSale(sale)) valid++;
  }
  return valid;
}

/**
 * ======= BLOCK FOR UNITS =======
 */

/**
 * Calculates total sold units using a loop.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {number} Total units from valid sales.
 */
function unitsSold(sales) {
  let units = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    units += quantity(sale);
  }
  return units;
}

/**
 * Calculates total sold units using array methods.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {number} Total units from valid sales.
 */
function unitSoldM(sales) {
  return sales.reduce((acc, sale) => {
    if (!isValidSale(sale)) return acc
    return acc + quantity(sale)
  }, 0)
}

/**
 * Groups sold units by normalized product name.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {Object<string, number>} Object mapping original product names to sold units.
 */
function unitsPerProcduct(sales) {
  const totals = new Map();
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    const product = typeof sale.product === 'string' ? sale.product : '';
    const normalizeProduct = normalizeText(product);
    if (normalizeProduct === '') continue;

    const current = totals.get(normalizeProduct)
    if (current) {
      current.units += quantity(sale)
    } else {
      totals.set(normalizeProduct, { product, units: quantity(sale) });
    }
  }

  const result = {};
  for (const { product, units } of totals.values()) {
    result[product] = units
  }
  return result
}

/**
 * Returns top products ranked by total sold value.
 * @param {Array<Object>} sales - Sales records to process.
 * @param {number} k - Maximum number of products to return.
 * @returns {Array<{product: string, value: number}>} Top products sorted by value descending.
 */
function topProductsPerValue(sales, k) {
  const limit = Number(k);
  if (!Number.isFinite(limit) || limit <= 0) return [];

  const totals = new Map();
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    const product = typeof sale.product === 'string' ? sale.product : '';
    const normalizedProduct = normalizeText(product);
    if (normalizedProduct === '') continue;

    const current = totals.get(normalizedProduct);
    if (current) {
      current.value += salePrice(sale);
    } else {
      totals.set(normalizedProduct, { product, value: salePrice(sale) });
    }
  }

  return Array.from(totals.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

}

/**
 * ======= BLOCK FOR TOTALS =======
 */

/**
 * Calculates total sold value using a loop.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {number} Total monetary value from valid sales.
 */
function totalSold(sales) {
  let total = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    total += salePrice(sale);
  }
  return total;
}

/**
 * Calculates total sold value using array methods.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {number} Total monetary value from valid sales.
 */
function totalSoldM(sales) {
  let total = sales.reduce((acc, sale) => {
    if (!isValidSale(sale)) return acc;
    return acc + salePrice(sale);
  }, 0);
  return total;
}

/**
 * Groups total sold value by normalized city name.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {Object<string, number>} Object mapping original city names to total sold value.
 */
function totalByCity(sales) {
  const cityTotals = new Map();
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    const city = typeof sale.city === 'string' ? sale.city : '';
    const normalizedCity = normalizeText(city);
    if (normalizedCity === '') continue;

    const current = cityTotals.get(normalizedCity);
    if (current) {
      current.total += salePrice(sale);
    } else {
      cityTotals.set(normalizedCity, { city, total: salePrice(sale) });
    }
  }

  const totals = {};
  for (const { city, total } of cityTotals.values()) {
    totals[city] = total;
  }
  return totals;
}

/**
 * ======= BLOCK FOR SALES BY CITY =======
*/

/**
 * Calculates total sold value for a specific city using a loop.
 * @param {Array<Object>} sales - Sales records to process.
 * @param {string} city - City name to match.
 * @returns {number} Total sold value for the requested city.
 */
function salesByCity(sales, city) {
  const normalizedCity = normalizeText(city);
  if (normalizedCity === '') return 0;
  let total = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    if (normalizeText(sale.city) === normalizedCity) {
      total += salePrice(sale);
    }
  }
  return total;
}

/**
 * Calculates total sold value for a specific city using array methods.
 * @param {Array<Object>} sales - Sales records to process.
 * @param {string} city - City name to match.
 * @returns {number} Total sold value for the requested city.
 */
function saleByCityM(sales, city) {
  const normalizedCity = normalizeText(city)
  if (normalizedCity === '') return 0;
  return sales.filter((sale) => Boolean(sale) && normalizeText(sale.city) === normalizedCity)
    .reduce((acc, sale) => acc + salePrice(sale), 0)
}

/**
 * ======= BLOCK FOR SALES BY DATE =======
 */

/**
 * Builds a summary for sales on a specific date.
 * @param {Array<Object>} sales - Sales records to process.
 * @param {string} date - Target date in YYYY-MM-DD format.
 * @returns {{date: string, salesCount: number, units: number, total: number}} Daily sales summary.
 */
function salesOfTheDay(sales, date) {
  const targetDate = typeof date === 'string' ? date.trim() : '';
  const daySales = sales.filter(
    (sale) => isValidSale(sale) && typeof sale?.date === 'string' && sale.date.trim() === targetDate
  );

  return {
    date: targetDate,
    salesCount: daySales.length,
    units: daySales.reduce((acc, sale) => acc + quantity(sale), 0),
    total: daySales.reduce((acc, sale) => acc + salePrice(sale), 0),
  };
}

/**
 * ======= BLOCK FOR OTHERS =======
*/

/**
 * Finds the valid sale with the highest monetary value.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {Object|null} The highest-value sale, or null when no valid sale exists.
 */
function wholesale(sales) {
  let highestSale = null;
  let highestValue = 0;
  for (const sale of sales) {
    if (!isValidSale(sale)) continue;
    const value = salePrice(sale);
    if (highestSale === null || value > highestValue) {
      highestSale = sale;
      highestValue = value;
    }
  }
  return highestSale;
}

/**
 * Calculates the average ticket value across valid sales.
 * @param {Array<Object>} sales - Sales records to process.
 * @returns {number} Average ticket value, or 0 when there are no valid sales.
 */
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

module.exports = {
  totalSold,
  totalByCity,
  unitsSold,
  wholesale,
  averageTicket,
  salesByCity,
  totalSoldM,
  unitSoldM,
  saleByCityM,
  topProductsPerValue,
  unitsPerProcduct,
  salesOfTheDay
};
