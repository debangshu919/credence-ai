from langchain_openai import ChatOpenAI
from agent_state import AgentState, ClaimExtractionOutput, Claim
from dotenv import load_dotenv
import os   
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

import re

def extract_claims(state: AgentState) -> dict:
    print("\n[Agent 1] Extracting claims...")

    prompt = f"""
Extract atomic, standalone, and independently verifiable claims.

Guidelines:
- Extract ALL statements that can be fact-checked (even if they may be false)
- Do NOT filter based on correctness
- Include incorrect or absurd claims if they are verifiable
- Ignore opinions and vague statements only
- Break complex sentences into standalone claims
- Avoid duplicates
- Limit to 5–10 most important claims

STRICT RULES:
- Each claim must contain ONLY ONE fact
- If a sentence contains multiple facts, split them
- REMOVE explanations like "which is incorrect", "this is false"
- Extract ONLY the factual core

Examples of good atomic claims:
- The Earth revolves around the Sun once every 365.25 days
- The average human body contains about 5 liters of blood
- Lightning never strikes the same place twice
- Octopuses have three hearts
- A bolt of lightning can reach temperatures hotter than the surface of the Sun
- The Great Wall of China is visible from space with the naked eye
- Electric vehicle adoption has increased globally in the past decade
- Artificial intelligence can generate human-like text based on prompts
- Drinking water helps regulate body temperature
- Mount Everest is the tallest mountain above sea level on Earth

For each claim:
- Assign type: factual, numerical, temporal, entity
- Provide confidence score based on clarity (NOT truth)

Text:
{state.input_text}
"""

    structured_llm = llm.with_structured_output(ClaimExtractionOutput)

    # ---------- HELPERS ----------

    def remove_meta_text(claim: str) -> str:
        patterns = [
            r",?\s*which is (not )?(true|false|incorrect|wrong)",
            r",?\s*(this|that) is (not )?(true|false|incorrect)",
            r",?\s*which is a misconception",
            r",?\s*which is debated",
        ]
        for p in patterns:
            claim = re.sub(p, "", claim, flags=re.IGNORECASE)
        return claim.strip()

    def split_claim(claim: str) -> list[str]:
        parts = re.split(r"\b(and|but|however|while|although)\b", claim, flags=re.IGNORECASE)
        cleaned = []
        for p in parts:
            p = p.strip(" ,.")
            if len(p) > 15:
                cleaned.append(p)
        return cleaned if cleaned else [claim]

    def normalize_claim(text: str) -> str:
        text = text.lower()
        text = re.sub(r"\b(always|all the time|exactly|completely|never|only)\b", "", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def score_claim(text: str) -> float:
        score = 0

        # length (informational density)
        if len(text) > 40:
            score += 0.3

        # numbers
        if re.search(r"\d", text):
            score += 0.3

        # named entities (simple heuristic)
        if re.search(r"\b[A-Z][a-z]+\b", text):
            score += 0.2

        # keywords
        keywords = ["temperature", "year", "blood", "energy", "ai", "species"]
        if any(k in text.lower() for k in keywords):
            score += 0.2

        return score

    # ---------- MAIN ----------

    try:
        response: ClaimExtractionOutput = structured_llm.invoke(prompt)

        temp_claims = []

        # Step 1: clean + split
        for c in response.claims:
            base = remove_meta_text(c.claim.strip().rstrip(".").strip())
            split_parts = split_claim(base)

            for part in split_parts:
                part = part.strip()
                if len(part) < 10:
                    continue

                temp_claims.append({
                    "text": part,
                    "type": c.type,
                    "confidence": max(c.confidence, 0.4)
                })

        # Step 2: deduplicate using normalized form
        seen = set()
        unique_claims = []

        for item in temp_claims:
            norm = normalize_claim(item["text"])
            if norm in seen:
                continue
            seen.add(norm)

            unique_claims.append({
                "text": item["text"],
                "type": item["type"],
                "confidence": round(item["confidence"], 2),
                "normalized": norm,
                "score": score_claim(item["text"])
            })

        # Step 3: rank and select top 8
        unique_claims.sort(key=lambda x: x["score"], reverse=True)
        selected = unique_claims[:3]

        # Step 4: build final Claim objects
        claims: list[Claim] = []
        new_id = 1

        for item in selected:
            claims.append(
                Claim(
                    id=new_id,
                    claim=item["text"],
                    type=item["type"],
                    confidence=item["confidence"],
                    normalized_claim=item["normalized"]
                )
            )
            new_id += 1

        print(f"Extracted claims: {[c.model_dump() for c in claims]}")

    except Exception as e:
        print("Extraction error:", e)
        claims = []

    return {"claims": claims}