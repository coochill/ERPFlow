# Supplier Onboarding Policy

> **FICTIONAL SAMPLE DATA FOR SOFTWARE TESTING ONLY.** This document describes fictional business rules for "Northstar Trading Co.," a fictional company. It is not a real company's policy, does not constitute legal, financial, or regulatory guidance, and makes no claim of compliance with any law or regulation.

| Field | Value |
|---|---|
| Policy ID | NTC-SUP-001 |
| Version | 1.1 |
| Effective Date | 2026-02-01 |
| Policy Owner | Procurement Lead |
| Approved By | Chief Financial Officer |
| Next Review Date | 2027-02-01 |

## 1. Purpose

This policy sets the requirements for adding a new supplier to Northstar Trading Co.'s ("Northstar") supplier master file, so that every supplier is verified, risk-assessed, and set up for payment correctly before the first order is placed.

## 2. Scope

This policy applies to any individual or company that Northstar intends to buy goods or services from, including new suppliers, re-activated suppliers that were inactive for more than 12 months, and suppliers changing their bank details.

## 3. Definitions

- **Supplier Master File:** The system record of all suppliers, their status, and their payment details.
- **Onboarding Status:** One of Pending, Active, On Hold, or Inactive. Only Active suppliers may receive POs.
- **Onboarding Package:** The set of documents listed in Section 4.2 that a supplier must submit.
- **Annual Spend:** Total payments to a supplier in the last 12 months, or the forecast annual spend for a new supplier.
- **Critical Supplier:** A supplier with Annual Spend above $100,000 or a supplier of a Class A SKU under NTC-INV-001.

## 4. Rules

**4.1 Pre-Order Rule.** No PO may be issued to a supplier until its status is Active in the Supplier Master File.

**4.2 Onboarding Package.** Every new supplier must submit the following within 10 business days of the request:
1. Legal business name and registered address
2. Tax identification form (the form required for the supplier's country)
3. Bank account details, verified by a test transfer or bank letter
4. Two trade references from existing customers
5. Certificate of liability insurance with minimum cover of $1,000,000
6. Signed Supplier Code of Conduct acknowledgment

**4.3 Verification Deadline.** The Procurement Lead must complete verification within 5 business days of receiving a complete Onboarding Package. Incomplete packages are returned to the supplier with a list of missing items.

**4.4 Bank Detail Changes.** Any change to a supplier's bank details must be verified by a call-back to a phone number already held in the Supplier Master File. Changes requested by email alone are not accepted. Only the Finance Controller may approve a bank detail change.

**4.5 Risk Screening.** Before activation, every supplier is screened against Northstar's internal restricted-party list. A match must be escalated to the Compliance Officer, and the supplier remains On Hold until the Compliance Officer clears it.

**4.6 Critical Supplier Review.** Critical Suppliers must provide a financial statement or equivalent financial health summary each year. The Finance Controller reviews it and may place the supplier On Hold if the review raises concerns.

**4.7 Annual Re-Verification.** All Active suppliers must confirm their details each year. Suppliers that do not respond within 30 days are moved to On Hold.

**4.8 Inactivity.** Suppliers with no PO for 12 months are moved to Inactive. Reactivation requires a repeat of Section 4.2.

## 5. Approval Responsibilities

| Role | Responsibility |
|---|---|
| Requester | Initiates onboarding and collects the Onboarding Package |
| Procurement Lead | Verifies the package, activates or rejects the supplier, owns this policy |
| Finance Controller | Approves bank detail changes, reviews Critical Suppliers |
| Compliance Officer | Clears restricted-party screening matches |
| Chief Financial Officer | Approves changes to this policy |

## 6. Exceptions

- **Urgent one-time suppliers:** For a single purchase under $2,500, the Buyer may request a one-time supplier with a Pending status. A PO may be issued only after the Finance Controller approves, and payment is held until the full Onboarding Package is received.
- **Government or utility providers:** Suppliers that are government bodies or regulated utilities are exempt from the trade reference requirement in Section 4.2 (item 4) and the insurance requirement in Section 4.2 (item 5).

## 7. Review Procedure

The Procurement Lead reviews this policy every February. Changes to the Onboarding Package list or the verification deadlines require CFO approval. Each version is published to the policy repository with its effective date. Previous versions are retained for 3 years.

---

### Sample Test Questions

1. **Q:** Can a PO be issued to a supplier that is still Pending?
   **A:** No. Only Active suppliers may receive POs.
2. **Q:** How many business days does a supplier have to submit its Onboarding Package?
   **A:** 10 business days.
3. **Q:** A supplier emails a request to change its bank account. What must happen?
   **A:** The change must be verified by a call-back to a phone number already in the Supplier Master File, and only the Finance Controller may approve it.
4. **Q:** What minimum liability insurance cover is required?
   **A:** $1,000,000.
5. **Q:** When does a supplier move to Inactive status?
   **A:** After 12 months with no PO.