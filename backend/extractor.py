import requests
import json
import re
import html
from typing import Optional, Dict, Any

try:
    from llm import llm
    from pydantic import BaseModel, Field
    class ExtractedProblem(BaseModel):
        title: str = ""
        problem: str = ""
        sample_input: str = ""
        sample_output: str = ""
        starter_code: str = ""
except Exception:
    llm = None
    ExtractedProblem = None


def extract_leetcode_problem(slug: str) -> Optional[Dict[str, Any]]:
    """Extracts problem details from LeetCode using GraphQL API."""
    url = "https://leetcode.com/graphql"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://leetcode.com",
        "Content-Type": "application/json"
    }

    query = """
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        title
        titleSlug
        content
        exampleTestcases
        codeSnippets {
          lang
          langSlug
          code
        }
      }
    }
    """

    payload = {
        "query": query,
        "variables": {"titleSlug": slug},
        "operationName": "questionData"
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code != 200:
            return None

        data = resp.json().get("data", {}).get("question")
        if not data or not data.get("content"):
            return None

        raw_html = data.get("content", "")

        sample_input = ""
        sample_output = ""

        # Strategy 1: Look inside <pre> tags
        pre_blocks = re.findall(r'<pre>(.*?)</pre>', raw_html, re.DOTALL | re.IGNORECASE)
        for pre_text in pre_blocks:
            in_match = re.search(r'(?:<strong>)?Input:?(?:</strong>)?\s*(.*?)(?=(?:<strong>)?Output|\n\s*Explanation|$)', pre_text, re.DOTALL | re.IGNORECASE)
            out_match = re.search(r'(?:<strong>)?Output:?(?:</strong>)?\s*(.*?)(?=(?:<strong>)?Explanation|\n\s*Example|$)', pre_text, re.DOTALL | re.IGNORECASE)
            if in_match and out_match:
                sample_input = html.unescape(re.sub(r'<[^>]+>', '', in_match.group(1)).strip())
                sample_output = html.unescape(re.sub(r'<[^>]+>', '', out_match.group(1)).strip())
                break

        # Strategy 2: Look for <strong>Input:</strong> ... <strong>Output:</strong> ...
        if not sample_input or not sample_output:
            in_match = re.search(r'Input:?\s*</strong>\s*(.*?)(?=<strong>Output|Output:)', raw_html, re.DOTALL | re.IGNORECASE)
            out_match = re.search(r'Output:?\s*</strong>\s*(.*?)(?=<strong>Explanation|<strong>Example|<p><strong>Constraints|Explanation:)', raw_html, re.DOTALL | re.IGNORECASE)
            if in_match:
                sample_input = html.unescape(re.sub(r'<[^>]+>', '', in_match.group(1)).strip())
            if out_match:
                sample_output = html.unescape(re.sub(r'<[^>]+>', '', out_match.group(1)).strip())

        # Fallback for sample input: use exampleTestcases
        if not sample_input and data.get("exampleTestcases"):
            sample_input = data.get("exampleTestcases").split("\n\n")[0].strip()

        # Clean HTML content for problem statement
        clean_text = raw_html
        clean_text = re.sub(r'<(script|style).*?</\1>', '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'<br\s*/?>', '\n', clean_text)
        clean_text = re.sub(r'</p>', '\n\n', clean_text)
        clean_text = re.sub(r'</li>', '\n', clean_text)
        clean_text = re.sub(r'<[^>]+>', '', clean_text)
        clean_text = html.unescape(clean_text)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text).strip()

        # Starter python code snippet
        starter_code = ""
        for snip in data.get("codeSnippets", []):
            if snip.get("langSlug") in ["python3", "python"]:
                starter_code = snip.get("code", "")
                break

        title = data.get("title", slug)

        return {
            "status": "SUCCESS",
            "source": "LeetCode GraphQL",
            "title": title,
            "problem": f"{title}\n\n{clean_text}",
            "sample_input": sample_input,
            "sample_output": sample_output,
            "starter_code": starter_code
        }

    except Exception as e:
        print(f"Error fetching LeetCode slug {slug}: {e}")
        return None


def extract_problem_with_llm(url: str, html_text: str) -> Optional[Dict[str, Any]]:
    """Uses LLM to extract problem details from generic web pages."""
    if not llm or not ExtractedProblem:
        return None

    try:
        # Strip long scripts/styles to fit context
        clean_page = re.sub(r'<(script|style|svg|path).*?</\1>', '', html_text, flags=re.DOTALL)
        clean_page = re.sub(r'<[^>]+>', ' ', clean_page)
        clean_page = html.unescape(clean_page)
        clean_page = re.sub(r'\s+', ' ', clean_page)[:8000]

        prompt = f"""
        You are an expert competitive programming scraper.
        Extract the problem statement, sample input, and sample output from the following webpage content:

        URL: {url}
        WEBPAGE CONTENT:
        {clean_page}

        Instructions:
        - title: The name of the problem.
        - problem: The complete problem description with constraints and rules.
        - sample_input: The first sample test case input exactly as specified.
        - sample_output: The first sample test case expected output exactly as specified.
        - starter_code: The Python function/class template if present in the page, otherwise empty string.
        """

        from structured_helper import safe_structured_invoke
        result = safe_structured_invoke(llm, ExtractedProblem, prompt)

        return {
            "status": "SUCCESS",
            "source": "LLM Extractor",
            "title": result.title,
            "problem": result.problem,
            "sample_input": result.sample_input,
            "sample_output": result.sample_output,
            "starter_code": result.starter_code
        }
    except Exception as e:
        print(f"Error extracting with LLM: {e}")
        return None


def extract_problem(url_or_slug: str) -> Dict[str, Any]:
    """
    Main extraction dispatcher:
    Accepts a LeetCode URL, a LeetCode problem slug, or any competitive programming problem URL.
    """
    url_or_slug = url_or_slug.strip()
    if not url_or_slug:
        return {"status": "ERROR", "message": "Please provide a valid problem URL or slug."}

    # 1. Check if it's a LeetCode URL or slug
    leetcode_slug_match = re.search(r'leetcode\.[a-z]+/problems/([a-zA-Z0-9_\-]+)', url_or_slug)
    slug = None
    if leetcode_slug_match:
        slug = leetcode_slug_match.group(1).rstrip('/')
    elif not url_or_slug.startswith("http://") and not url_or_slug.startswith("https://") and "/" not in url_or_slug and "." not in url_or_slug:
        # Bare slug, e.g. "two-sum" or "climbing-stairs-ii"
        slug = url_or_slug.lower()

    if slug:
        lc_data = extract_leetcode_problem(slug)
        if lc_data:
            return lc_data

    # 2. If it's a full URL, attempt direct webpage fetch
    if url_or_slug.startswith("http://") or url_or_slug.startswith("https://"):
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            resp = requests.get(url_or_slug, headers=headers, timeout=12)
            if resp.status_code == 200:
                extracted = extract_problem_with_llm(url_or_slug, resp.text)
                if extracted and extracted.get("problem"):
                    return extracted
        except Exception as e:
            print(f"Failed to fetch webpage directly: {e}")

    return {
        "status": "ERROR",
        "message": f"Could not extract problem details from '{url_or_slug}'. Please verify the URL or switch to Manual Pasting."
    }

