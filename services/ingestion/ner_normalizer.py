#!/usr/bin/env python3
"""
ner_normalizer.py

LLM-based named entity extractor for a data-center project tracker.
- Uses qwen3.5:9b by default through local Ollama
- One article -> one project JSON object
- CPU-only by default
- Robust JSON parsing for objects, lists, and markdown fences
- Allows geographic inference
- Avoids inventing provider, power, or investment details
"""

from __future__ import annotations

import concurrent.futures
import json
import os
import pathlib
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import ollama  # type: ignore

DEFAULT_MODEL_NAME: str = os.getenv("NER_MODEL", "qwen2.5:1.5b")
OLLAMA_OPTIONS: Dict[str, Any] = {
    "temperature": 0.0,
    "num_predict": 256,
    "num_ctx": 2048,
    "num_thread": os.cpu_count() or 4,
}
MAX_BODY_CHARS = 1500
LOG_FILE = pathlib.Path(__file__).with_name("processing.log")
VALID_CATEGORIES = {"construction", "expansion", "investment", "other"}


def _log_debug(message: str) -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [NER DEBUG] {message}"
    print(line)

    try:
        with LOG_FILE.open("a", encoding="utf-8") as file:
            file.write(line + "\n")
    except Exception:
        pass


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()
    return cleaned


def _extract_json_object(text: str) -> Optional[str]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start : end + 1]


def _safe_json_parse(output: str) -> Dict[str, Any]:
    cleaned = _strip_code_fences(output)

    try:
        data = json.loads(cleaned)
        if isinstance(data, list) and data and isinstance(data[0], dict):
            return data[0]
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    json_object = _extract_json_object(cleaned)
    if json_object:
        try:
            data = json.loads(json_object)
            if isinstance(data, list) and data and isinstance(data[0], dict):
                return data[0]
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    _log_debug("JSON parsing failed; returning empty dict.")
    return {}


def _normalize_location(value: Optional[str]) -> Dict[str, Optional[str]]:
    if not value:
        return {"city": None, "state": None, "country": None}

    parts = [part.strip() for part in value.replace(";", ",").split(",") if part.strip()]
    if len(parts) == 1:
        return {"city": None, "state": None, "country": parts[0]}
    if len(parts) == 2:
        return {"city": parts[0], "state": None, "country": parts[1]}
    if len(parts) >= 3:
        return {"city": parts[0], "state": parts[1], "country": parts[-1]}

    return {"city": None, "state": None, "country": value}


def _normalize_power(value: Any) -> Optional[int]:
    if value is None:
        return None

    try:
        normalized = str(value).lower().replace(" ", "")
        if "gw" in normalized:
            return int(round(float(normalized.replace("gw", "")) * 1000))
        if "mw" in normalized:
            return int(round(float(normalized.replace("mw", ""))))
        return int(round(float(normalized)))
    except Exception:
        return None


def _normalize_investment(value: Any) -> Optional[int]:
    if value is None:
        return None

    try:
        normalized = (
            str(value)
            .lower()
            .replace(" ", "")
            .replace("$", "")
            .replace("usd", "")
        )
        if "bn" in normalized:
            return int(round(float(normalized.replace("bn", "")) * 1000))
        if "b" in normalized:
            return int(round(float(normalized.replace("b", "")) * 1000))
        if "mn" in normalized:
            return int(round(float(normalized.replace("mn", ""))))
        if "m" in normalized:
            return int(round(float(normalized.replace("m", ""))))
        return int(round(float(normalized)))
    except Exception:
        return None


def _parse_investment_usd_m_from_text(text: str) -> Optional[int]:
    """Extract the best investment value from text as USD millions.

    Total project-cost phrases are preferred over debt, equity, loan, or
    commitment components.
    """
    if not text:
        return None

    normalized_text = text.lower().replace(",", "")
    normalized_text = normalized_text.replace("us$", "$").replace("usd", "$")
    pattern = re.compile(
        r"(?:\$\s*)?(\d+(?:\.\d+)?)\s*(billion|bn|million|mn|m)\b"
    )

    candidates: List[Tuple[int, str]] = []
    for match in pattern.finditer(normalized_text):
        number = float(match.group(1))
        unit = match.group(2)
        value_m = int(round(number * 1000)) if unit in ("billion", "bn") else int(round(number))

        start = max(0, match.start() - 80)
        end = min(len(normalized_text), match.end() + 80)
        context = normalized_text[start:end]
        candidates.append((value_m, context))

    if not candidates:
        return None

    def score(value_m: int, context: str) -> int:
        result = 0

        if any(
            keyword in context
            for keyword in [
                "expected to cost",
                "is expected to cost",
                "will cost",
                "to cost",
                "development is expected to cost",
                "development cost",
                "project cost",
                "total cost",
                "capex",
            ]
        ):
            result += 100

        if any(
            keyword in context
            for keyword in ["investment", "invest", "funding", "financing", "budget"]
        ):
            result += 40

        if any(keyword in context for keyword in ["project debt", "debt", "equity", "loan"]):
            result -= 30

        if any(
            keyword in context
            for keyword in ["commit", "commitment", "expects to commit", "capital over"]
        ):
            result -= 20

        result += min(value_m, 2000) // 100
        return result

    best_value, _ = max(candidates, key=lambda item: score(item[0], item[1]))
    return best_value


def _select_main_provider(value: Any) -> Optional[str]:
    if not value:
        return None
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, list):
        cleaned = [str(provider).strip() for provider in value if provider and str(provider).strip()]
        return cleaned[0] if cleaned else None
    return None


def _normalize_category(value: Any) -> str:
    if value is None:
        return "other"
    category = str(value).lower().strip()
    return category if category in VALID_CATEGORIES else "other"


def _resolve_model_name() -> str:
    env_model = os.getenv("NER_MODEL")
    if env_model:
        return env_model
    try:
        models_info = ollama.list()
        raw_models = models_info.get("models", []) if isinstance(models_info, dict) else getattr(models_info, "models", [])
        model_names = []
        for m in raw_models:
            name = m.get("name", "") if isinstance(m, dict) else getattr(m, "model", getattr(m, "name", ""))
            model_names.append(name)
        for candidate in ["qwen2.5:1.5b", "llama3.2:1b", "qwen3.5:9b"]:
            if any(candidate in name for name in model_names):
                return candidate
    except Exception:
        pass
    return DEFAULT_MODEL_NAME


def _call_ollama(prompt: str, model_name: Optional[str] = None) -> str:
    model = model_name or _resolve_model_name()
    _log_debug(f"Calling model='{model}' with prompt length={len(prompt)}")

    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options=OLLAMA_OPTIONS,
        )
        output = response["message"]["content"]
        _log_debug(f"Ollama response first 200 chars: {output[:200]!r}")
        return output
    except Exception as exc:
        _log_debug(f"Ollama call for model='{model}' failed: {exc}")
        if model != "qwen3.5:9b":
            try:
                _log_debug("Attempting fallback call with model='qwen3.5:9b'")
                response = ollama.chat(
                    model="qwen3.5:9b",
                    messages=[{"role": "user", "content": prompt}],
                    options=OLLAMA_OPTIONS,
                )
                output = response["message"]["content"]
                return output
            except Exception as inner_exc:
                _log_debug(f"Fallback model failed: {inner_exc}")
        raise


def _heuristic_extract(title: str, body: str, publish_date: str, url: str) -> Dict[str, Any]:
    text = f"{title}\n{body}"

    power = None
    power_match = re.search(r"(\d+(?:\.\d+)?)\s*(MW|GW|megawatt|gigawatt)", text, re.IGNORECASE)
    if power_match:
        val = float(power_match.group(1))
        unit = power_match.group(2).upper()
        power = int(round(val * 1000 if "GW" in unit else val))

    investment = _parse_investment_usd_m_from_text(text)

    text_lower = text.lower()
    category = "other"
    if any(k in text_lower for k in ["construct", "build", "groundbreak", "facility"]):
        category = "construction"
    elif any(k in text_lower for k in ["expand", "add capacity", "phase 2", "extension"]):
        category = "expansion"
    elif any(k in text_lower for k in ["invest", "fund", "million", "billion", "capital"]):
        category = "investment"

    provider = None
    provider_match = re.search(
        r"([A-Z][A-Za-z0-9\s]+?)\s+(?:launches|builds|plans|invests|acquires|opens|announces|completes)",
        title,
    )
    if provider_match:
        provider = provider_match.group(1).strip()

    return {
        "category": category,
        "news_title": title,
        "provider_name": provider,
        "city": None,
        "state": None,
        "country": None,
        "power_MW": power,
        "investment_usd_m": investment,
        "publish_date": publish_date,
        "link": url,
    }


OLLAMA_EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=1)


def _call_ollama_with_timeout(prompt: str, timeout_seconds: int = 15) -> str:
    future = OLLAMA_EXECUTOR.submit(_call_ollama, prompt)
    try:
        return future.result(timeout=timeout_seconds)
    except Exception as exc:
        _log_debug(f"OLLAMA call timed out or failed ({exc})")
        raise


def extract(title: str, body: str, publish_date: str, url: str) -> List[Dict[str, Any]]:
    """Extract one structured data-center project from an article."""
    short_body = (body or "")[:MAX_BODY_CHARS]

    prompt = f"""
You are an advanced information extraction system for DATA CENTER PROJECT NEWS.
Your job is to extract ONE structured project per article.

FOLLOW THESE RULES STRICTLY:
1. Return EXACTLY ONE JSON OBJECT - no lists, no markdown, no explanations.
2. LOCATION LOGIC (VERY IMPORTANT):
   - If a CITY is mentioned, infer the correct state/region and country.
     Example: "Stuttgart" -> "Stuttgart, Baden-Württemberg, Germany"
   - If only a STATE is mentioned, infer the correct country.
     Example: "Texas" -> "Texas, United States"
   - If only a COUNTRY is mentioned, return only the country.
   - Never invent fictional locations.
   - Geographic inference must be based on real-world knowledge.
3. Do NOT guess project details. If provider, MW, or investment are unclear, return null.
4. Allowed categories only: "construction", "expansion", "investment", "other".
5. Output JSON in exactly this structure:
{{
  "provider": string or null,
  "location": string or null,
  "power_MW": number or null,
  "investment_usd_m": number or null,
  "category": "construction" | "expansion" | "investment" | "other"
}}

Now extract from this article:
TITLE: {title}
BODY: {short_body}
"""

    try:
        raw_output = _call_ollama_with_timeout(prompt, timeout_seconds=15)
        data = _safe_json_parse(raw_output)

        provider = _select_main_provider(data.get("provider"))
        location = _normalize_location(data.get("location"))
        power = _normalize_power(data.get("power_MW"))

        parsed_investment = _parse_investment_usd_m_from_text(f"{title}\n{short_body}")
        investment = (
            parsed_investment
            if parsed_investment is not None
            else _normalize_investment(data.get("investment_usd_m"))
        )
        category = _normalize_category(data.get("category"))

        return [
            {
                "category": category,
                "news_title": title,
                "provider_name": provider,
                "city": location["city"],
                "state": location["state"],
                "country": location["country"],
                "power_MW": power,
                "investment_usd_m": investment,
                "publish_date": publish_date,
                "link": url,
            }
        ]
    except Exception as exc:
        _log_debug(f"LLM extraction failed ({exc}); using heuristic extraction.")
        return [_heuristic_extract(title, body, publish_date, url)]


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 5:
        print("Usage: python ner_normalizer.py <title> <body> <publish_date> <url>")
        sys.exit(1)

    article_title, article_body, article_date, article_url = sys.argv[1:]
    result = extract(article_title, article_body, article_date, article_url)
    print(json.dumps(result, indent=2, ensure_ascii=False))
