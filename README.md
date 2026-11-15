# Jet Freight Air Cargo Rate Aggregator

[![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015%20%7C%20React%2019-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python 3.11](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Pytest](https://img.shields.io/badge/Tests-64%2F64%20Passing-success?logo=pytest)](https://pytest.org/)
[![Gateway](https://img.shields.io/badge/Gateway-BOM%20%2F%20CSMIA%20Sahar-orange?logo=aer-lingus)](https://www.csmia.aero/)

A focused procurement desk and tariff discovery engine built for **Jet Freight Logistics Ltd. (JFLL)**. It turns inconsistent airline rate sheets into instant, verifiable landed buying rates for export shipments under 500 kg moving out of the Mumbai (BOM) air cargo gateway.

---

## What It Solves

Air cargo pricing out of Mumbai has three practical problems:
1. **Incompatible circular formats:** Air India, Etihad, Emirates, Qatar Airways, and Oman Air each publish rates in completely different PDF structures (slabs, pivot tables, flat tiers, and zone matrices).
2. **Hidden ground costs:** Terminal handling, mandatory MIAL physical screening, carting, statutory AWB documentation, and destination-specific fees (AMS ex-US/Canada) get calculated manually on scrap paper.
3. **Margin mistakes:** Coordinators need an instant view of the true zero-margin buy rate before applying client markups, while commercial management needs controls over who can edit baseline charges.

This tool solves all three with automated circular ingestion, IATA TACT compliant math, dynamic terminal charges, and role-based margin controls.

---

## Core Capabilities

```
+-----------------------------------------------------------------------------------+
|                        AIR CARGO PROCUREMENT WORKFLOW                             |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Airline PDF Circulars ] ---> [ Dedicated Parser Engine (AI, EY, EK, QR, WY) ]  |
|                                                     |                             |
|                                                     v                             |
|                                       [ In-Memory O(1) Index ]                     |
|                                                     |                             |
|  [ BOM Gateway Shipment ] ----> [ IATA TACT 0.5kg Rounding & Break-Even Pivot ]    |
|   (Dest, Weight, Dims)                              |                             |
|                                                     v                             |
|                                       [ Dynamic Charges Engine ]                  |
|                                        - MIAL X-Ray (₹3.50/kg, min ₹550)          |
|                                        - Carting / Handling (₹3.00/kg)            |
|                                        - AWB Fee (₹450 flat)                      |
|                                        - AMS Filing (₹1,850 for US/CA)            |
|                                        - Statutory 18% GST                        |
|                                                     |                             |
|                                                     v                             |
|                                     +-------------------------------+             |
|                                     |    ZERO-MARGIN PURE BUY RATE  |             |
|                                     +-------------------------------+             |
|                                                     |                             |
|                                                     v                             |
|                                     [ 1-Click Margin Controller Bar ]             |
|                                     (+₹/kg, % markup, or flat margin)             |
|                                                     |                             |
|                                                     v                             |
|                                      Final Client Sell Quotation                  |
+-----------------------------------------------------------------------------------+
```

- **Dedicated Airline Parsers:** Direct drag-and-drop ingestion cards for Air India (`AI`), Etihad Airways (`EY`), Oman Air (`WY`), Emirates (`EK`), Qatar Airways (`QR`), and regional carriers.
- **IATA TACT 1.3.2 Compliance:** Automatic volumetric weight derivation (1:6000 ratio), 0.5 kg ceiling rounding, and break-even pivot optimization using binary search.
- **Live Corridor Discovery:** Instant rates for 100+ global destinations out of BOM with non-stop and connecting flight schedules.
- **Dynamic Gateway Charges:** Fully configurable statutory and terminal surcharges with corridor, commodity, carrier, and minimum weight filters.
- **Commercial Margin Desk:** Side-by-side comparison of pure buy cost and client sell price with rapid preset chips (+₹5, +₹10, +₹15, +₹20 per kg).
- **Two-Tier RBAC:** Pricing Team Head (master tariff activation, fee rules, resets) versus Pricing Coordinator (quote generation, margin tuning, rate discovery).

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+

### 1. Clone the repository
```bash
git clone git@github-company:DevAI-DeepakJFLL/jfll-air-rate-aggregator.git
cd jfll-air-rate-aggregator
```

### 2. Start the Backend API
```bash
# Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run the API server (starts on http://localhost:8000)
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Start the Frontend Application
In a separate terminal window:
```bash
cd frontend

# Install Node dependencies
npm install

# Start the development server (starts on http://localhost:3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Layout

```
jfll-air-rate-aggregator/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/     # REST routers (rates, tariffs, charges)
│   │   ├── core/                 # App configuration & RBAC token verification
│   │   ├── data/                 # Baseline tariffs & default BOM airport index
│   │   ├── schemas/              # Pydantic v2 validation contracts
│   │   └── services/
│   │       ├── break_even.py     # Binary search break-even tier pivot
│   │       ├── charges_service.py # Atomic CRUD & O(1) hash indexing for charges
│   │       ├── pdf_extractor.py  # Security validation & PDF text extraction
│   │       ├── rate_engine.py    # Landed cost calculator with LRU cache
│   │       ├── routing_graph.py  # Dijkstra transshipment network
│   │       └── tariff_registry_service.py # Carrier circular registry & inverted index
│   ├── data/                     # Persistent JSON configs (charges, carriers)
│   └── tests/                    # 64 unit and integration test specs
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (calculator)/     # Live spot rate discovery desk
│   │   │   └── admin/            # Tariff deck, charges manager, and RBAC screens
│   │   ├── components/
│   │   │   ├── admin/            # Tariff cards, preview drawer, charges table
│   │   │   ├── navigation/       # Top navigation bars and role switcher
│   │   │   └── rates/            # Search form, results grid, margin bar, modals
│   │   ├── context/              # Operator role simulation context
│   │   ├── lib/                  # API client, freight math utils, and formatters
│   │   └── types/                # TypeScript interfaces matching backend models
│   └── package.json
└── README.md
```

---

## Interactive Feature Tour

<details>
<summary><strong>1. Live Spot Rate Calculator</strong> (Click to expand)</summary>

Located on the root route (`/`):
- **Origin Airport:** Locked to Mumbai Gateway Hub (BOM / CSMIA Sahar Air Cargo Complex).
- **Destination Airport:** Searchable combobox supporting IATA airport codes, city names, and country aliases.
- **Cargo Dimensions & Units:** Supports inputs in Centimeters, Meters, or Inches, as well as direct CBM inputs.
- **Commodity Surcharges:** Automatically handles General Cargo (GCR), Pharma Cold Chain (CRT/PILA), Dangerous Goods (DGR), and Courier express classifications.
- **Quote Results Table:** Displays airline logos, direct versus transit routes, departure cutoffs, net buy rates, commercial sell rates, and audit logs.
</details>

<details>
<summary><strong>2. Tariff Ingestion Deck</strong> (Click to expand)</summary>

Located at `/admin/tariffs`:
- Lists all active carriers operating out of BOM with active circular status, validity windows, and parser signatures.
- Drag-and-drop replacement of airline circular PDFs.
- Corridors preview drawer displaying extracted rate matrices with instant destination search.
- Deletion protection guarded by the Pricing Team Head role.
</details>

<details>
<summary><strong>3. Gateway Charges Manager</strong> (Click to expand)</summary>

Located at `/admin/charges`:
- Manage mandatory terminal charges, documentation fees, screening costs, and statutory taxes.
- Real-time formula simulator testing charge applicability against sample weights, commodities, and corridors.
- Immediate cache invalidation: updates to statutory fees reflect on live quotes in sub-millisecond time.
- One-click reset to MIAL baseline defaults.
</details>

<details>
<summary><strong>4. Role-Based Governance (RBAC)</strong> (Click to expand)</summary>

Located at `/admin/security`:
- **Pricing Team Head:** Full write access. Can upload or clear active airline circulars, create custom fees, edit tax rates, and reset configurations.
- **Pricing Coordinator:** Read-only admin access. Can test tariff parsing, run spot quotes, adjust customer margin overlays, and preview corridors.
- Simulated dynamically via the header switcher using the `X-Admin-Role` header.
</details>

---

## Air Cargo Formulas Used

<details>
<summary><strong>View Freight Calculation Logic</strong> (Click to expand)</summary>

### 1. Volumetric Weight (IATA Standard)
```
Volumetric Weight (kg) = (Length cm * Width cm * Height cm * Pieces) / 6000
```
Or for cubic meter inputs:
```
Volumetric Weight (kg) = Total Volume (CBM) * 166.67
```

### 2. Chargeable Weight (TACT Rule 1.3.2)
```
Raw Weight = max(Gross Physical Weight, Volumetric Weight)
Chargeable Weight = ceil(Raw Weight * 2.0) / 2.0
```
*Always rounded up to the nearest 0.5 kg increment.*

### 3. Break-Even Pivot Rule
A shipment weighing near a weight-break threshold (such as 92 kg at the normal rate) may be cheaper if charged at the next higher tier (100 kg at the discounted tier rate):
```
Cost at current weight = Chargeable Weight * Rate(Current Tier)
Cost at next tier pivot = Min Weight(Next Tier) * Rate(Next Tier)
Billed Freight = min(Cost at current weight, Cost at next tier pivot)
```
The engine automatically pivots if the higher weight tier yields a lower base freight total.
</details>

---

## REST API Reference

| Method | Endpoint | Description | Role Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/rates/search` | Compute landed quotes across carriers ex-BOM | Public / Operator |
| `GET` | `/api/v1/rates/destinations` | List all verified destination airports | Public / Operator |
| `GET` | `/api/v1/tariffs/registry` | Fetch carrier fleet status and circular metadata | Coordinator |
| `GET` | `/api/v1/tariffs/{carrier}/rates`| Fetch extracted corridors for a carrier | Coordinator |
| `POST` | `/api/v1/tariffs/upload` | Ingest and parse an airline rate circular PDF | Coordinator |
| `DELETE`| `/api/v1/tariffs/{carrier}` | Clear active circular and revert to baseline | Pricing Head |
| `GET` | `/api/v1/charges` | List all active and baseline charge rules | Coordinator |
| `POST` | `/api/v1/charges` | Create a new custom gateway or handling charge | Pricing Head |
| `PUT` | `/api/v1/charges/{id}` | Update charge rates, minimums, or rules | Pricing Head |
| `POST` | `/api/v1/charges/reset` | Restore baseline MIAL gateway charge set | Pricing Head |

---

## Test Suite

The test suite runs with pytest and covers the TACT calculation engine, binary search break-even pivots, cache invalidation, RBAC enforcement, PDF magic byte verification, and API regressions.

```bash
# Run all 64 automated tests
PYTHONPATH=backend pytest -v backend/tests/

# Run frontend type checking
cd frontend && npx tsc --noEmit
```

---

## Environment Variables

Copy `.env.example` to `.env` in the repository root if you need to override default settings:

```bash
# Application Environment
ENVIRONMENT=development
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Security Keys
ADMIN_API_KEY=dev-admin-api-key-change-in-production
SECRET_KEY=default-insecure-secret-key-change-in-production

# Small Desk Ceiling (kg)
MAX_CHARGEABLE_WEIGHT_KG=500.0

# Ingestion Constraints
MAX_UPLOAD_SIZE_BYTES=20971520
MAX_PDF_PAGES=50
```

---

## License

Proprietary and confidential. Developed for internal operational use by **Jet Freight Logistics Ltd.** All rights reserved.
