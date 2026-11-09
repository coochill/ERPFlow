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

## MCP Server

The ETL service mounts the official Python MCP SDK's Streamable HTTP
transport at `/mcp`. The MCP server exposes ten read-only tools:

### Inventory

- `get_inventory_items(page=1)`
- `get_inventory_item(item_id)`
- `get_low_stock_items()`
- `get_inventory_movements(item_id=None, movement_type=None, page=1)`

### Suppliers

- `get_suppliers(page=1)`
- `get_supplier_details(supplier_id)`

### Purchase requests

- `get_purchase_requests(page=1)`
- `get_purchase_request_details(purchase_request_id)`

### Goods receiving

- `get_goods_receipts(page=1)`
- `get_goods_receipt_details(goods_receipt_id)`

All tools use the asynchronous Laravel API client, issue only GET requests,
and return sanitized API errors without credentials or internal response
details.

### Configuration and authentication

The ETL container requires:

- `ETL_SERVICE_TOKEN`: bearer token required by MCP HTTP clients and internal
  ETL endpoints.
- `ERP_API_BASE_URL`: Laravel API base URL, for example
  `http://nginx/api`.
- `ERP_API_TOKEN`: bearer token sent to Laravel as an `Authorization` header.
- `ERP_API_TIMEOUT`: Laravel request timeout in seconds.
- `ERP_API_CONNECT_TIMEOUT`: Laravel connection timeout in seconds.
- `MCP_TRANSPORT`, `MCP_HOST`, and `MCP_PORT`: Streamable HTTP server settings.

MCP clients connect to `http://localhost:8000/mcp` when using the Docker
Compose port mapping and must send:

```text
Authorization: Bearer <ETL_SERVICE_TOKEN>
```

Start the ETL service with Docker Compose from the repository root:

```powershell
docker compose up -d etl
```

The reusable asynchronous Laravel API client is used by the read-only
inventory MCP tools:

- `get_inventory_items(page=1)` retrieves one Laravel-paginated item page.
- `get_inventory_item(item_id)` retrieves one item and reports missing IDs
  without exposing API details.
- `get_low_stock_items()` retrieves all item pages and compares `quantity`
  with Laravel's `reorder_level` field.
- `get_inventory_movements(item_id=None, movement_type=None, page=1)`
  retrieves movement history. Because Laravel exposes movements through the
  nested `/items/{item}/movements` route, an omitted `item_id` aggregates the
  requested page for every item. Movement type filtering is applied to the
  returned records.

These tools use `ERP_API_BASE_URL`, `ERP_API_TOKEN`, and `ERP_API_TIMEOUT`,
and do not connect directly to MySQL or modify inventory. The current Laravel
item listing does not expose keyword search, and the movement API does not
expose a movement-type query parameter, so those filters are not sent as
unsupported API parameters.

The read-only supplier MCP tools use Laravel's supplier resource endpoints:

- `get_suppliers(page=1)` retrieves one paginated supplier page.
- `get_supplier_details(supplier_id)` retrieves one supplier and returns a
  clear not-found response for an unknown ID.

The supplier listing currently implements no search or filter query
parameters, so the MCP tools do not send unsupported filters. Supplier
records contain Laravel's `id`, `name`, `contact_name`, `email`, `phone`,
`address`, `notes`, `status`, and timestamp fields when returned by the API.

The read-only purchase request MCP tools use Laravel's purchase request
resource endpoints:

- `get_purchase_requests(page=1)` retrieves one paginated page. Laravel
  includes the related `supplier` and `items.item` data in each result.
- `get_purchase_request_details(purchase_request_id)` retrieves one purchase
  request with its supplier and line items.

The listing endpoint does not implement status query filtering. Laravel's
purchase request statuses are `draft`, `pending`, `approved`, and `rejected`,
but the status filter is only used by the status-update endpoint and is not
sent by these read-only tools.

The read-only goods receiving MCP tools use Laravel's goods receipt
endpoints:

- `get_goods_receipts(page=1)` retrieves one paginated page from
  `GET /goods-receipts`.
- `get_goods_receipt_details(goods_receipt_id)` retrieves one receipt from
  `GET /goods-receipts/{goodsReceipt}`.

Laravel includes the related `purchaseRequest`, `supplier`, `receivedBy`, and
`items.purchaseRequestItem.item` data in both read responses. Receipt records
include fields such as `receipt_number`, `purchase_request_id`,
`supplier_id`, `received_by`, `received_at`, `notes`, and timestamps. No
receipt filters are implemented by the listing endpoint, so the MCP tools
send only the supported `page` parameter.

## Current Scope

This component provides a file-based inventory ETL workflow integrated with ERPFlow's Laravel API. It is designed for controlled imports with validation and explicit loading, rather than scheduled or continuous synchronization.

Future improvements could include richer import reconciliation, additional source formats, and automated ETL scheduling.

### MCP testing

Run the focused MCP integration tests inside the ETL container:

```powershell
docker compose run --rm --no-deps etl python -m pytest -q tests/test_mcp.py
```

Run the complete ETL suite when the environment is ready:

```powershell
docker compose run --rm --no-deps etl python -m pytest -q
```

The installed MCP SDK (`mcp==2.3.0`) provides the compatible
`mcp.client.streamable_http.streamable_http_client` transport and
`mcp.ClientSession` client. A real client connects to
`http://localhost:8000/mcp` with the `ETL_SERVICE_TOKEN` bearer header.

Known limitations include the Laravel endpoints' lack of search/status
filters for the read-only listings and the existing MCP session manager
one-shot lifecycle behavior when the same application lifespan is reused
across tests.
