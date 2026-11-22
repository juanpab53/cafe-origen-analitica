# Café Origen Analítica

A small analytics engine in JavaScript (Node.js) for processing Café Origen sales records. It works with an in-memory local dataset and provides functions for calculating business metrics, with record validation and text normalization for grouping cities and products.

## Running

Node.js must be installed.

From the project root:

```bash
# Main report
node src/report.js

# Manual tests and checks
node src/test.js

# Compare loop-based metrics with array-method implementations
node src/verify.js

# Initial data exploration
node src/explore.js
```

## Questions This Project Answers

- Overall summary: What are the total sales, how many units were sold, what is the average ticket, and which sale had the highest value?
- Sales by city: How much was sold in each city, grouping variants such as Medellín/medellín?
- Units per product: How many valid units were sold for each product?
- Top products by value: Which three products have the highest total sales value?
- Sales for a specific city: What is the total sales value for a given city? (`salesByCity`)
- Daily summary: How many sales, units, and what total revenue were recorded on a specific date, including dates with no sales? (`salesOfTheDay`)
- Data quality: Are the metrics consistent between loop-based and array-method implementations? (`verify.js`)
