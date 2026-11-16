\# PHASE 3: RAG EVALUATION



\## 1. Overview



The Retrieval-Augmented Generation (RAG) component of ERPFlow was evaluated to measure its ability to retrieve relevant policy documents, generate answers grounded in retrieved information, and provide accurate policy citations.



The evaluation focused on three areas:



1\. \*\*Retrieval Performance\*\* – Measures whether the system retrieves relevant knowledge-base chunks for a given question.

2\. \*\*Generation Quality\*\* – Measures whether generated answers contain the expected factual information.

3\. \*\*Citation Reliability\*\* – Measures whether generated answers correctly reference the retrieved policy documents, versions, and sections.



The evaluation used the ERPFlow policy knowledge base, which contains internal policies for inventory management, procurement, supplier management, returns, and AI usage.



\## 2. Initial Retrieval Baseline



The initial retrieval evaluation established the baseline performance of the RAG retrieval component.



| Metric | Initial Baseline |

|---|---:|

| Mean Reciprocal Rank (MRR) | 0.70 |

| Mean Recall@3 | 0.27 |

| Top-3 Hit Rate | 80% |

| Knowledge-base Chunks | 81 |



The initial results indicated that the system could retrieve relevant information for most evaluated questions. However, the relatively low Recall@3 suggested that relevant information was not consistently represented among the top three retrieved results.



This baseline provided a reference point for subsequent retrieval improvements.



\## 3. Retrieval Performance After Onboarding Normalization



Retrieval improvements were introduced to improve how the system recognizes policy-related terminology, particularly supplier onboarding questions.



The improvements included token normalization and adjustments to retrieval matching so that variations of common terms could be recognized more consistently.



The following table compares retrieval performance before and after onboarding normalization.



| Metric | Before Normalization | After Normalization | Improvement |

|---|---:|---:|---:|

| Recall@3 | 67.15% | 73.81% | +6.66 percentage points |

| Mean Reciprocal Rank (MRR) | 0.7556 | 0.8222 | +0.0666 |

| Top-3 Hit Rate | 93.33% | 100% | +6.67 percentage points |

| Supplier Onboarding Rank | 5th | 1st | Improved by 4 positions |



The results show improvements across all evaluated retrieval metrics. In particular, the supplier onboarding result moved from fifth place to first place among retrieved results.



These findings indicate that the normalization improvements helped the retrieval component identify relevant supplier onboarding information more effectively.



\## 4. Final Retrieval Evaluation



The latest retrieval evaluation was conducted using the updated retrieval implementation and the existing evaluation dataset.



| Metric | Final Result |

|---|---:|

| Mean Recall@3 | 0.7381 (73.81%) |

| Mean Reciprocal Rank (MRR) | 0.8222 |

| Top-3 Hit Rate | 100% |

| Evaluation Questions | 15 |

| Knowledge-base Chunks | 81 (previously recorded count) |



The system achieved a Top-3 Hit Rate of 100%, meaning that at least one relevant result was retrieved within the top three results for every evaluated question.



The Mean Reciprocal Rank of 0.8222 indicates that relevant results generally appeared near the top of the retrieval rankings.



The final Recall@3 of 73.81% also demonstrates that the system retrieved a substantial proportion of the manually identified relevant chunks within its top three results.



\## 5. Generation Evaluation



Beyond retrieval performance, the generation component was evaluated to determine whether the language model could produce answers containing the expected information from the retrieved policy documents.



A separate generation evaluation was implemented using 15 policy-related questions. The evaluation checked generated responses against predefined expected facts and assessed whether policy citations matched the retrieved sources.



\### Generation Results



| Metric | Result |

|---|---:|

| Successful Generations | 15/15 |

| Mean Fact Coverage | 79.78% |

| Evaluation Questions | 15 |



The system successfully generated responses for all 15 evaluation questions.



The mean fact coverage of 79.78% represents the proportion of predefined expected facts detected in generated answers through automated pattern matching.



This metric provides an indication of factual coverage but should not be interpreted as a human-verified answer accuracy score. The automated checks may not recognize every semantically correct answer or detect every factual error.



\## 6. Citation Validation



Citation validation was conducted to verify whether generated answers referenced the correct policy identifiers, document versions, and section numbers.



The evaluator checked citations against the retrieved policy sources. It also supported multiple section references within a single citation block.



\### Citation Results



| Metric | Result |

|---|---:|

| Total Citations | 50 |

| Valid Citations | 50 |

| Invalid Citations | 0 |

| Citation Precision | 100% |

| Expected Policy Citation Rate | 100% |



The evaluator identified 50 citations, all of which passed the implemented validation checks.



The resulting 100% citation precision indicates that every citation detected by the evaluator matched the expected policy source information.



The 100% expected policy citation rate indicates that the evaluated answers included the expected policy references.



These results demonstrate that the citation validation mechanism successfully checked policy identifiers, versions, and section references for the evaluated responses. They do not independently establish that every generated factual statement is correct.



\## 7. Automated Testing



Automated tests were executed to verify the reliability of the RAG implementation, including retrieval behavior, answer generation logic, citation handling, and evaluation functionality.



| Test Result | Value |

|---|---:|

| Total Tests Passed | 143 |

| Failed Tests | 0 |

| Warnings | 2 |



The complete automated test suite passed with 143 successful tests and no failures.



Two deprecation warnings were reported from the Starlette/FastAPI telemetry-related code. These warnings did not prevent the tests from passing.



\## 8. Summary of Evaluation Results



The final evaluation demonstrates improvements in ERPFlow's RAG retrieval performance and provides additional measurements for generation quality and citation reliability.



| Evaluation Area | Final Result |

|---|---|

| Retrieval Recall@3 | 73.81% |

| Retrieval MRR | 0.8222 |

| Top-3 Hit Rate | 100% |

| Generation Success | 15/15 |

| Mean Fact Coverage | 79.78% |

| Citation Precision | 100% |

| Expected Policy Citation Rate | 100% |

| Automated Tests | 143 passed |



Overall, the evaluation indicates that the RAG component can retrieve relevant policy information, generate responses for the evaluated questions, and produce citations that pass the implemented validation checks.



The retrieval improvements, particularly in supplier onboarding queries, demonstrate the value of normalization in improving search relevance. The generation and citation evaluations provide additional evidence that the system can produce policy-grounded responses with traceable references.



These results establish the current evaluation baseline for future improvements to ERPFlow's RAG component.



\## 9. Evaluation Limitations



The results should be interpreted within the scope of the evaluation dataset and automated validation methods.



\- Retrieval metrics depend on the manually identified relevant chunks used as evaluation references.

\- Generation fact coverage uses predefined patterns and does not replace human evaluation of semantic correctness.

\- Citation precision measures the validity of detected citations, not the factual correctness of every statement in an answer.

\- The evaluation covers 15 policy-related questions and does not represent every possible user query.

\- The knowledge-base chunk count of 81 should be confirmed against the current knowledge base before final publication.



Future evaluations should expand the question dataset, include human-reviewed answer quality assessments, and monitor retrieval and generation performance as policies and system behavior evolve.



\---



\*\*Evaluation Status:\*\* Completed for the current RAG implementation.



\*\*Recommendation:\*\* Use these results as the current Phase 3 evaluation baseline. Repeat the evaluation when retrieval logic, document chunking, policy content, prompts, or generation settings undergo meaningful changes.

