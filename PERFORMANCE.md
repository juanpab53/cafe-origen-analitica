# PERFORMANCE

Scope: every function in the engine `src/analytics.js` — the Day 1 set (`totalSold`, `unitsSold`, `wholesale`, `averageTicket`, `salesByCity`), `recurringClients`, all city-total versions (the four alternatives are kept for verification), the grouping functions and the internal helpers. `salesGenerator` and the CLI scripts are not part of the engine.

## How the numbers were obtained

- `salesGenerator` built the 10,000-sale input. It uses `Math.random()` and has no fixed seed, so the generated values are not reproducible. Its bounds (`amount` 1-5, finite positive price) make every generated sale valid; they share the date `2026-09-01` and use four city names. Operation counts are deterministic for any generated array, while absolute times are machine-dependent; compare relative values.
- Instrumented functions report **operations** (`visits + comparisons` from the counter) and their measured time. Operation counts are deterministic.
- The other functions report **average milliseconds per call**, measured with `process.hrtime.bigint()` over 20 runs. `recurringClients` ran once because of its cost. Absolute times depend on the machine, so compare relative values.
- Calls used: `city = 'Medellín'`, `date = '2026-09-01'`, `k = 3`.

## Results

| Function | What it does | Time complexity | Space complexity | Justification | Measured with 10,000 sales |
| --- | --- | --- | --- | --- | --- |
| `totalSold` | Day 1. Total revenue from valid sales. | O(n) | O(1) | One loop, one numeric accumulator. | 0.581 ms |
| `totalByCity` | Groups revenue by normalized city. | O(n) | O(n) | One loop plus a `Map` and a result object with one entry per distinct city. | 5.429 ms |
| `unitsSold` | Day 1. Total units from valid sales. | O(n) | O(1) | One loop, one counter. | 0.343 ms |
| `wholesale` | Day 1. Highest-value valid sale. | O(n) | O(1) | Keeps a reference to an existing sale, not a copy. | 0.377 ms |
| `averageTicket` | Day 1. Mean value of valid sales. | O(n) | O(1) | Keeps total and count only. | 0.441 ms |
| `salesByCity` | Day 1. Revenue for one city. | O(n) | O(1) | One loop; normalized city and total are the only extra values. | 4.040 ms |
| `totalSoldM` | Total revenue with `reduce`. | O(n) | O(1) | `reduce` accumulates into one number and creates no array. | 0.285 ms |
| `unitSoldM` | Total units with `reduce`. | O(n) | O(1) | Same shape as `totalSoldM`. | 0.264 ms |
| `saleByCityM` | City total with `filter` + `reduce`. | O(n) | O(n) | `filter` builds an array with every matching sale. | 4.498 ms |
| `totalCityChain` | City total with `map`, `filter`, `map`, `reduce`. | O(n) | O(n) | Four sequential walks, three arrays and a copy of every sale. | 6.229 ms |
| `totalCitySinglePass` | City total with one loop. | O(n) | O(1) | One walk; only the normalized city and the running total are kept. | 4.083 ms |
| `topProductsPerValue` | Top `k` products by value. | O(n + p·log p), i.e. O(n) for a fixed catalog | O(n) | Builds a `Map` of all `p` products and sorts an array of all of them before taking the top `k`. | 5.574 ms |
| `unitsPerProcduct` | Units grouped by product. | O(n) | O(n) | `Map` plus result object with one entry per distinct product. | 5.496 ms |
| `salesOfTheDay` | Sales count, units and revenue for one date. | O(n) | O(n) | `filter` keeps an array of matching sales; here all 10,000 share the same date. | 0.929 ms |
| `totalSoldInstrumented` | Total revenue with operation counters. | O(n) | O(1) | Same loop as `totalSold`; the counter is supplied by the caller. | 20,000 operations; 0.854 ms |
| `wholesaleInstrumented` | Highest sale with operation counters. | O(n) | O(1) | One validity check and one maximum check per sale. | 30,000 operations; 0.512 ms |
| `totalByCityInstrumented` | City grouping with operation counters. | O(n) | O(n) | Same `Map` and object as `totalByCity`; counters add no memory. | 40,000 operations; 5.360 ms |
| `firstSale` | First record or `null`, with counters. | O(1) | O(1) | Length check and direct read of index 0. | 2 operations; 0.006 ms |
| `recurringClients` | Clients who bought more than once. | O(n²), up to O(n³) if the `includes` scans are counted | O(n) | Nested loops compare every pair; only the repeated client codes are stored. The hidden scan cost is explained in `bitacora.md`. | 667.06 ms |

## Helpers

These are called from the functions above, so they have no separate measurement. Their cost is already included in the numbers in the Results table.

| Helper | What it does | Time complexity | Space complexity | Justification |
| --- | --- | --- | --- | --- |
| `normalizeText` | Trims, removes accents and lowercases text. | O(k) on the text length, O(1) on the number of sales | O(1) | Creates one short string at a time. |
| `isValidSale` | Checks quantity and price. | O(1) | O(1) | Calls the two getters below. |
| `salePrice` | Multiplies quantity by price. | O(1) | O(1) | One multiplication. |
| `quantity` | Reads a finite amount or `0`. | O(1) | O(1) | One conversion. |
| `price` | Reads a finite price or `0`. | O(1) | O(1) | One conversion. |
| `countValidSales` | Counts valid sales. | O(n) | O(1) | One loop, one counter. |
| `countVisit` | Increments `visits`. | O(1) | O(1) | Changes a counter supplied by the caller. |
| `countComparison` | Increments `comparisons`. | O(1) | O(1) | Changes a counter supplied by the caller. |

## Projection

Method: for linear functions, `T(1,000,000) ≈ T(10,000) × 100`. For `recurringClients`, which grows with pairs of sales, the factor is `100² = 10,000`. `firstSale` does not grow with the data. The estimates assume the same machine and the same data distribution; with 1,000,000 sales, memory pressure and garbage collection can make the linear ones slower, so treat these as lower bounds.

| Function | Estimated time for 1,000,000 sales |
| --- | --- |
| `totalCityChain` | ~623 ms |
| `topProductsPerValue` | ~557 ms |
| `unitsPerProcduct` | ~550 ms |
| `totalByCity` | ~543 ms |
| `totalByCityInstrumented` | ~536 ms |
| `saleByCityM` | ~450 ms |
| `salesByCity` | ~404 ms |
| `salesOfTheDay` | ~93 ms |
| `totalSoldInstrumented` | ~85 ms (2,000,000 operations) |
| `totalSold` | ~58 ms |
| `wholesaleInstrumented` | ~51 ms (3,000,000 operations) |
| `averageTicket` | ~44 ms |
| `wholesale` | ~38 ms |
| `unitsSold` | ~34 ms |
| `totalSoldM` | ~29 ms |
| `unitSoldM` | ~26 ms |
| `firstSale` | ~0.006 ms; does not grow (2 operations) |
| `recurringClients` | ~6,670,600 ms, about 1.85 hours; the hidden `includes` scans can push it higher |

The current `report.js` calls each of `totalSold`, `unitsSold`, `averageTicket`, `wholesale`, `totalByCity`, `unitsPerProcduct` and `topProductsPerValue` once, and calls `salesOfTheDay` twice. Adding their estimates gives about **2.0 seconds** for 1,000,000 sales. If `recurringClients` were part of the report, it alone would add about 1.85 hours and would dominate everything else. `bitacora.md` gives a higher estimate (about 3.3 hours) from a different measured point; both agree on the conclusion because the difference is measurement noise and machine speed, not the growth class.

## Risks

Criterion: first, how the work grows when the data grows — quadratic or worse is a much bigger risk than linear, and constant is negligible. Second, extra memory: O(n) structures increase garbage collection and can exhaust memory, while O(1) functions stay safe. Third, the measured constant at 10,000 sales breaks ties inside the same class. Fourth, hidden repeated work, such as the `includes` scans in `recurringClients`.

1. `recurringClients` — O(n²) explicit comparisons, hidden O(n³), about 1.85 hours at 1,000,000 sales. Highest risk by a wide margin.
2. `totalCityChain` — slowest linear function, four walks, one copy per sale and three arrays.
3. `topProductsPerValue` — O(n) memory and a sort whose cost grows with the number of distinct products.
4. `unitsPerProcduct` — O(n) memory for the `Map` and the result object.
5. `totalByCity` — O(n) memory for city grouping.
6. `totalByCityInstrumented` — same memory as `totalByCity` plus counter work.
7. `saleByCityM` — keeps an array of matches.
8. `totalCitySinglePass` — linear but constant memory.
9. `salesByCity` — same cost as the single-pass version.
10. `salesOfTheDay` — keeps an array of matches; the measurement used a date that matches every sale.
11. `totalSoldInstrumented` — linear with counters, constant memory.
12. `totalSold` — linear, constant memory.
13. `wholesaleInstrumented` — linear with counters, constant memory.
14. `averageTicket` — linear, constant memory.
15. `wholesale` — linear, constant memory.
16. `unitsSold` — linear, constant memory.
17. `totalSoldM` — linear, constant memory.
18. `unitSoldM` — linear, constant memory.
19. `firstSale` — constant; no growth at all.

The helpers are the lowest risk: `normalizeText` is O(k) on a short string and the rest are O(1). Their combined cost is already reflected in the functions that call them.

## Optimization Plan

Target: `recurringClients`, the function with the highest risk.

**What work is repeated.** The nested loops evaluate `sales[i].client === sales[j].client` for every pair with `i < j`: `n(n - 1) / 2` comparisons, about 500 billion at 1,000,000 sales. Each client code is read again and again for every other sale. On top of that, every time a repeated code is found, `recurring.includes(code)` scans the list of clients already found; as that list grows, the same codes are checked over and over. So the search for "have I seen this client before?" is repeated from scratch instead of remembered.

**What information could be stored.** A `Map` or `Set` of client codes as they are seen during a single walk over the sales, plus a second `Set` of codes already added to the result. On the first occurrence, store the code; on the second, add it once to `recurring` and mark it as reported, so later purchases do not add it again or trigger another scan. An equivalent option is to count occurrences in a `Map` during one pass and then take the entries with a count greater than one. Either way, the work becomes one walk over the sales plus one walk over the distinct clients: O(n) time and O(number of distinct clients) space, with no pair comparisons and no `includes` scans.

**Details to keep.** The replacement must preserve the current output order (codes in the order their second purchase is found), must not repeat a code, and must keep the same behaviour for missing or non-string client codes. This is a design note only: v0.2 leaves `recurringClients` unchanged; the replacement belongs to Day 3.

## OBSERVATIONS

`totalByCity` and `unitsPerProcduct` are listed as O(n) space, but the justification says the result holds "one entry per distinct city/product". That is O(c) / O(p) where c and p are the number of distinct keys, not O(n). With the test data (4 cities) it is effectively O(1). Worst case O(n) only if every sale has a distinct key.

Recommendation: express space in terms of the right variable (n, c, p) consistently, and note the worst case separately.

`salesByCity`, `saleByCityM`, `totalCityChain` and `totalCitySinglePass` are four separate implementations that return the same total; `test.js` and `verify.js` exercise all four. They stay in the engine so the comparison can be reproduced, not because the report needs four copies. The table above keeps their original measurements.
