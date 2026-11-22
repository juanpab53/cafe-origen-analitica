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

## Miniretos 5-8

### Minireto 5

#### Question

If `n` (the number of sales) is multiplied by 10, by what factor does the operation count grow for `totalSoldInstrumented`, `wholesaleInstrumented` and `totalByCityInstrumented`?

Prediction: **approximately 10x for each function** (linear growth, O(n)). Visits and the `totalSoldInstrumented` total are exactly 10x.

| Function | Visits | Comparisons | Total operations |
| --- | --- | --- | --- |
| `totalSoldInstrumented` | `n` → exactly 10x | `n` (1 validity check per sale) → exactly 10x | `2n` → exactly 10x |
| `wholesaleInstrumented` | `n` → exactly 10x | `n + v` (1 validity check per sale, 1 maximum check per valid sale) → ~10x | `2n + v` → ~10x |
| `totalByCityInstrumented` | `n` → exactly 10x | `n + v + c` (1 validity check per sale, 1 empty-key check per valid sale, 1 Map-lookup check per valid sale with a non-empty normalized city) → ~10x | `2n + v + c` → ~10x |

(`v` = valid sales, `c` = valid sales with a non-empty normalized city; `c ≤ v ≤ n`.)

Every instrumented function makes a single counted pass over the array and performs a bounded number of counted operations per element, so each total lies between `2n` and `4n`. None of them nests an iteration over `n` inside another. `totalByCityInstrumented` also iterates once over the Map's distinct cities, but that loop is uncounted, not nested, and bounded by the fixed city list. Map lookups count as one operation each. The ratio is exactly 10x only when the proportion of valid sales stays the same; with random or small inputs it may deviate slightly. Operations that are not instrumented (`salePrice`, `normalizeText`, `isValidSale`) are outside the count. This prediction is written before running any measurement.

#### Prediction vs measurement

`node src/measure.js` runs each function over data from `salesGenerator(n)` for `n = 100, 1000, 10000, 100000`. The counter adds one operation per visited element and one per evaluated condition, so the reported total is `visits + comparisons`.

| n | `totalSoldInstrumented` | `wholesaleInstrumented` | `totalByCityInstrumented` | `firstSale` |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 200 | 300 | 400 | 2 |
| 1000 | 2000 | 3000 | 4000 | 2 |
| 10000 | 20000 | 30000 | 40000 | 2 |
| 100000 | 200000 | 300000 | 400000 | 2 |

Growth factor relative to `n = 100`:

| n | `totalSoldInstrumented` | `wholesaleInstrumented` | `totalByCityInstrumented` | `firstSale` |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 1x | 1x | 1x | 1x |
| 1000 | 10x | 10x | 10x | 1x |
| 10000 | 100x | 100x | 100x | 1x |
| 100000 | 1000x | 1000x | 1000x | 1x |

The prediction was 10x for every 10x increase in `n` for the three instrumented functions. The measurement confirms it exactly: 10x, 100x and 1000x, with no deviations because `salesGenerator` always produces valid sales (`amount` between 1 and 5, finite positive `price`), so `v = n` and `c = n` in the predicted formulas. The resulting totals match `2n`, `3n` and `4n`.

#### Complexity classification

| Function | Class | Justification from the code | Justification from the numbers |
| --- | --- | --- | --- |
| `firstSale` | **O(1)** | No loop: one length check (`sales.length === 0`) and a direct read of `sales[0]`. The work does not depend on `n`. | Always 2 operations (1 comparison + 1 visit) and a 1x growth factor for every input size. |
| `totalSoldInstrumented` | **O(n)** | A single `for...of` over the sales, with one visit and one validity check per element: `2n` counted operations. | 200 → 200000 as `n` goes 100 → 100000; exactly 10x per 10x `n`. |
| `wholesaleInstrumented` | **O(n)** | One pass over the sales: one visit and one validity check per sale, plus one comparison against the running maximum per valid sale: `2n + v`. | 300 → 300000; with `v = n` this is `3n`, growing 10x per 10x `n`. |
| `totalByCityInstrumented` | **O(n)** | One pass over the sales: one visit and one validity check per sale, plus an empty-key check and a Map-lookup check per valid sale: `2n + v + c`. The later loop over distinct cities is not nested and is bounded by the fixed city list. | 400 → 400000; with `v = c = n` this is `4n`, growing 10x per 10x `n`. |

No measured function is quadratic. Each is 0(n): the code has a single pass over the input (plus, in `totalByCityInstrumented`, one separate, non-nested pass over at most `n` distinct cities), so the counted operations lie between `2n` and `4n` for any input. A quadratic algorithm would need about 100x as many operations when `n` grows 10x, or a loop over `n` nested inside another loop over `n`; the counters show exactly 10x and no such nesting exists. This assumes O(1) average cost for `Map.get`/`Map.set` and bounded-length city strings. The higher constant factor of `totalByCityInstrumented` (4 operations per sale versus 2 for `totalSoldInstrumented`) changes the cost but not the asymptotic class.

### Minireto 6

#### Trace of `recurringClients` with five sales

Input (client codes only): `['C01', 'C02', 'C01', 'C03', 'C02']`.

Counting rule: one comparison is counted for each evaluation of `sales[i].client === sales[j].client` and for each loop-condition check (`i < n`, `j < n`). `recurring.includes(...)` calls and their internal scans are reported separately because they are only evaluated after a match.

| (i, j) | Clients compared | `client === client` | `includes` evaluated? | `recurring` after |
| --- | --- | --- | --- | --- |
| (0, 1) | C01 vs C02 | false | no | [] |
| (0, 2) | C01 vs C01 | true | yes, C01 not found | [C01] |
| (0, 3) | C01 vs C03 | false | no | [C01] |
| (0, 4) | C01 vs C02 | false | no | [C01] |
| (1, 2) | C02 vs C01 | false | no | [C01] |
| (1, 3) | C02 vs C03 | false | no | [C01] |
| (1, 4) | C02 vs C02 | true | yes, C02 not found | [C01, C02] |
| (2, 3) | C01 vs C03 | false | no | [C01, C02] |
| (2, 4) | C01 vs C02 | false | no | [C01, C02] |
| (3, 4) | C03 vs C02 | false | no | [C01, C02] |

Result: `['C01', 'C02']`. The 10 rows are all pairs with `i < j`, so the function makes **10 client-to-client comparisons** for `n = 5`. It makes 2 `includes` calls, whose internal scans compare 0 and 1 entries (1 internal comparison total for this input). Loop-condition checks are 6 for `i < n` and 15 for `j < n`, giving 21. Total explicit comparisons: **31**.

#### Generalization for n sales

| Counted item | n = 5 | General n | Growth |
| --- | ---: | --- | --- |
| Client-to-client comparisons | 10 | `n(n - 1) / 2` | O(n²) |
| Loop-condition checks | 21 | `(n + 1) + n(n + 1) / 2 = (n + 1)(n + 2) / 2` | O(n²) |
| Explicit comparisons total | 31 | `n² + n + 1` | O(n²) |
| `includes` calls | 2 | at most `n(n - 1) / 2` | O(n²) |
| Internal `includes` comparisons | 1 (data-dependent) | input-dependent; worst case O(n³) | see note |

The pair count is the number of combinations of two sales, `C(n, 2) = n(n - 1) / 2`, so multiplying `n` by 10 multiplies the client comparisons by about 100. This is why the nested loops put `recurringClients` in **O(n²)**, the first quadratic example in this project (the instrumented functions were O(1) and O(n)).

Note on the cost model: `includes` scans the current `recurring` array. In this trace it adds only 1 internal comparison. If those internal comparisons are counted and many repeated clients are placed after many distinct clients, each of the O(n²) matching pairs can scan O(n) entries, giving an O(n³) worst case. The usual classification based on the explicit pair comparisons remains O(n²), and the trace above uses that rule.

#### Execution time of `recurringClients`

| n | Pairs `n(n - 1) / 2` | Time (ms) | Factor vs previous n | Factor vs n = 1000 | Pair factor vs n = 1000 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1000 | 499500 | 10.212 | - | 1.00x | 1.00x |
| 2000 | 1999000 | 27.884 | 2.73x | 2.73x | 4.00x |
| 4000 | 7998000 | 104.985 | 3.77x | 10.28x | 16.01x |
| 8000 | 31996000 | 660.349 | 6.29x | 64.66x | 64.06x |
| 16000 | 127992000 | 3059 | 4.63x | 299.55x | 256.24x |

#### Effect of doubling n on the measured time

If the time grows like `n²`, then doubling `n` should make the time about 4 times longer. The measured factors were 2.73x, 3.77x, 6.29x and 4.63x. They vary quite a bit, but they are much closer to 4 than to 2 (what we would expect if the time grew in a straight line with `n`) or to 1 (if the time did not change at all).

The measurements are not perfectly regular, and there are possible reasons for that, although I did not check them:

- **The first step (2.73x) is low.** At small sizes the times are very short (10 to 28 ms), and the first run is slower than normal because Node needs a moment to optimize the code the first time it runs.
- **The 6.29x step is high.** Possible causes are Node's automatic memory cleanup running in the middle of the test, and the computer handling larger amounts of data less efficiently. Another cause is that each `recurring.includes` check gets slower as the `recurring` list grows.
The overall picture is clearer than the individual steps. From `n = 1000` to `n = 16000`, the input grows 16 times and the time grows 299.55 times. If the program were linear, we would expect about 16 times. The number of pairs to check grows 256.24 times, and the measured time is only about 17% above that (299.55 / 256.24 ≈ 1.17), which is a small difference. This confirms that the time grows with the number of pairs, as expected for O(n²).

#### Extrapolation to larger inputs

Using the measured point `T(16000) = 3059 ms` and the quadratic model `T(n) ≈ c · n²`:

| n | Scaling factor from n = 16000 | Estimated time |
| ---: | ---: | ---: |
| 100000 | ~39x | ~119500 ms (about 2.0 minutes) |
| 1000000 | ~3900x | ~11950000 ms (about 3.3 hours) |

#### Hidden cost of `recurring.includes`

The O(n²) classification counts only the explicit `client === client` comparisons in the nested loops. The second part of the `if` is also work: `recurring.includes(...)` walks the `recurring` array from the start until it finds the client or reaches the end. `recurring` can grow to `k`, the number of distinct clients (`k ≤ n`), so one call can cost up to O(n) comparisons.

`includes` is only evaluated when a pair of sales already has the same client. The number of such matching pairs can be O(n²). In the worst case those matches happen after `recurring` has already collected many distinct clients, so each of the O(n²) calls can scan O(n) entries. The hidden cost is therefore O(n² · n) = O(n³), not O(n²).

Concrete worst case: take `k = n/4` filler clients with 2 sales each (that uses `n/2` sales). Each filler group produces one match, and after them `recurring` holds k clients. Then put `m = n/2` sales of one new client X. For X, the first matching pair scans the k filler entries and pushes X; the remaining `C(m, 2) - 1` pairs scan about k + 1 entries each. The cost is roughly `(k + 1) · C(m, 2) ≈ (n/4) · (n²/8) = n³/32`, which dominates the small `k²` cost of the filler phase. So the true worst case of this implementation is O(n³).

Why the measurements did not show it: `salesGenerator` spreads sales over many clients with only a few sales each, so `recurring` stays modest and the scans are short. The five-sale trace also hides it: the two `includes` calls scan 0 and 1 entries (1 internal comparison). The O(n²) label remains correct for the explicit pair comparisons, but the full operation count of this implementation is O(n³) in the worst case.

A `Set` would remove this hidden term: `seen.has(client)` and `seen.add(client)` are O(1) on average, so the nested pair comparisons would again be the only quadratic part.

#### CONCLUSION

The report slows down because, to find customers who bought more than once, it checks every sale against every other sale. With 1,000 sales that is about half a million checks; with 16,000 it is nearly 128 million. Doubling the number of sales does not double the work — it roughly quadruples it. On top of that, each time it finds a repeat customer it goes back through the list of customers already found, and that list keeps growing, which makes the slowest cases worse. In our test, 16,000 sales took 3 seconds; 100,000 would take about 2 minutes and one million several hours. To keep the report fast as sales grow, the way repeated customers are looked up should be changed so it does not review everything over and over.
