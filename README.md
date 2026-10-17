 <p align="center">
    <img src="frontend/src/assets/erp-flow.png" width="400" alt="ERPFlow logo">
</p>

<h1 align="center">ERPFLOW: INVENTORY AND BUSINESS OPERATIONS MANAGEMENT SYSTEM</h1>

<h3 align="center">Full-Stack ERP Prototype</h3>
<h5 align="center">Personal Portfolio Project · 2026</h5>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white" alt="Laravel 13">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-Enabled-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker">
</p>

## About

ERPFlow is a full-stack ERP prototype designed to explore inventory management and business operations workflows. It provides a centralized interface for managing stock items, monitoring inventory levels, and tracking changes in stock quantities.

The project uses a Laravel REST API, a React and TypeScript frontend, and a MySQL database, with Docker Compose for local development.

ERPFlow is being developed incrementally, with inventory management as its initial module and supplier management, purchasing workflows, and data integration as planned extensions.

## Features

### Inventory Management

- Create, view, update, and delete inventory items.
- Store item details, including SKU, description, unit, quantity, reorder level, and unit price.
- Search inventory items by name, SKU, or description.
- Display stock status based on each item's reorder level.
- View paginated inventory records.

### Stock Movement Tracking

- **Stock receiving:** Increase inventory quantities and record the reason for the movement.
- **Stock issuing:** Decrease inventory quantities when stock is released.
- **Insufficient-stock validation:** Reject stock issues that exceed available inventory.
- **Movement history:** View recorded stock movements, quantities, reasons, and timestamps.
- **Transactional updates:** Update item quantities and create movement records within a database transaction to keep the changes consistent.

### Dashboard Interface

- Inventory summary cards for item count, low-stock items, units in stock, and estimated stock value.
- Item management table with stock status indicators.
- Forms for creating and editing inventory items.
- Stock movement and history dialogs.
- Pagination and inventory search.

> **Note:** Some dashboard figures currently reflect the loaded page of inventory records rather than totals across the entire database.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI and Styling | CSS, Lucide React |
| Backend | PHP, Laravel REST API |
| Database | MySQL |
| Containerization | Docker, Docker Compose |
| Development Tools | Git, GitHub, VS Code |
| API Testing | PowerShell HTTP requests and manual API verification |

## Architecture

ERPFlow follows a client-server architecture:

1. **React frontend** — displays inventory records and provides forms for inventory operations.
2. **Laravel API** — validates requests, handles inventory operations, and returns JSON responses.
3. **MySQL database** — stores inventory items and stock movement records.
4. **Docker Compose** — runs the frontend, backend, web server, and database services in a local development environment.

## Database Design

### `items`

Stores the inventory records managed by the application.

- `id`
- `sku`
- `name`
- `description`
- `quantity`
- `reorder_level`
- `unit_price`
- `unit`
- Timestamps

### `inventory_movements`

Stores the history of stock receiving and issuing operations.

- `id`
- `item_id` — references the associated inventory item
- `type` — `in` or `out`
- `quantity`
- `reason`
- Timestamps

The relationship between `items` and `inventory_movements` allows each item to have multiple recorded stock movements. A foreign-key constraint prevents deleting an item that still has associated movement records.

## Inventory Consistency

Stock movements are processed using Laravel database transactions. The application locks the relevant item record before checking and updating its quantity.

For stock issuing, the API checks that sufficient inventory is available before decrementing the quantity. If the requested quantity exceeds the available stock, the operation is rejected.

Keeping the quantity update and movement record creation in the same transaction helps prevent incomplete stock operations.

## Getting Started

### Prerequisites

Install the following tools before running the project:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Visual Studio Code](https://code.visualstudio.com/) (recommended)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/coochill/ERPFlow.git
cd ERPFlow
```

**2. Configure environment variables**

Follow the environment setup documented in the backend configuration. Copy the example environment file if provided:

```bash
cp backend/.env.example backend/.env
```

Configure the database connection to match the Docker Compose service settings. Do not commit your actual `.env` file or credentials.

**3. Start the Docker services**

```bash
docker compose up -d --build
```

**4. Prepare the Laravel application**

Generate an application key if one has not already been configured:

```bash
docker compose exec backend php artisan key:generate
```

Run the database migrations:

```bash
docker compose exec backend php artisan migrate
```

**5. Access the application**

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- MySQL host port: `3307` (for database clients running on your computer)

The application URLs and ports assume the current local Docker Compose configuration.

## Development Commands

**Build the frontend**

```bash
docker compose exec frontend npm run build
```

**Run Laravel tests**

```bash
docker compose exec backend php artisan test
```

**List API routes**

```bash
docker compose exec backend php artisan route:list --path=api
```

**Stop the services**

```bash
docker compose down
```

## Roadmap

- [x] Inventory CRUD operations
- [x] Stock receiving and issuing
- [x] Stock movement history
- [x] Transactional stock updates
- [ ] Supplier management
- [ ] Purchase request workflows
- [ ] CSV import and data validation
- [ ] ETL workflow orchestration
- [ ] Role-based access control and approval workflows
- [ ] AI-assisted policy document retrieval
- [ ] Audit logging and automated test coverage

## Project Status

ERPFlow is an actively developed portfolio project. The inventory module is implemented, including item management, stock movement recording, movement history, and validation against insufficient stock.

Additional business operations and data integration features are planned for future development.

## Author

**Joy Susette V. Domingo**

- GitHub: [@coochill](https://github.com/coochill)
- Portfolio: [joysusette.vercel.app](https://joysusette.vercel.app)

