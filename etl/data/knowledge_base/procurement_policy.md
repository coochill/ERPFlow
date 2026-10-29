# Procurement and Purchase Approvals Policy

> **FICTIONAL SAMPLE DATA FOR SOFTWARE TESTING ONLY.** This document describes fictional business rules for "Northstar Trading Co.," a fictional company. It is not a real company's policy, does not constitute legal, financial, or regulatory guidance, and makes no claim of compliance with any law or regulation.

| Field | Value |
|---|---|
| Policy ID | NTC-PRC-001 |
| Version | 2.0 |
| Effective Date | 2026-02-01 |
| Policy Owner | Procurement Lead |
| Approved By | Chief Financial Officer |
| Next Review Date | 2027-02-01 |

## 1. Purpose

This policy sets the rules for requesting, approving, and placing purchases for Northstar Trading Co. ("Northstar"). It ensures spending is authorized at the right level, supplier selection is documented, and no purchase is committed without a valid approval.

## 2. Scope

This policy applies to all purchases of goods and services by Northstar, including stock orders under NTC-INV-001, operating supplies, IT equipment, and professional services. It applies to all staff who raise requisitions or approve spend.

## 3. Definitions

- **Purchase Requisition (PR):** An internal request to buy goods or services, submitted in the procurement system.
- **Purchase Order (PO):** A formal order issued to a supplier after a PR is approved. A PO is required before any supplier is paid.
- **Purchase Value:** The total value of a PR including tax and shipping, in US dollars.
- **Approved Supplier:** A supplier that has completed onboarding under NTC-SUP-001 and has an active status in the supplier master file.
- **Blanket PO:** A PO covering recurring purchases from one supplier over a defined period, capped at a fixed total value.

## 4. Rules

**4.1 Approval Thresholds.** Every PR must be approved by the role matching its Purchase Value:

| Purchase Value | Required Approver |
|---|---|
| Up to $2,500 | Buyer |
| $2,501 to $10,000 | Procurement Lead |
| $10,001 to $50,000 | Finance Controller |
| Above $50,000 | Chief Financial Officer |

**4.2 No Self-Approval.** A requester may never approve their own PR, regardless of value.

**4.3 Split Purchases Prohibited.** Splitting a single requirement into multiple PRs to stay under an approval threshold is prohibited. Purchases for the same item from the same supplier within 30 days are treated as one purchase for threshold purposes.

**4.4 Approved Supplier Requirement.** POs may only be issued to suppliers with Approved Supplier status. A PO issued to an unapproved supplier must be cancelled and reported to the Procurement Lead.

**4.5 Three-Quote Rule.** For purchases above $10,000, at least three written quotes from different Approved Suppliers must be attached to the PR. If fewer than three are available, the requester must document the reason.

**4.6 Approval Deadline.** Approvers must act on a PR within 2 business days of receiving it. After 2 business days, the PR escalates to the next approver tier automatically.

**4.7 Receipt Matching.** Supplier invoices may be paid only after goods or services are received and matched to the PO within 3 business days of delivery.

**4.8 Blanket POs.** Blanket POs may not exceed $75,000 total value or cover more than 12 months. Any increase requires a new approval at the tier matching the new total.

## 5. Approval Responsibilities

| Role | Responsibility |
|---|---|
| Requester | Submits complete PR with justification and quotes where required |
| Buyer | Approves PRs up to $2,500, issues POs |
| Procurement Lead | Approves $2,501 to $10,000, owns this policy, handles escalations |
| Finance Controller | Approves $10,001 to $50,000, verifies budget availability |
| Chief Financial Officer | Approves above $50,000 and any Blanket PO increase above $75,000 |

## 6. Exceptions

- **Emergency purchases:** Where a delay would cause a safety hazard or a shutdown of a distribution center, the Operations Director may approve a purchase up to $15,000 by email. A formal PR must be completed within 1 business day.
- **Sole-source purchases:** A single-source supplier is permitted when only one supplier can meet the specification. The requester must document the reason and the Procurement Lead must approve, regardless of value.
- **Non-stock budget items:** Items within an approved annual budget still require a PR, but the approval tier is based on Purchase Value, not the budget line.

## 7. Review Procedure

The Procurement Lead reviews this policy every February, with input from Finance. Changes require CFO approval. Each new version is published to the policy repository with an effective date. Previous versions are retained for 3 years.

---

### Sample Test Questions

1. **Q:** Who approves a $4,200 PR?
   **A:** The Procurement Lead.
2. **Q:** Can a requester approve their own $800 purchase?
   **A:** No. No self-approval is permitted at any value.
3. **Q:** How many quotes are required for a $12,000 purchase?
   **A:** At least three written quotes from different Approved Suppliers.
4. **Q:** What is the maximum total value of a Blanket PO?
   **A:** $75,000, and it may not cover more than 12 months.
5. **Q:** Within how many business days must an emergency purchase have a formal PR completed?
   **A:** 1 business day.
