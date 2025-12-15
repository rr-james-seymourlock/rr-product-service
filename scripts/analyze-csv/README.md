# Store Coverage Analysis

Analyzes Snowflake-exported CSV data to determine store coverage in our store-registry.

## Directory Structure

```
analyze-csv/
├── store-coverage.ts      # Main analysis script
├── data/                  # CSV input files (gitignored, except example.csv)
│   └── example.csv        # Sample input data (committed)
├── reports/               # Generated reports (gitignored, except example-report.txt)
│   └── example-report.txt # Sample output report (committed)
└── README.md
```

## Usage

```bash
pnpm tsx scripts/analyze-csv/store-coverage.ts scripts/analyze-csv/data/your-file.csv
```

### Expected CSV Columns

- `storeId` (or `store_id`, `merchant_id`, `id`) - **required**
- `storeName` (or `store_name`, `merchant_name`, `name`, `domain`) - optional
- `url_ids_csv` (or `url_ids`, `ids`, `extracted_ids`) - optional, for ID extraction stats
- `product_ids` - optional, for product match stats

### Output

- Total unique stores and coverage percentage
- Row-level coverage (how many rows are from covered stores)
- ID extraction stats (% of rows with/without extracted IDs)
- Product match stats (% of rows with/without matched products)
- Per-store breakdown sorted by row count

Reports are saved to `reports/` with the format: `store-coverage_<csv-name>_<date>.txt`

## Data Files

Place Snowflake-exported CSV files in `data/`. These files are gitignored.

### Exporting Data from Snowflake

Base query:

```sql
SELECT DISTINCT
  URL,
  store_id,
  store_name,
  ARRAY_TO_STRING(url_ids, ', ') AS url_ids_csv,
  product_ids
FROM JOURNEY_LAKE.PRODUCT_URL_METADATA_EXTRACTOR_EVENTS
```

#### Common Filters

```sql
-- Filter by time range
WHERE to_date(insert_timestamp) > '2025-12-01'

-- URLs with no extracted IDs
AND (url_ids_csv IS NULL OR TRIM(url_ids_csv) = '')

-- URLs with no matched product IDs
AND (product_ids IS NULL OR ARRAY_SIZE(product_ids) = 0)
```

### Downloading and Running

1. Run your query in Snowflake
2. Export results as CSV
3. Rename file to remove spaces (e.g., `Unmatched URLs.csv` → `unmatched_urls.csv`)
4. Move to `scripts/analyze-csv/data/`
5. Run analysis:

```bash
pnpm tsx scripts/analyze-csv/store-coverage.ts scripts/analyze-csv/data/your-file.csv
```

## Example

```bash
pnpm tsx scripts/analyze-csv/store-coverage.ts scripts/analyze-csv/data/example.csv
```

See:
- `data/example.csv` - Sample CSV with 15 stores and 148 URLs
- `reports/example-report.txt` - Resulting analysis report
