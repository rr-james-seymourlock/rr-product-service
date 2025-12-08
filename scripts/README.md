# Local Analysis Scripts

Scripts for analyzing Snowflake-exported CSV data against our packages.

## Directory Structure

```
scripts/
├── analyze-csv/       # Analysis scripts
│   └── store-coverage.ts  # Check store coverage in registry
├── data/              # CSV files (gitignored, except example.csv)
│   └── example.csv        # Sample input data (committed)
├── reports/           # Generated reports (gitignored, except example-report.txt)
│   └── example-report.txt # Sample output report (committed)
├── tsconfig.json      # TypeScript config for scripts
└── README.md
```

## Usage

### Store Coverage Analysis

Analyzes a CSV to determine which storeIds are in our store-registry:

```bash
pnpm tsx scripts/analyze-csv/store-coverage.ts scripts/data/your-file.csv
```

Expected CSV columns (case-insensitive):

- `storeId` (or `store_id`, `merchant_id`, `id`)
- `storeName` (or `store_name`, `merchant_name`, `name`, `domain`) - optional
- `url_ids_csv` (or `url_ids`, `ids`, `extracted_ids`) - optional, for ID extraction stats

Output includes:

- Total unique stores and coverage percentage
- Row-level coverage (how many rows are from covered stores)
- ID extraction stats (% of rows with/without extracted IDs)
- Per-store ID extraction percentage
- Lists of covered and missing stores sorted by row count

Reports are saved to `scripts/reports/` with the format:
`store-coverage_<csv-name>_<date>.txt`

## Data Files

Place Snowflake-exported CSV files in `scripts/data/`. These files are gitignored.

### Exporting Data from Snowflake

Base query with correct column names:

```sql
SELECT DISTINCT
  URL,
  store_id,
  store_name,
  ARRAY_TO_STRING(url_ids, ', ') AS url_ids_csv,
  product_ids
FROM JOURNEY_LAKE.PRODUCT_URL_METADATA_EXTRACTOR_EVENTS
```

#### Filtering by Time Range

```sql
WHERE to_date(insert_timestamp) > '2025-12-01'
```

#### URLs with No Extracted IDs

Useful for reviewing if our regex patterns are working correctly (note: some URLs legitimately don't contain product IDs):

```sql
AND (url_ids_csv IS NULL OR TRIM(url_ids_csv) = '')
```

#### URLs with No Matched Product IDs

Add this to find URLs where no matching `product_id` was found in our product catalog. This happens after the BE sends extracted IDs to the GSP service to check if they exist in the catalog (separate service):

```sql
AND (product_ids IS NULL OR ARRAY_SIZE(product_ids) = 0)
```

#### Example: Full Query for Unmatched URLs

```sql
SELECT DISTINCT
  URL,
  store_id,
  store_name,
  ARRAY_TO_STRING(url_ids, ', ') AS url_ids_csv,
  product_ids
FROM JOURNEY_LAKE.PRODUCT_URL_METADATA_EXTRACTOR_EVENTS
WHERE to_date(insert_timestamp) > '2025-12-01'
  AND (url_ids_csv IS NULL OR TRIM(url_ids_csv) = '')
```

### Downloading and Running Analysis

1. Run your query in Snowflake
2. Export the results as CSV
3. **Important:** Rename the file to remove any spaces (e.g., `Unmatched Product Urls.csv` → `unmatched_product_urls.csv`)
4. Move the CSV file to `scripts/data/`
5. Run the analysis script:

```bash
pnpm tsx scripts/analyze-csv/store-coverage.ts scripts/data/your-file.csv
```

The script will output the report to the console and save it to `scripts/reports/`.

## Reports

Generated reports are saved to `scripts/reports/`. These files are also gitignored.

## Examples

See the example files in their respective directories:

- `scripts/data/example.csv` - Sample CSV with 15 stores and 148 URLs showing various data scenarios
- `scripts/reports/example-report.txt` - The resulting analysis report

To run the example yourself:

```bash
pnpm tsx scripts/analyze-csv/store-coverage.ts scripts/data/example.csv
```
