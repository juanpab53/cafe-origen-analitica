# Bitácora

Space where technical decisions and deliverables are explained regarding.

## Miniretos 1-4

    Here are the works for the first day.

### Minireto 1

#### Data Dictionary (Diccionario de datos)

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

#### Edge Cases Detected (Casos borde detectados)

| # | Issue | Evidence in the data | Decision |
| --- | --- | --- | --- |
| 1 | Inconsistent city names: the same city is stored with different capitalization. | `id: 5` has `city: 'medellín'` (lowercase), while `id: 1` and `id: 4` have `city: 'Medellín'`. | Normalize city values before grouping or reporting: trim whitespace and apply Unicode-aware title case so both variants map to `Medellín`. Keep the original value in the raw layer for traceability and add a validation rule to reject new non-canonical spellings. |
| 2 | Sale with zero units: a record has a product and a price but no quantity. | `id: 8` (`client: C06`, `Origen Huila 500 g`) has `amount: 0` and `price: 42000`. | Treat it as a non-revenue event: flag it, exclude it from units-sold and revenue calculations (otherwise revenue is unchanged but the row distorts counts and averages), and confirm with the business whether it is a cancelled order, a sample, or a data-entry error. Keep the row in the raw dataset rather than deleting it. |
| 3 | Clients are only opaque codes with no master data, so they cannot be validated and repeating codes are easy to miscount. | `client` values are codes such as `C01`–`C08`; `C01` appears in `id: 1`, `4` and `11`, and there is no client name or registry in the dataset. | Add a client catalog and validate every code against it to catch typos or unknown clients. Compute customer metrics from distinct codes (8 unique clients, not 12 rows) so repeat purchases are not counted as new customers. |
| 4 | A client whose only transaction is the zero-amount sale would disappear from valid-sale reports. | `C06` appears only in `id: 8`, the record with `amount: 0`. | After excluding zero-quantity sales, flag `C06` as a client with no valid purchase and verify whether the order should be reclassified or the client is inactive; do not silently drop the code from the client dimension. |
