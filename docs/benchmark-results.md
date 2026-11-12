\# ERPFlow ETL Benchmark Results



\## 1. Test Configuration



\- Dataset: `inventory\_benchmark.csv`

\- Input: `etl/data/input/inventory\_benchmark.csv`

\- Format: CSV

\- Total records: 150

\- Execution mode: Offline (no API or database import)

\- Warm-up runs: 2

\- Measured runs: 10



\## 2. Dataset Composition



| Record category | Count |

|---|---:|

| Valid inventory records | 100 |

| Negative quantities | 20 |

| Negative unit prices | 10 |

| Missing item names | 10 |

| Duplicate SKU records | 10 |

| \*\*Total\*\* | \*\*150\*\* |



\## 3. Data Validation Results



| Metric | Result |

|---|---:|

| Valid records detected | 100 |

| Invalid records detected | 50 |

| Expected classifications | 150 |

| Correct classifications | 150 |

| Classification accuracy | \*\*100%\*\* |



All intentionally introduced validation issues were detected, including both records in each duplicate SKU pair.



\## 4. Execution Performance



| Metric | Result |

|---|---:|

| Median execution time | 260.69 ms |

| Average execution time | 296.79 ms |

| Minimum execution time | 170.75 ms |

| Maximum execution time | 648.13 ms |

| Median throughput | 575.39 records/sec |



\### Individual execution times



170.75, 333.63, 648.13, 272.44, 207.65, 316.75, 220.10, 312.92, 248.95, 236.63 ms.



\## 5. Conclusion



The ERPFlow ETL pipeline successfully processed the 150-record benchmark dataset and correctly separated all 100 valid records from 50 intentionally invalid records.



The measured median execution time was 260.69 ms, with a derived median throughput of 575.39 records per second.



These results demonstrate successful validation and processing on this controlled dataset. They should not be interpreted as a guarantee of accuracy or performance on larger or uncontrolled production datasets.



\*\*Scope limitation:\*\* This benchmark evaluated extraction, transformation, and validation only. API loading and database insertion were not tested.



