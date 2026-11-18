# Jet Freight Logistics Limited
## Air Freight Buy Rate Engine: Logic & Mathematical Specification

**Document Version:** 1.0  
**Target Audience:** Pricing & Revenue Management Team  
**System Status:** Production Implementation Verified  
**Scope:** Procurement Cost ex-BOM (Zero-Margin Landed Buy Rate)

---

### 1. Executive Summary & Engine Architecture

The Rate Aggregator Tool calculates the **Net Landed Buy Rate** (Procurement Cost ex-BOM to carrier and terminal) before any commercial sales markup or profit margin is added.

The calculation pipeline consists of 5 deterministic stages:

```
[1. Dimensions & Gross Weight]
              │
              ▼
    Stage 1: Chargeable Weight (IATA TACT 1.3.2)
              │
              ▼
    Stage 2: Rate Slab Selection & Break-Even Pivot (IATA TACT 1.3.3)
              │
              ▼
    Stage 3: Airline Surcharges (FSC + SSC: ALL_IN vs NET_NET++)
              │
              ▼
    Stage 4: Origin Gateway Charges ex-BOM (XBC, CTG, CGC, CCC, etc.)
              │
              ▼
    Stage 5: Statutory Taxes (5% GST) & Landed Buy Rate
```

#### Core Pricing Formula (Zero-Margin Buy Rate)

$$\text{Net Subtotal} = \text{Base Freight (Pivot-Optimized)} + \text{Airline Surcharges (FSC + SSC)} + \text{Origin Gateway Charges}$$

$$\text{Statutory GST (5\%)} = \text{round}(\text{Net Subtotal} \times 0.05, 2)$$

$$\text{Total Landed Buy} = \text{Net Subtotal} + \text{Statutory GST}$$

$$\text{Effective Buy Rate per KG} = \text{round}\left(\frac{\text{Total Landed Buy}}{\text{Chargeable Weight}}, 2\right)$$

---

### 2. Stage 1: Chargeable Weight Determination (IATA TACT Rule 1.3.2)

Air freight billing is determined by the greater of physical scale weight and volumetric weight:

1. **Volumetric Weight (Dimensional Metric):**
   - Standard Air Freight Cubic Ratio: 1:6000 ($1\text{ m}^3 = 166.67\text{ kg}$).
   - Formula:
     $$W_{\text{vol}} = \frac{\sum_{i} \left( \text{Length}_i(\text{cm}) \times \text{Width}_i(\text{cm}) \times \text{Height}_i(\text{cm}) \times \text{Pieces}_i \right)}{6000}$$
   - When volume is given directly in CBM:
     $$W_{\text{vol}} = \text{CBM} \times 166.67$$

2. **Gross Actual Weight:**
   - Physical scale weight ($W_{\text{actual}}$) in kilograms. Optional when package dimensions or CBM volume are provided.

3. **Flexible Weight Input Modes:**
   - **Scenario A (Scale Weight Only):** When dimensions are unknown, $\text{CW} = \lceil W_{\text{actual}} \times 2 \rceil / 2$.
   - **Scenario B (Dimensions / CBM Only):** When scale weight is pending warehouse weighing, $\text{CW} = \lceil W_{\text{vol}} \times 2 \rceil / 2$.
   - **Scenario C (Both Provided):** $\text{CW} = \lceil \max(W_{\text{actual}}, W_{\text{vol}}) \times 2 \rceil / 2$.

4. **IATA Half-Kilogram Rounding Rule:**
   - Chargeable Weight must round up to the next half-kilogram (0.5 kg):
     $$\text{CW} = \frac{\lceil \max(W_{\text{actual}}, W_{\text{vol}}) \times 2 \rceil}{2}$$

5. **Heavy Cargo Operational Directive:**
   - If $\text{CW} \ge 500.0\text{ kg}$, the shipment is flagged as **Heavy Cargo**, requiring advance airline freighter capacity confirmation.

---

### 3. Stage 2: Rate Slab Selection & Break-Even Pivot (IATA TACT Rule 1.3.3)

Airlines publish stepped weight break tariffs (e.g., Minimum Charge, +45kg, +100kg, +300kg, +500kg, +1000kg).

#### Step A: Natural Slab Lookup
Using binary search ($O(\log T)$ via `bisect_right`), the engine identifies the natural weight tier:
$$\text{Natural Slab: } \text{min\_weight}_k \le \text{CW} < \text{min\_weight}_{k+1}$$

#### Step B: Break-Even Pivot Optimization ("Higher Slabs Rule")
Under IATA TACT Rule 1.3.3, if billing at the minimum weight of a higher tier yields a lower total base freight cost than billing at the natural tier, the client is billed at the higher tier minimum weight.

The engine evaluates candidate tiers up to $+300\text{ kg}$ above the natural tier:

$$\text{Pivot Weight Point} = \frac{\text{Higher\_Slab\_Min\_Weight} \times \text{Higher\_Slab\_Rate}}{\text{Natural\_Slab\_Rate}}$$

- **Optimization Trigger:**
  $$\text{If } \text{CW} > \text{Pivot Weight Point}:$$
  - $\text{Billed Weight} = \text{Higher\_Slab\_Min\_Weight}$
  - $\text{Applied Rate} = \text{Higher\_Slab\_Rate}$
  - $\text{Base Freight} = \text{Higher\_Slab\_Min\_Weight} \times \text{Higher\_Slab\_Rate}$
  - $\text{Client Savings} = (\text{CW} \times \text{Natural\_Slab\_Rate}) - \text{Base Freight}$

#### Step C: Airline Minimum Charge Floor
If the calculated Base Freight is below the airline minimum charge published in the tariff:
$$\text{Base Freight} = \max(\text{Base Freight}, \text{Minimum Charge})$$

---

### 4. Stages 3 & 4: Surcharges & Mumbai Origin Gateway Terminal Charges

#### Stage 3: Fuel & Security Surcharges (FSC & SSC)

| Pricing Model | Fuel Surcharge (FSC) | Security Surcharge (SSC) |
| :--- | :--- | :--- |
| **ALL_IN (Consolidated)** | INR 0.00 (Included in base rate) | INR 0.00 (Included in base rate) |
| **NET_NET_PLUS_PLUS** | $\max(\text{CW} \times \text{Rate}_{\text{fsc}}, \text{Floor}_{\text{fsc}})$ | $\max(\text{CW} \times \text{Rate}_{\text{ssc}}, \text{Floor}_{\text{ssc}})$ |

#### Stage 4: Mumbai Origin Gateway Terminal Charges ex-BOM

All origin gateway handling charges at Chhatrapati Shivaji Maharaj International Airport (BOM) are managed dynamically through the configuration service with role-based access control:

| Charge Code | Name / Description | Standard BOM Tariff | Billing Trigger Condition |
| :--- | :--- | :--- | :--- |
| **XBC** | Airport Security & Screening (X-Ray) | INR 3.50 / kg (Min INR 550.00) | Mandatory on all shipments |
| **CTG** | Cargo Terminal Handling (Aviation Handlers) | INR 3.00 / kg (Min INR 500.00) | Mandatory on all shipments |
| **CGC** | e-AWB EDI Transmission Fee | INR 800.00 Flat per shipment | Mandatory on all shipments |
| **CCC** | US/Canada Regulatory Manifest (AMS / ACI) | INR 950.00 Flat per shipment | Destined to US or Canada |
| **RAC** | Dangerous Goods (DGR) Acceptance Fee | INR 3,500.00 Flat per shipment | Hazardous Cargo only |
| **COL** | Cold Chain / Temperature Controlled Handling | INR 2,500.00 Flat per shipment | Pharma / Reefer Cargo only |

---

### 5. Stage 5: Statutory Taxes & Landed Buy Rate

Under Indian Goods and Services Tax regulations:
- International outbound air freight and terminal handling charges attract statutory GST at 5% (IGST for interstate / integrated freight forwarding, or CGST 2.5% + SGST 2.5%).

$$\text{Pre-Tax Subtotal} = \text{Base Freight} + \text{FSC} + \text{SSC} + \text{Origin Charges}$$

$$\text{Statutory 5\% GST} = \text{round}(\text{Pre-Tax Subtotal} \times 0.05, 2)$$

$$\text{Total Landed Buy} = \text{Pre-Tax Subtotal} + \text{Statutory GST}$$

$$\text{Effective Buy Rate per KG} = \text{round}\left(\frac{\text{Total Landed Buy}}{\text{CW}}, 2\right)$$

---

### 6. Concrete Walkthrough & Verification Test Case for Pricing Team

This verification case can be run against any manual pricing spreadsheet to validate engine parity:

#### Scenario Parameters:
- **Origin:** BOM (Mumbai CSMIA, India)
- **Destination:** DXB (Dubai International, UAE)
- **Cargo:** General Cargo (Non-DG, Non-Perishable)
- **Packaging:** 4 boxes, each 80 cm x 60 cm x 50 cm
- **Gross Actual Weight:** 140.0 kg
- **Airline Tariff Slabs:**
  - Minimum Charge: INR 3,000.00
  - +45 kg: INR 140.00 / kg
  - +100 kg: INR 125.00 / kg
  - +300 kg: INR 98.00 / kg
- **Pricing Model:** ALL_IN

#### Step-by-Step Calculation:

| Step | Operation | Formula & Values | Amount (INR) |
| :---: | :--- | :--- | ---: |
| **1** | Volumetric Weight | $(80 \times 60 \times 50 \times 4) / 6000 = 960,000 / 6000$ | 160.00 kg |
| **2** | Chargeable Weight (CW) | $\lceil \max(140.0, 160.0) \times 2 \rceil / 2$ | 160.00 kg |
| **3** | Natural Slab Selection | Natural tier (+100kg): $160.0\text{ kg} \times \text{INR } 125.00$ | INR 20,000.00 |
| **4** | Break-Even Pivot Check | Higher slab (+300kg): $300 \times 98 = \text{INR } 29,400$<br>Pivot Point: $29,400 / 125 = 235.20\text{ kg}$<br>Since $\text{CW} (160.0\text{ kg}) < 235.20\text{ kg}$, no pivot is triggered. | INR 20,000.00 |
| **5** | Surcharges (FSC + SSC) | ALL_IN pricing model (Consolidated in base rate) | INR 0.00 |
| **6** | Screening / X-Ray (XBC) | $\max(160.0\text{ kg} \times 3.50, 550.00) = \max(560.00, 550.00)$ | INR 560.00 |
| **7** | Terminal Handling (CTG) | $\max(160.0\text{ kg} \times 3.00, 500.00) = \max(480.00, 500.00)$ | INR 500.00 |
| **8** | e-AWB Processing (CGC) | Mandatory EDI transmission fee ex-BOM | INR 800.00 |
| **9** | **Pre-Tax Net Subtotal** | $20,000.00 + 0.00 + 560.00 + 500.00 + 800.00$ | **INR 21,860.00** |
| **10** | **Statutory GST (5%)** | $\text{round}(21,860.00 \times 0.05, 2)$ | **INR 1,093.00** |
| **11** | **TOTAL LANDED BUY** | **$21,860.00 + 1,093.00$** | **INR 22,953.00** |

#### Effective Buy Rate:
$$\text{Effective Buy Rate per KG} = \frac{\text{INR } 22,953.00}{160.00\text{ kg}} = \text{\textbf{INR 143.46 / kg}}$$

Component breakdown per kg:
- Base Freight: INR 125.00 / kg
- Surcharges: INR 0.00 / kg
- Origin Handling ex-BOM: INR 11.63 / kg
- Statutory GST (5%): INR 6.83 / kg
- **Total Effective Buy Rate: INR 143.46 / kg**

---

### 7. Regulatory Directives & Aircraft Equipment Constraints

The engine validates operational and regulatory constraints to prevent costly offloads or airline rejections:

1. **Narrowbody Cargo Door Clearance (86 cm):**
   - Applies to Airbus A320, A321, and Boeing 737 passenger flights.
   - Any package with height $> 86\text{ cm}$ triggers: *"Exceeds narrowbody door clearance (86cm). Widebody or Freighter equipment required."*

2. **Widebody Lower-Deck Door Clearance (160 cm):**
   - Applies to Boeing 777, Airbus A350, and Boeing 787 passenger flights.
   - Packages with height $> 160\text{ cm}$ require allocation on dedicated Main Deck Freighters (MD/Freighter).

3. **Pharma Packaging Weight Standards:**
   - Shipments categorized as Pharmaceutical/Healthcare with package gross weights $> 100\text{ kg}$ per carton trigger a structural box integrity warning.

4. **Wood Packaging Regulations (ISPM-15):**
   - Raw wood boxes or untreated pallets trigger mandatory ISPM-15 heat-treatment and IPPC stamp compliance checks.

---

### 8. Document Files & Deliverables

The specification is published in two formats in the workspace:
1. Microsoft Word Document: [BUY_RATE_CALCULATION_SPECIFICATION.docx](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Rate%20Aggregator%20Tool/BUY_RATE_CALCULATION_SPECIFICATION.docx)
2. Markdown Specification: [BUY_RATE_CALCULATION_SPECIFICATION.md](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Rate%20Aggregator%20Tool/BUY_RATE_CALCULATION_SPECIFICATION.md)
