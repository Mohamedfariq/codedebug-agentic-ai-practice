import json
import re
from typing import Type, TypeVar
from pydantic import BaseModel

T = TypeVar('T', bound=BaseModel)


def safe_structured_invoke(model, schema_cls: Type[T], prompt: str) -> T:
    """
    Robust structured output invoker for Groq models (like openai/gpt-oss-120b).
    Handles:
    - Normal structured output
    - tool_use_failed (where model returned JSON text instead of a tool call)
    - json_validate_failed (extracts JSON from error's failed_generation)
    - Direct LLM JSON completion fallback
    """
    # Attempt 1: Standard structured output with json_schema
    try:
        structured_llm = model.with_structured_output(schema_cls, method="json_schema", strict=False)
        return structured_llm.invoke(prompt)
    except Exception as e:
        err_str = str(e)
        recovered = _try_recover_failed_generation(err_str, schema_cls)
        if recovered is not None:
            return recovered

    # Attempt 2: Function calling mode (default)
    try:
        structured_llm_fc = model.with_structured_output(schema_cls)
        return structured_llm_fc.invoke(prompt)
    except Exception as e:
        err_str = str(e)
        recovered = _try_recover_failed_generation(err_str, schema_cls)
        if recovered is not None:
            return recovered

    # Attempt 3: Direct prompt with schema and regex JSON extraction
    try:
        schema_json = json.dumps(schema_cls.model_json_schema(), indent=2)
        augmented_prompt = f"""{prompt}

CRITICAL INSTRUCTION:
Return ONLY a valid JSON object matching this schema. No markdown code blocks, no text before or after.
SCHEMA:
{schema_json}
"""
        response = model.invoke(augmented_prompt)
        content = response.content.strip()
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE).strip()

        # Find outer {...}
        json_match = re.search(r'(\{[\s\S]*\})', cleaned)
        if json_match:
            data = json.loads(json_match.group(1))
            return schema_cls.model_validate(data)
    except Exception as e:
        print(f"Direct JSON fallback attempt failed: {e}")

    # Final attempt: default instance if schema allows
    try:
        return schema_cls()
    except Exception:
        raise ValueError(f"Failed to generate valid structured data for {schema_cls.__name__}")


def _try_recover_failed_generation(err_str: str, schema_cls: Type[T]) -> T:
    """Extracts valid JSON from Groq's failed_generation error message."""
    # Look for 'failed_generation': '...' or "failed_generation": "..."
    patterns = [
        r"'failed_generation':\s*'(\{[\s\S]*?\})'",
        r'"failed_generation":\s*"(\{[\s\S]*?\})"',
        r"failed_generation['\"]\s*:\s*['\"](\{[\s\S]*?\})['\"]",
        r"failed_generation['\"]\s*:\s*['\"]([\s\S]*?)['\"]"
    ]

    for pat in patterns:
        match = re.search(pat, err_str)
        if match:
            raw = match.group(1)
            # Unescape newlines and quotes
            try:
                unescaped = raw.encode().decode('unicode_escape')
            except Exception:
                unescaped = raw.replace('\\n', '\n').replace('\\"', '"').replace("\\'", "'")

            # Try parsing JSON
            try:
                data = json.loads(unescaped)
                return schema_cls.model_validate(data)
            except Exception:
                # Find inner {...}
                inner = re.search(r'(\{[\s\S]*\})', unescaped)
                if inner:
                    try:
                        data = json.loads(inner.group(1))
                        return schema_cls.model_validate(data)
                    except Exception:
                        pass
    return None
