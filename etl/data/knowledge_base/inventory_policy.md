# Inventory and Stock Replenishment Policy

> **FICTIONAL SAMPLE DATA FOR SOFTWARE TESTING ONLY.** This document describes fictional business rules for "Northstar Trading Co.," a fictional company. It is not a real company's policy, does not constitute legal, financial, or regulatory guidance, and makes no claim of compliance with any law or regulation.

| Field | Value |
|---|---|
| Policy ID | NTC-INV-001 |
| Version | 1.2 |
| Effective Date | 2026-01-15 |
| Policy Owner | Warehouse Operations Manager |
| Approved By | Chief Operating Officer |
| Next Review Date | 2027-01-15 |

## 1. Purpose

This policy sets the rules for how Northstar Trading Co. ("Northstar") maintains stock levels, triggers replenishment orders, counts inventory, and handles stock adjustments, so that products are available to customers without holding excess cash in inventory.

## 2. Scope

This policy applies to all finished goods held in Northstar's distribution centers in Riverton and Eastbrook, and to all staff in Warehouse Operations, Procurement, and Finance who handle stock levels or stock adjustments. It does not cover consignment stock held at customer sites, which is governed by the Consignment Agreements Standard (not part of this sample set).

## 3. Definitions

- **SKU:** A unique stock-keeping unit identifying one product variant.
- **ABC Class:** A ranking of SKUs by annual sales value. Class A is the top 20% of SKUs by value, Class B is the next 30%, and Class C is the remaining 50%.
- **Average Daily Demand (ADD):** Units sold over the trailing 90 days divided by 90.
- **Lead Time:** Number of calendar days between placing a purchase order and receiving stock at the distribution center, as recorded in the supplier master file.
- **Safety Stock:** Extra stock held to cover demand variation. For Class A SKUs it equals 7 days of ADD. For Class B it equals 4 days of ADD. For Class C it equals 2 days of ADD.
- **Reorder Point (ROP):** The stock level at which a replenishment order must be raised. ROP = (ADD × Lead Time) + Safety Stock.
- **Stock Variance:** The difference between the system quantity and the physical count.

## 4. Rules

**4.1 Reorder Point Calculation.** The Inventory Planner recalculates ROP for every active SKU on the first business day of each month.

**4.2 Replenishment Trigger.** When available stock (on-hand minus allocated) falls to or below ROP, the system generates a Replenishment Request. The Inventory Planner must convert it into a Purchase Requisition within 1 business day.

**4.3 Order Quantity.** The standard order quantity is the amount needed to restore stock to ROP plus 30 days of ADD. Orders for Class C SKUs may not exceed 60 days of ADD.

**4.4 Cycle Counting.** Physical counts occur on the following schedule:
- Class A SKUs: monthly
- Class B SKUs: quarterly
- Class C SKUs: annually

**4.5 Stock Variance Thresholds.**
- Variance up to 2% of system value and up to $500: the Warehouse Supervisor may approve the adjustment.
- Variance above 2% or above $500, up to $5,000: the Inventory Controller must approve, with a written root-cause note.
- Variance above $5,000: the Finance Controller must approve before the adjustment posts.

**4.6 Stock Adjustment Deadline.** All approved count adjustments must post to the system within 2 business days of the count.

**4.7 Returned Stock.** Returned goods must be processed in accordance with NTC-RET-001, Section 4.4 (Restocking Eligibility). Items may be returned to available inventory only after passing the required condition inspection and meeting the applicable restocking requirements.

## 5. Approval Responsibilities

| Role | Responsibility |
|---|---|
| Inventory Planner | Calculates ROP, raises Purchase Requisitions |
| Warehouse Supervisor | Runs cycle counts, approves variances up to the Section 4.5 limit |
| Inventory Controller | Approves variances above 2% or $500, up to $5,000 |
| Finance Controller | Approves variances above $5,000 |
| Warehouse Operations Manager | Owns this policy and reviews monthly ROP exceptions |

## 6. Exceptions

- **Promotional stock builds:** Approved in writing by the Sales Manager. The Inventory Planner may raise an order above the standard quantity, up to 90 days of ADD.
- **Supplier stockouts:** When a supplier cannot meet a lead time, the Inventory Planner must notify the Procurement Lead within 1 business day. The Procurement Lead decides whether to source an alternative under NTC-PRC-001.
- **Discontinued SKUs:** Replenishment stops once the SKU is marked discontinued. Remaining stock is sold down without new orders.

## 7. Review Procedure

The Warehouse Operations Manager reviews this policy every January. Changes require approval by the Chief Operating Officer and must be published to the policy repository with a new version number and effective date. Previous versions are retained for 3 years.

---

### Sample Test Questions

1. **Q:** What is the safety stock for a Class B SKU?
   **A:** 4 days of Average Daily Demand.
2. **Q:** Who approves a stock variance of $3,000 that is 1% of system value?
   **A:** The Inventory Controller, because the variance is above $500.
3. **Q:** How often are Class A SKUs counted?
   **A:** Monthly.
4. **Q:** What is the maximum order quantity for a Class C SKU?
   **A:** 60 days of Average Daily Demand.
5. **Q:** Within how many business days must a Replenishment Request become a Purchase Requisition?
   **A:** 1 business day.