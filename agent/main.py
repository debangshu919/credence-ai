import os
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from typing import List, Dict, Any,Literal
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI

from langgraph.graph import StateGraph, END
from tavily import TavilyClient
from agent_state import AgentState, ClaimExtractionOutput, Claim, EvidenceSource, VerificationResult 
from extraction_claim import extract_claims
from search_evidence_agent import search_evidence
from verify_claims_agent import verify_claims
from report_gen import generate_report
load_dotenv()

# -----------------------------
# INIT MODELS
# -----------------------------
_api_key = (
    os.getenv("GROQ_API_KEY")
    or os.getenv("LLM_API_KEY")
    or os.getenv("OPENAI_API_KEY")
    or "groq-placeholder"
)

llm = ChatOpenAI(
    model=os.getenv("LLM_MODEL_FAST", "openai/gpt-oss-20b"),
    temperature=0.2,
    base_url=os.getenv(
        "LLM_BASE_URL",
        "https://api.groq.com/openai/v1",
    ),
    api_key=_api_key,
)
search_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


# -----------------------------
# AGENT 1: CLAIM EXTRACTION

# AGENT 2: SEARCH

# AGENT 3: VERIFICATION

# FINAL REPORT
# -----------------------------


# -----------------------------
# BUILD GRAPH
# -----------------------------
builder = StateGraph(AgentState)

builder.add_node("extract_claims", extract_claims)
builder.add_node("search_evidence", search_evidence)
builder.add_node("verify_claims", verify_claims)
builder.add_node("generate_report", generate_report)

builder.set_entry_point("extract_claims")

builder.add_edge("extract_claims", "search_evidence")
builder.add_edge("search_evidence", "verify_claims")
builder.add_edge("verify_claims", "generate_report")
builder.add_edge("generate_report", END)

graph = builder.compile()


# -----------------------------
# RUN + DEBUG TEST
# -----------------------------
if __name__ == "__main__":
    print("\n🚀 Starting Agent Test...\n")

    initial_state = AgentState(
        input_text="""
        Bananas are radioactive due to the presence of potassium, but they are safe to eat. Goldfish have a memory span of only three seconds, which is a widely believed myth. Lightning never strikes the same place twice, although this is not true. The Amazon rainforest produces 20% of the world's oxygen, a claim often repeated but misleading in scientific context.
        """
    )

    try:
        result = graph.invoke(initial_state)
        print("\n✅ Agent execution completed successfully.")
        print("result:", result)
        print("\n==============================")
        print("🧠 DEBUG: INTERNAL STATE")
        print("==============================")

        # -----------------------------
        # CLAIMS
        # -----------------------------
        print("\n📌 Claims:")
        for c in result["claims"]:
            print(f" - ID: {c.id}, Claim: {c.claim}, Type: {c.type}, Confidence: {c.confidence}")

        # -----------------------------
        # EVIDENCE
        # -----------------------------
        print("\n🔎 Evidence:")
        for claim_id, sources in result["evidence"].items():
            print(f"\nClaim ID {claim_id}:")
            for s in sources:
                print(f"  • {s.title}")
                print(f"    URL: {s.url}")

        # -----------------------------
        # VERIFICATIONS
        # -----------------------------
        print("\n✅ Verifications:")
        for claim_id, v in result["verifications"].items():
            print(f"\nClaim ID {claim_id}:")
            print(f"  Verdict: {v.verdict}")
            print(f"  Confidence: {v.confidence}")
            print(f"  Reason: {v.reason}")

        # -----------------------------
        # FINAL REPORT
        # -----------------------------
        print("\n==============================")
        print("📊 FINAL REPORT")
        print("==============================\n")

        print(result["final_report"])

    except Exception as e:
        print("\n❌ ERROR DURING EXECUTION")
        print(e)