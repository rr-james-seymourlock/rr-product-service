# CBSP Store Coverage

Analyzes store-registry coverage against CBSP's catalog-enabled stores.

## Directory Structure

```
cbsp-coverage/
├── store-coverage.ts     # Main script
├── data/                 # Store data (stores.json is committed)
│   └── stores.json       # All CBSP stores with productSearchEnabled status
├── reports/              # Generated coverage reports (gitignored)
│   └── coverage_YYYY-MM-DD.txt
└── README.md
```

## Usage

### Generate Coverage Report

Uses cached `data/stores.json`:

```bash
pnpm tsx scripts/cbsp-coverage/store-coverage.ts
```

### Refresh Data and Generate Report

Fetches fresh data from CBSP API, updates `stores.json`, then generates report:

```bash
pnpm tsx scripts/cbsp-coverage/store-coverage.ts --refresh
```

## Output

### stores.json

Contains all CBSP stores with their catalog status:

```json
{
  "generatedAt": "2025-12-15T00:00:00.000Z",
  "totalStores": 4000,
  "catalogEnabled": 500,
  "catalogDisabled": 3500,
  "stores": [
    { "id": 1001, "name": "Store A", "productSearchEnabled": false },
    { "id": 5246, "name": "Target", "productSearchEnabled": true }
  ]
}
```

### Coverage Report

Shows:
- Total CBSP stores (catalog enabled vs disabled)
- Store registry config count
- Coverage percentage (registry stores / catalog-enabled stores)
- List of covered stores (in both registry and CBSP catalog)
- List of missing stores (in CBSP catalog but not in registry)
- Warning for any stores in registry that aren't catalog-enabled

## Workflow

1. Run `--refresh` periodically to sync CBSP data
2. Commit updated `stores.json` to track changes over time
3. Run without flags to generate quick coverage reports
4. Use missing stores list to prioritize which stores to onboard next
