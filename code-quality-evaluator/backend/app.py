from logging import info
import os
import re
import json
import shutil
import tempfile
import subprocess
import sys  # add at top of file if not present
from pathlib import Path
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
OLLAMA_HOST   = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_API_KEY= os.getenv("OLLAMA_API_KEY")
OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL", "qwen3-coder:480b-cloud")

headers = {"Content-Type": "application/json"}
if OLLAMA_HOST.startswith("https://ollama.com") and OLLAMA_API_KEY:
    headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"


app = Flask(__name__)
CORS(app)

TMP_DIR = Path(__file__).parent / "tmp"
TMP_DIR.mkdir(exist_ok=True)

CHECKSTYLE_JAR = os.getenv("CHECKSTYLE_JAR", "")

# Helpful explanations for common ESLint rules
JS_RULE_INFO = {
    "no-console": {
        "why": "Console logs can leak internal info and clutter output in production.",
        "suggestion": "Remove console calls or use a logger with levels (e.g., winston)."
    },
    "no-var": {
        "why": "`var` is function-scoped and hoisted; can cause subtle bugs.",
        "suggestion": "Use `let` or `const` instead."
    },
    "prefer-const": {
        "why": "Values that never reassign should be `const` for clarity and safety.",
        "suggestion": "Change `let` to `const` where reassignment doesn't occur."
    },
    "eqeqeq": {
        "why": "`==`/`!=` do type coercion and often hide bugs.",
        "suggestion": "Use strict equality `===` and `!==`."
    },
    "semi": {
        "why": "Missing semicolons can trigger ASI pitfalls and reduce consistency.",
        "suggestion": "Add semicolons at statement ends."
    },
    "no-unused-vars": {
        "why": "Dead code increases maintenance cost and confuses readers.",
        "suggestion": "Remove the variable or use it; prefix with `_` if intentionally unused."
    }
}

PYLINT_RULE_INFO = {
    "C0114": {"why": "Module has no top-level docstring.", "suggestion": "Add a brief docstring describing purpose."},
    "C0116": {"why": "Function/method has no docstring.", "suggestion": "Describe what it does, params, and return."},
    "W0613": {"why": "Argument is never used.", "suggestion": "Remove it or prefix with `_` if intentionally unused."},
    "W0612": {"why": "Variable assigned but never used.", "suggestion": "Remove the variable or use it."},
    "E0602": {"why": "Variable used before being defined.", "suggestion": "Define it first or fix the name/typo."},
    "E1101": {"why": "Object has no such attribute.", "suggestion": "Check attribute name or type; consider `getattr` guard."},
    "R0912": {"why": "Too many branches.", "suggestion": "Break into smaller functions or simplify conditions."},
    "R0915": {"why": "Too many statements.", "suggestion": "Refactor to reduce function size."},
}

# ---------- helpers ----------
def _ai_review_with_ollama(lang: str, code: str, issues: list, model: str = None, timeout=90):
    model = model or OLLAMA_MODEL

    schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "findings": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "severity": {"type": "string", "enum": ["critical","high","medium","low","info"]},
                        "line": {"type": ["integer","null"]},
                        "why": {"type": "string"},
                        "fix_steps": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["title","severity","why","fix_steps"]
                }
            }
        },
        "required": ["summary","findings"]
    }

    trimmed = [
        {k: it.get(k) for k in ("line","column","severity","rule","symbol","message")}
        for it in (issues or [])[:60]
    ]

    prompt = f"""
You are a senior {lang} reviewer.
Return ONLY valid JSON matching the schema. Do NOT include code snippets or patched code.
Describe steps, risks, and reasoning in words.

SCHEMA:
{json.dumps(schema)}

LINTER FINDINGS:
{json.dumps(trimmed, indent=2)}

SOURCE CODE:
<code>
{code}
</code>
"""

    headers = {"Content-Type": "application/json"}
    if OLLAMA_HOST.startswith("https://ollama.com") and OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"

    r = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        headers=headers,
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.2, "top_p": 0.9, "num_ctx": 8192},
        },
        timeout=timeout,
    )
    r.raise_for_status()
    payload = r.json().get("response", "{}")
    data = json.loads(payload)  # should be valid JSON per `format:"json"`
    return {"ok": True, "data": data}

def _write_temp(code: str, suffix: str) -> Path:
    fd, path = tempfile.mkstemp(suffix=suffix, dir=TMP_DIR)
    os.close(fd)
    p = Path(path)
    p.write_text(code, encoding="utf-8")
    return p

def _simple_rule(source_or_rule: str) -> str:
    if not source_or_rule:
        return ""
    return source_or_rule.split(".")[-1]  # e.g., ...WhitespaceAroundCheck -> WhitespaceAroundCheck

def _run(cmd, **kwargs):
    try:
        completed = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            **kwargs,
        )
        return completed.returncode, completed.stdout, completed.stderr
    except FileNotFoundError as e:
        return 127, "", str(e)

def _clamp(x, lo=0, hi=100):
    return max(lo, min(hi, x))

def _grade_from_mi(mi_value: float) -> str:
    if mi_value is None:
        return None
    if mi_value >= 85: return "A"
    if mi_value >= 70: return "B"
    if mi_value >= 55: return "C"
    if mi_value >= 40: return "D"
    return "E"

def _aggregate_score(parts):
    """Weighted average of [(value, weight)] onto 0..100."""
    if not parts:
        return None
    num = sum(v * w for v, w in parts if v is not None)
    den = sum(w for v, w in parts if v is not None)
    return round(num / den, 1) if den else None

# ---------- analyzers ----------

import sys  # ensure this import exists at top

# ---------- routes ----------

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze")
def analyze():
    data = request.get_json(force=True)
    code = data.get("code", "")
    lang = (data.get("lang", "") or data.get("language", "")).lower().strip()

    prompt = f"""
    You are a senior {lang} reviewer.
    Return ONLY valid JSON that matches the provided schema.
    Do NOT include code snippets or patched code. Give advice and step-by-step fixes only.
    If you must refer to code, describe it in words.

    SCHEMA:
    {json.dumps(schema)}

    LINTER FINDINGS:
    {json.dumps(trimmed, indent=2)}

    SOURCE CODE:
    <code>
    {code}
    </code>
    """
    opts = {"temperature": 0.2, "top_p": 0.9, "num_ctx": 8192}
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json", "options": opts}
    if not code or not lang:
        return jsonify({"error": "Provide 'code' and 'lang' ('python'|'java'|'cpp')."}), 400


@app.route("/ai_review", methods=["POST"])
def ai_review():
    body = request.get_json(force=True) or {}
    code   = body.get("code", "")
    lang   = body.get("lang", "")
    issues = body.get("issues", [])
    model  = body.get("model") or OLLAMA_MODEL

    if not code.strip():
        return jsonify({"error": "No code provided"}), 400

    try:
        res = _ai_review_with_ollama(lang, code, issues, model=model)
        print(res)
        return jsonify({"language": lang, "model": model, "insights": res["data"]})
    except Exception as e:
        return jsonify({"error": f"AI review failed: {e}"}), 502

if __name__ == "__main__":
    # run dev server
    app.run(host="0.0.0.0", port=8080, debug=True)
