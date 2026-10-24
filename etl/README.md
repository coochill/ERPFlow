# ERPFlow Inventory ETL

A Python-based ETL pipeline for importing inventory data into ERPFlow. It extracts data from CSV and Excel files, standardizes column names and values, validates inventory records, generates reports, and optionally loads valid records through the authenticated Laravel API.

## Features

- **Extract:** Read inventory data from CSV and `.xlsx` files.
- **Transform:** Normalize column names, map common aliases, trim text fields, and standardize SKUs.
- **Validate:** Check required fields, quantities, prices, and duplicate SKUs.
- **Report:** Generate separate CSV files for valid records, invalid records, and pipeline summaries.
- **Load:** Submit valid records to ERPFlow's inventory import endpoint in configurable batches.
- **Authenticate:** Use a bearer token to protect the inventory import endpoint.
- **Handle failures:** Record confirmed imports, SKU conflicts, uncertain outcomes, and rows that were not submitted.

## Tech Stack

- Python 3.12
- pandas
- openpyxl
- requests
- python-dotenv
- pytest
- Docker Compose
- Laravel REST API

## Project Structure

```text
etl/
├── data/
│   ├── input/          # Source CSV and Excel files
│   └── output/         # Generated reports
├── src/
│   └── erpflow_etl/
│       ├── extract.py
│       ├── transform.py
│       ├── validate.py
│       ├── load.py
│       ├── pipeline.py
│       └── cli.py
├── tests/
├── .env.example
├── .gitignore
├── Dockerfile
├── requirements.txt
└── README.md
```

## Prerequisites

- Docker Desktop
- ERPFlow's Docker Compose services running
- An inventory CSV or Excel file

The commands below assume they are run from the ERPFlow project root.

## Configuration

Copy the example environment file if you have not created your local ETL configuration yet:

```powershell
Copy-Item .\etl\.env.example .\etl\.env
```

Configure `etl/.env`:

```dotenv
ERP_API_BASE_URL=http://nginx/api
ERP_API_TOKEN=your_shared_secret_token
```

Set the same secret as `ETL_IMPORT_TOKEN` in `backend/.env`.

**Security:** Keep `.env` files out of version control. Do not commit or share actual tokens. The import endpoint must remain protected before the application is exposed beyond a trusted development environment.

## Input Format

The pipeline accepts CSV and `.xlsx` files. A typical inventory file contains:

| Column | Required | Description |
|---|---|---|
| `sku` | Yes | Unique stock-keeping unit |
| `name` | Yes | Item name |
| `quantity` | Yes | Non-negative whole-number quantity |
| `unit_price` | Yes | Non-negative unit price |
| `description` | No | Item description |
| `reorder_level` | No | Stock threshold for replenishment |
| `unit` | No | Unit of measurement |

The transformation stage supports common column-name aliases. For example, `Product SKU` can be mapped to `sku`, and `Product Name` can be mapped to `name`.

Check the validation report for rows that do not satisfy the pipeline's validation rules before importing data.

## Running the Pipeline

### 1. Validate data without importing

Place the input file in `etl/data/input/`, then run:

```powershell
docker compose exec etl python -m erpflow_etl.cli --input data/input/inventory_sample.csv
```

Replace `inventory_sample.csv` with your actual filename.

Validation runs without making changes to ERPFlow's inventory.

### 2. Review generated reports

The default output directory is `etl/data/output/`.

| Report | Purpose |
|---|---|
| `valid_inventory.csv` | Rows that passed validation |
| `invalid_inventory.csv` | Rows that failed validation, including their validation errors |
| `import_summary.csv` | Input row counts and validation status |
| `import_results.csv` | API import results when loading is enabled |

Review invalid rows and correct the source data before importing them.

### 3. Import valid records

After reviewing the validation output and configuring the shared token, run:

```powershell
docker compose exec etl python -m erpflow_etl.cli --input data/input/inventory_sample.csv --load-to-api
```

The `--load-to-api` flag explicitly enables API loading. Without this flag, the pipeline only generates validation reports.

You can also specify the output directory and batch size:

```powershell
docker compose exec etl python -m erpflow_etl.cli --input data/input/inventory_sample.csv --output data/output --load-to-api --batch-size 100
```

Batch sizes must be between 1 and 500 records.

## Inventory Import Behavior

- New items are created with **zero stock**, even when the source file includes a nonzero quantity.
- Source quantities are retained in the import report for reference.
- Existing SKUs and duplicate SKUs in a batch are reported as conflicts rather than creating duplicate items.
- Optional item fields use the defaults defined by the Laravel API when omitted.
- The import endpoint requires a valid bearer token.

The ETL pipeline does not automatically adjust stock quantities from the source file. Inventory quantities should be managed through ERPFlow's inventory movement workflow.

## Error Handling and Recovery

The loader distinguishes between successful imports, SKU conflicts, uncertain outcomes, and rows that were not submitted.

If an API request fails or its response cannot be confirmed, the loader saves `import_results.csv` and stops instead of automatically retrying the batch.

A row marked `outcome_unknown` may have been processed by the API even though the loader could not confirm the result. **Review the report and check the corresponding SKU in ERPFlow before retrying.** This reduces the risk of duplicate or unintended imports.

Rows marked `not_submitted` were not sent because an earlier batch failed.

## Testing

Run the ETL test suite:

```powershell
docker compose exec etl pytest
```

The tests cover extraction, transformation, validation, pipeline execution, API loading, and error handling.

Run the Laravel backend tests:

```powershell
docker compose exec backend php artisan test
```

## Current Scope

This component provides a file-based inventory ETL workflow integrated with ERPFlow's Laravel API. It is designed for controlled imports with validation and explicit loading, rather than scheduled or continuous synchronization.

Future improvements could include richer import reconciliation, additional source formats, and automated ETL scheduling.
