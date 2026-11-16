import json
from erpflow_rag.service import answer_policy_question

result = answer_policy_question(
    "Who approves a purchase request above $50,000?",
    top_k=3,
)

print(json.dumps(result, indent=2))
