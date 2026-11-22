# Bitácora

Space where technical decisions and deliverables are explained regarding.

## Miniretos 1-4

    Here are the works for the first day.

### Minireto 1

#### Data Dictionary

The table printed by `src/explore.js` is built from the `sales` array in `src/data.js`. Each record has the following properties:

| Property | Type | Meaning |
| --- | --- | --- |
| `id` | number (integer) | Unique consecutive identifier of the sales record. |
| `date` | string (`YYYY-MM-DD`) | Date on which the sale was made, in ISO calendar-date format. |
| `client` | string | Code that identifies the customer who made the purchase (for example, `C01`). |
| `product` | string | Name of the product sold, including its presentation or size when applicable (for example, `Origen Huila 500 g`). |
| `city` | string | City where the sale took place. Note that one record uses lowercase (`medellín`), so values are not normalized. |
| `amount` | number (integer) | Number of units of the product purchased in the sale. A value of `0` is present in the dataset. |
| `price` | number (integer) | Unit price of the product in Colombian pesos (COP); it does not include the quantity. |

---

#### Edge Cases Detected

| # | Issue | Evidence in the data | Decision |
| --- | --- | --- | --- |
| 1 | Inconsistent city names: the same city is stored with different capitalization. | `id: 5` has `city: 'medellín'` (lowercase), while `id: 1` and `id: 4` have `city: 'Medellín'`. | Normalize city values before grouping or reporting: trim whitespace, strip combining diacritics (`U+0300–U+036F`) and lowercase into a comparison key, so both variants become `medellin` (implemented by `Normalize` in `src/analytics.js`). Keep the original value in the raw layer for traceability and add a validation rule to reject new non-canonical spellings. |
| 2 | Sale with zero units: a record has a product and a price but no quantity. | `id: 8` (`client: C06`, `Origen Huila 500 g`) has `amount: 0` and `price: 42000`. | Treat it as a non-revenue event: flag it, exclude it from units-sold and revenue calculations (otherwise revenue is unchanged but the row distorts counts and averages), and confirm with the business whether it is a cancelled order, a sample, or a data-entry error. Keep the row in the raw dataset rather than deleting it. |
| 3 | Clients are only opaque codes with no master data, so they cannot be validated and repeating codes are easy to miscount. | `client` values are codes such as `C01`–`C08`; `C01` appears in `id: 1`, `4` and `11`, and there is no client name or registry in the dataset. | Add a client catalog and validate every code against it to catch typos or unknown clients. Compute customer metrics from distinct codes (8 unique clients, not 12 rows) so repeat purchases are not counted as new customers. |
| 4 | A client whose only transaction is the zero-amount sale would disappear from valid-sale reports. | `C06` appears only in `id: 8`, the record with `amount: 0`. | After excluding zero-quantity sales, flag `C06` as a client with no valid purchase and verify whether the order should be reclassified or the client is inactive; do not silently drop the code from the client dimension. |

---

### Minireto 2

No `reduce`, `map` or other shortcuts at this stage. Each metric gets its own pass over the data so every step is visible. The implementation lives in `src/analytics.js` and exports `totalSold`, `unitsSold`, `wholesale`, `averageTicket` and `salesByCity`.

Shared rule: `isValidSale(sale)` is `quantity(sale) > 0 && Number.isFinite(sale.amount) && Number.isFinite(sale.price)`. Invalid sales are skipped by every metric. Revenue per sale is `salePrice(sale) = sale.amount * sale.price`.

Current helpers (state of `src/analytics.js`):

| Helper | Behavior |
| --- | --- |
| `Normalize(text)` | Returns `''` for non-strings; otherwise trims, decomposes with `NFD`, removes combining diacritics with `/[\u0300-\u036f]/g` and lowercases with `toLocaleLowerCase()`. |
| `isValidSale(sale)` | The validity rule above. It reads `sale.amount` directly, so it does not guard `null`/`undefined`. |
| `salePrice(sale)` | `sale.amount * sale.price`. |
| `quantity(sale)` | Coerces `sale.amount` with `Number()` and returns `0` if it is not finite; returns `0` for a null sale. |
| `price(sale)` | Same coercion for `sale.price`; currently not used by any metric. |
| `countValidSales(sales)` | Counts valid sales with an explicit loop; currently not exported. |

#### 1. Total revenue — `totalSold`

- Traverse: every record in `sales`.
- Condition: `isValidSale(sale)`.
- Accumulate: `salePrice(sale)` into `total`.
- Initial value: `total = 0` (adding nothing must yield zero).

```text
total = 0
for each sale in sales:
    if isValidSale(sale):
        total = total + salePrice(sale)
return total
```

#### 2. Units sold — `unitsSold`

- Traverse: every record in `sales`.
- Condition: `isValidSale(sale)`.
- Accumulate: `quantity(sale)` into `units`.
- Initial value: `units = 0`.

```text
units = 0
for each sale in sales:
    if isValidSale(sale):
        units = units + quantity(sale)
return units
```

#### 3. Largest sale — `wholesale`

- Traverse: every record in `sales`.
- Condition: `isValidSale(sale)` and the sale value is greater than the current maximum.
- Accumulate: keep the highest `salePrice(sale)` and the record that produced it.
- Initial value: `highestSale = null`, `highestValue = 0`, so the first valid sale necessarily becomes the maximum.

```text
highestSale = null
highestValue = 0
for each sale in sales:
    if not isValidSale(sale): continue
    value = salePrice(sale)
    if highestSale === null or value > highestValue:
        highestSale = sale
        highestValue = value
return highestSale
```

#### 4. Average ticket — `averageTicket`

- Traverse: every record in `sales`.
- Condition: `isValidSale(sale)`.
- Accumulate: `total` and the number of valid purchases `valid`.
- Initial value: `total = 0`, `valid = 0`; guard the division so an empty dataset does not produce `NaN`.

```text
total = 0
valid = 0
for each sale in sales:
    if isValidSale(sale):
        total = total + salePrice(sale)
        valid = valid + 1
if valid === 0: return 0
return total / valid
```

---

#### Empty-array behavior (decided before testing)

| Function | `[]` returns | Reason |
| --- | --- | --- |
| `totalSold([])` | `0` | The accumulator starts at `0` and no sale is added. |
| `unitsSold([])` | `0` | No units were shipped. |
| `wholesale([])` | `null` | There is no record to return, so `null` is an explicit "no sale" sentinel; returning `undefined` or a fabricated object would be misleading. |
| `averageTicket([])` | `0` | There are no purchases; returning `0` avoids `NaN` from dividing by zero. |
| `salesByCity([], 'Medellín')` | `0` | No records match any city. |

#### Test

A single test file is kept in sync with the current exports:

- `src/test.js`: Keeps its own structure (three `cases`, `describeSale`, `console.table` of results, and a list of 18 checks printed as PASS/FAIL with an exit code).

Verified by running `node src/test.js`: 18/18 checks passed.

| Function | Full array (`sales`) | Single element (`[sales[0]]`) | Empty array (`[]`) |
| --- | --- | --- | --- |
| `totalSold` | `985000` | `84000` | `0` |
| `unitsSold` | `21` | `2` | `0` |
| `wholesale` | `sales[9]` (`id: 10`, `168000`) | `sales[0]` (`id: 1`) | `null` |
| `averageTicket` | `985000 / 11` ≈ `89545.45` | `84000` | `0` |
| `salesByCity` (Medellín) | `356000` (including lowercase `medellín`) | `84000` | `0` |

An extra test checks the zero-quantity record (`id: 8`) alone: it yields `0`, `0`, `null` and `0` respectively, confirming that it is not treated as a valid sale.

#### Manual verification 1 — `totalSold(sales)`

Hand calculation, adding `sale.amount * sale.price` row by row and skipping `id: 8` because `amount = 0`:

| Step (`id`) | amount | price | Sale value | Running total |
| --- | ---: | ---: | ---: | ---: |
| 1 | 2 | 42000 | 84000 | 84000 |
| 2 | 1 | 26000 | 26000 | 110000 |
| 3 | 1 | 95000 | 95000 | 205000 |
| 4 | 1 | 42000 | 42000 | 247000 |
| 5 | 3 | 45000 | 135000 | 382000 |
| 6 | 2 | 26000 | 52000 | 434000 |
| 7 | 1 | 120000 | 120000 | 554000 |
| 8 | 0 | 42000 | skipped | 554000 |
| 9 | 2 | 45000 | 90000 | 644000 |
| 10 | 4 | 42000 | 168000 | 812000 |
| 11 | 1 | 95000 | 95000 | 907000 |
| 12 | 3 | 26000 | 78000 | 985000 |

Manual result: **985000 COP**

#### Manual verification 2 — `wholesale(sales)`

Hand calculation, comparing each valid sale value against the running maximum:

| Step (`id`) | Sale value | Max before | Max after | Winning `id` |
| --- | ---: | ---: | ---: | ---: |
| 1 | 84000 | none | 84000 | 1 |
| 2 | 26000 | 84000 | 84000 | 1 |
| 3 | 95000 | 84000 | 95000 | 3 |
| 4 | 42000 | 95000 | 95000 | 3 |
| 5 | 135000 | 95000 | 135000 | 5 |
| 6 | 52000 | 135000 | 135000 | 5 |
| 7 | 120000 | 135000 | 135000 | 5 |
| 8 | skipped | 135000 | 135000 | 5 |
| 9 | 90000 | 135000 | 135000 | 5 |
| 10 | 168000 | 135000 | 168000 | 10 |
| 11 | 95000 | 168000 | 168000 | 10 |
| 12 | 78000 | 168000 | 168000 | 10 |

Manual result: **`sales[9]` (`id: 10`), 168000 COP**

### Minireto 3

`totalSoldM(sales)`

- **What do I traverse?** The sales array with reduce.
- **What do I filter?** Invalid sales; skip entries where isValidSale(sale) is false.
- **What do I transform?** Each valid sale into its monetary value with salePrice(sale).
- **What do I accumulate?** The total sold amount in the reducer accumulator (acc).
- **How do I group?** No grouping; I produce a single numeric total.

`unitSoldM(sales)`

- **What do I traverse?** The sales array with reduce.
- **What do I filter?** Invalid sales; skip entries where isValidSale(sale) is false.
- **What do I transform?** Each valid sale into its unit count with quantity(sale).
- **What do I accumulate?** The total number of units sold in the reducer accumulator (acc).
- **How do I group?** No grouping; I produce a single numeric total.

`saleByCityM(sales, city)`

- **What do I traverse?** The sales array with filter, then reduce.
- **What do I filter?** Sales whose normalized city matches the normalized input city (normalizeText), and I guard with Boolean(sale); if the normalized input city is empty, I return 0.
- **What do I transform?** Each matching sale into its monetary value with salePrice(sale).
- **What do I accumulate?** The total sales value for that city in the reducer accumulator (acc).
- **How do I group?** No grouping by multiple cities; I select/aggregate only the requested city into one total.

`totalByCity(sales)`

- **What do I traverse?** The sales array with a for...of loop.
- **What do I filter?** Invalid sales (!isValidSale), non-string/empty normalized cities.
- **What do I transform?** Each valid sale into salePrice(sale) and normalize the city key with normalizeText.
- **What do I accumulate?** The monetary total per city in a Map
- **How do I group?** By normalized city name in a Map, keeping the first original city label; then I convert it to a plain object { city: total }.

`unitsPerProcduct(sales)`

- **What do I traverse?** The sales array with a for...of loop.
- **What do I filter?** Invalid sales (!isValidSale), non-string/empty normalized product names.
- **What do I transform?** Each valid sale into quantity(sale) and normalize the product key with normalizeText.
- **What do I accumulate?** The unit count per product in a Map.
- **How do I group?** By normalized product name in a Map, keeping the first original product label; then I convert it to a plain object { product: units }.

`topProductsPerValue(sales, k)`

- **What do I traverse?** The sales array with a for...of loop, then the grouped values array with sort and slice.
- **What do I filter?** Invalid sales (!isValidSale), empty normalized products, and invalid k values (!Number.isFinite(limit) || limit <= 0 returns []).
- **What do I transform?** Each valid sale into salePrice(sale); the grouped result into sorted product objects [{ product, value }].
- **What do I accumulate?** The monetary value per product in a Map.
- **How do I group?** By normalized product name in a Map, keeping the first original product label; then I rank groups by value descending and take the top k.

### Minireto 4

#### Error 1 — “Bogotá appeared twice”

- **Symptom:** When grouping sales by city, the same city appeared more than once due to variations in capitalization or accents.
- **Input that reproduces it:** `[{city:'Bogotá',amount:1,price:26000},{city:'bogotá',amount:1,price:26000},{city:'BOGOTÁ',amount:1,price:26000}]`.
- **Hypothesis:** The preliminary version grouped by the raw city value (`sale.city`) without normalizing the text.
- **Test performed:** The preliminary version was simulated with a function that accumulates by `sales.city`; the result was `{ Bogotá: 26000, 'bogotá': 26000, 'BOGOTÁ': 26000 }`. In the current version, `totalByCity` returns `{"Bogotá":78000}` for the same input.
- **Cause:** The city grouping key was not normalized.
- **Fix:** `totalByCity` normalizes the key with `normalizeText` (trim, lowercase, remove diacritics), groups by normalized city in a `Map`, and preserves the first original label as the output key (`src/analytics.js`).
- **Demonstration in v0.1:** With the actual data, `Object.keys(totalByCity(sales))` returns `["Medellín","Bogotá","Cali","Pereira"]`; Bogotá appears only once, with a total of `276000`.

### Error 2 — “Average ticket returned NaN when filtering for a day with no sales”

- **Symptom:** When calculating the average ticket for a day with no sales, the result was `NaN`.
- **Input that reproduces it:** An empty array `[]`, such as the result of filtering sales for a date with no records (`sales.filter(s => s.date === '2026-09-08')`).
- **Hypothesis:** The preliminary version calculated `total / valid` without handling the `valid === 0` case, producing `0 / 0 = NaN`.
- **Test performed:** The preliminary version was simulated with `return total/valid`; for `[]`, it returned `NaN`. In the current version, `averageTicket([])` returns `0` and `Number.isNaN(averageTicket([]))` is `false`.
- **Cause:** Division by zero when there are no valid sales.
- **Fix:** `averageTicket` counts valid sales and returns `0` when `valid === 0` before dividing (`src/analytics.js`).
- **Demonstration in v0.1:** `sales.filter(s => s.date === '2026-09-08')` has length `0`; `averageTicket(...)` returns `0`, not `NaN`.
