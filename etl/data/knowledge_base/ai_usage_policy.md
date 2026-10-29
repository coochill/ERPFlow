# Responsible AI Assistant Usage Policy

> **FICTIONAL SAMPLE DATA FOR SOFTWARE TESTING ONLY.** This document describes fictional business rules for "Northstar Trading Co.," a fictional company. It is not a real company's policy, does not constitute legal, financial, or regulatory guidance, and makes no claim of compliance with any law or regulation.

| Field | Value |
|---|---|
| Policy ID | NTC-AI-001 |
| Version | 1.0 |
| Effective Date | 2026-04-01 |
| Policy Owner | Data Governance Lead |
| Approved By | Chief Operating Officer |
| Next Review Date | 2027-04-01 |

## 1. Purpose

This policy sets the rules for how staff at Northstar Trading Co. ("Northstar") may use the internal AI Assistant, a tool that answers questions using Northstar's approved policy repository and operational data. It ensures the assistant is used accurately, protects sensitive information, and keeps people responsible for business decisions.

## 2. Scope

This policy applies to all staff and contractors with access to the AI Assistant, and to all content the AI Assistant retrieves or generates. It applies in both the production ERP environment and any demo or test environment.

## 3. Definitions

- **AI Assistant:** Northstar's internal retrieval-augmented question-answering tool.
- **Approved Repository:** The set of current, published Northstar policy documents, each with a Policy ID and version number.
- **Sensitive Data:** Customer personal data, bank details, tax identification numbers, employee personal data, and unpublished pricing or contract terms.
- **Human Owner:** The staff member accountable for a decision that the AI Assistant informs.
- **Demo Data:** Fictional records created for testing or demonstration, labeled as such in the system.

## 4. Rules

**4.1 Source Citation.** Every answer that states a Northstar rule must cite the Policy ID and version it relies on. Answers that cannot be traced to a document in the Approved Repository must state that no approved source was found.

**4.2 Current Version Only.** The AI Assistant must answer from the current effective version of each policy. Superseded versions may be retrieved only when a user explicitly asks about historical rules.

**4.3 No Autonomous Decisions.** The AI Assistant may not approve a purchase, approve a refund, change a stock level, activate a supplier, or change a bank detail. It may explain the applicable rule and identify the Human Owner.

**4.4 Sensitive Data Handling.** Staff must not enter Sensitive Data into the AI Assistant unless the feature is approved for that data class by the Data Governance Lead. Demo environments must use Demo Data only.

**4.5 Uncertainty Handling.** When the Approved Repository contains conflicting rules, the AI Assistant must present both rules, cite both Policy IDs, and advise the user to contact the Policy Owner. It may not choose between them.

**4.6 Confidence Threshold.** When retrieval confidence falls below the internal threshold, the AI Assistant must respond with "I could not find a confident answer in the approved policies" and suggest the relevant Policy Owner.

**4.7 Logging.** All queries and responses are logged for 90 days for quality review. Logs containing Sensitive Data must be redacted within 2 business days.

**4.8 Human Review of Outputs.** Any AI-generated document that will be sent to a customer or supplier must be reviewed and approved by a staff member before sending.

**4.9 Training Prohibition.** Staff must not use customer or supplier content from the AI Assistant to train external AI models.

## 5. Approval Responsibilities

| Role | Responsibility |
|---|---|
| Data Governance Lead | Owns this policy, approves new data classes, reviews logs |
| Policy Owners (per document) | Maintain accuracy of their policies in the Approved Repository |
| Department Managers | Ensure staff complete AI usage training before access is granted |
| Chief Operating Officer | Approves changes to this policy |
| Staff User | Verifies AI answers against source policy before acting |

## 6. Exceptions

- **Pilot features:** A new AI feature may process a new data class for up to 60 days if the Data Governance Lead and the Chief Operating Officer both approve in writing, with a defined end date.
- **Incident response:** During a confirmed data incident, the IT Security Lead may suspend the AI Assistant for affected users without prior approval, with notice to the Data Governance Lead within 1 hour.

## 7. Review Procedure

The Data Governance Lead reviews this policy every April and after any material change to the AI Assistant's features or data sources. Changes require COO approval. Each version is published to the policy repository with its effective date. Previous versions are retained for 3 years.

---

### Sample Test Questions

1. **Q:** Can the AI Assistant approve a $900 purchase?
   **A:** No. The AI Assistant may not approve purchases or any other business decision.
2. **Q:** What must every answer that states a Northstar rule include?
   **A:** The Policy ID and version it relies on.
3. **Q:** What should the AI Assistant do when two policies conflict?
   **A:** Present both rules, cite both Policy IDs, and advise the user to contact the Policy Owner, without choosing between them.
4. **Q:** How long are AI Assistant query logs kept?
   **A:** 90 days.
5. **Q:** Can staff put customer bank details into the AI Assistant?
   **A:** Not unless the Data Governance Lead has approved that data class. Sensitive Data is restricted by default.

---

**Consistency check across the set:** The Procurement Lead, Finance Controller, and CFO appear with the same thresholds where they overlap. NTC-INV-001 references NTC-PRC-001 and NTC-RET-001. NTC-PRC-001 references NTC-INV-001 and NTC-SUP-001. NTC-RET-001 references NTC-INV-001 for restocking. NTC-AI-001 governs use of all of the above.