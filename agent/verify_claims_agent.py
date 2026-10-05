from langchain_openai import ChatOpenAI
from agent_state import AgentState, VerificationResult
from dotenv import load_dotenv
import os
import re

load_dotenv()

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


def verify_claims(state: AgentState) -> dict:
    print("\n[Agent 3] Verifying claims...")

    verifications: dict[int, VerificationResult] = {}
    structured_llm = llm.with_structured_output(VerificationResult)

    # -----------------------------
    # 🔥 HELPER FUNCTIONS
    # -----------------------------
    def is_absolute_claim(text: str) -> bool:
        keywords = ["exactly", "always", "never", "all", "must", "only"]
        return any(k in text.lower() for k in keywords)

    def has_range_in_evidence(sources) -> bool:
        text = " ".join((s.content or "").lower() for s in sources)

        approx_words = [
            "about", "approximately", "around",
            "roughly", "varies", "range", "between"
        ]

        # keyword-based detection
        if any(word in text for word in approx_words):
            return True

        # 🔥 numeric range detection (e.g. 4-6, 4 to 6)
        if re.search(r"\d+\s*(to|-)\s*\d+", text):
            return True

        return False

    for claim in state.claims:
        sources = state.evidence.get(claim.id, [])

        # -----------------------------
        # BUILD CONTEXT (CLEAN)
        # -----------------------------
        context = "\n".join(
            f"- Title: {s.title}\n  Content: {s.content}"
            for s in sources[:5]
        )

        absolute_flag = is_absolute_claim(claim.claim)
        range_flag = has_range_in_evidence(sources)

        # -----------------------------
        # 🔥 IMPROVED PROMPT
        # -----------------------------
        prompt = f"""
You are a strict fact-checking system.

Verify the claim ONLY using the provided evidence.

---------------------
Claim:
{claim.claim}

Evidence:
{context}
---------------------

RULES:

1. Precision matters:
- "exactly", "always", "never", "all" → must be strictly true
- If evidence shows approximation or variation → FALSE

2. Do NOT generalize:
- "about" ≠ "exactly"
- "often" ≠ "always"

3. Contradictions:
- If any strong contradiction → FALSE

4. Unverifiable:
- If no strong support → UNVERIFIABLE

5. Partial:
- Only if clearly mixed truth

Return structured output only.
"""

        try:
            result: VerificationResult = structured_llm.invoke(prompt)

            # -----------------------------
            # 🔥 HARD OVERRIDE (CRITICAL FIX)
            # -----------------------------
            if absolute_flag and range_flag:
                result.verdict = "FALSE"
                result.reason = (
                    "Claim uses absolute wording but evidence shows approximation or range."
                )
                result.confidence = 0.9

            # -----------------------------
            # SOURCE SELECTION
            # -----------------------------
            urls = [s.url for s in sources]

            seen_domains = set()
            filtered_urls = []

            for url in urls:
                try:
                    domain = url.split("/")[2]
                except:
                    continue

                if domain not in seen_domains:
                    seen_domains.add(domain)
                    filtered_urls.append(url)

            result.supporting_sources = filtered_urls[:3]
            result.conflicting_sources = []

            # -----------------------------
            # CONFIDENCE CONTROL
            # -----------------------------
            result.confidence = min(result.confidence, 0.95)

            if len(sources) < 3:
                result.confidence = max(result.confidence - 0.05, 0.5)

            verifications[claim.id] = result

        except Exception as e:
            print(f"Verification error for claim {claim.id}:", e)

            verifications[claim.id] = VerificationResult(
                verdict="Unverifiable",
                confidence=0.0,
                reason="Verification failed due to parsing error",
                supporting_sources=[],
                conflicting_sources=[],
                uncertainty_reason="System error"
            )

    print("Verifications completed.")
    return {"verifications": verifications}