"""
Groq AI Service
================
Context-aware investigation copilot powered by Groq.
The system prompt is dynamically built from the actual investigation data —
it knows traders, alerts, cases, and patterns from whatever was uploaded.
No hardcoded analysis.
"""

from __future__ import annotations
from typing import List, Dict, Any, Optional
import httpx
from app.config import get_settings


async def ask_groq(
    question: str,
    conversation_history: List[Dict[str, str]],
    investigation_context: Dict[str, Any],
    settings=None,
) -> str:
    """
    Send a question to Groq with full investigation context injected into the system prompt.

    investigation_context keys (all dynamically populated from uploaded data):
      - investigation_name
      - total_trades
      - total_alerts
      - total_cases
      - suspicious_traders (list of {trader_id, risk_score, patterns})
      - alerts (list of {trader_id, symbol, pattern, severity, evidence})
      - context_events (list of {timestamp, symbol, type, title})
      - current_focus (optional: trader_id | symbol | case_ref)
    """
    if settings is None:
        settings = get_settings()

    api_key = investigation_context.get("groq_api_key") or settings.GROQ_API_KEY
    if not api_key:
        return "❌ No Groq API key configured. Please add your key in Settings → AI Providers."

    # Build dynamic system prompt from investigation data
    system_prompt = _build_system_prompt(investigation_context)

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history[-10:])  # Keep last 10 turns
    messages.append({"role": "user", "content": question})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 1024,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            return "❌ Invalid Groq API key. Please check your key in Settings → AI Providers."
        elif e.response.status_code == 429:
            return "⚠️ Groq rate limit reached. Please wait a moment and try again."
        return f"❌ Groq API error ({e.response.status_code}): {e.response.text[:200]}"
    except Exception as e:
        return f"❌ AI service error: {str(e)}"


def _build_system_prompt(ctx: Dict[str, Any]) -> str:
    """
    Build a rich, context-aware system prompt from live investigation data.
    This prompt is entirely dynamic — it reflects whatever data was uploaded.
    """
    inv_name = ctx.get("investigation_name", "Current Investigation")
    total_trades = ctx.get("total_trades", 0)
    total_alerts = ctx.get("total_alerts", 0)
    total_cases = ctx.get("total_cases", 0)

    # Summarize traders
    traders_summary = ""
    for t in ctx.get("suspicious_traders", [])[:10]:
        traders_summary += (
            f"  - {t['trader_id']}: Risk Score {t['risk_score']}/100, "
            f"Patterns: {', '.join(t['patterns'])}\n"
        )

    # Summarize alerts
    alerts_summary = ""
    for a in ctx.get("alerts", [])[:15]:
        evidence_str = ", ".join(f"{k}={v}" for k, v in (a.get("evidence") or {}).items())
        alerts_summary += (
            f"  - [{a['severity']}] {a['trader_id']} on {a['symbol']}: "
            f"{a['pattern']} ({a.get('confidence','')}) | {evidence_str}\n"
        )

    # Context events
    events_summary = ""
    for e in ctx.get("context_events", [])[:7]:
        events_summary += f"  - {e['timestamp']} [{e['severity']}] {e['symbol']}: {e['title']}\n"

    # Current focus
    focus_section = ""
    focus = ctx.get("current_focus")
    if focus:
        focus_section = f"\nCURRENT FOCUS: The analyst is currently investigating '{focus}'. Tailor your response to this specific subject.\n"

    prompt = f"""You are the AI Investigation Copilot for MarketTrace, an enterprise-grade trade surveillance platform.
You are assisting compliance analysts, market surveillance officers, and regulators.

INVESTIGATION: {inv_name}
DATASET OVERVIEW:
  - Total Trades Analyzed: {total_trades:,}
  - Surveillance Alerts Generated: {total_alerts}
  - Investigation Cases Created: {total_cases}
{focus_section}
SUSPICIOUS TRADERS DETECTED:
{traders_summary or "  None detected yet."}

ACTIVE ALERTS:
{alerts_summary or "  No alerts generated yet."}

MARKET CONTEXT EVENTS:
{events_summary or "  No context events loaded."}

YOUR ROLE:
- You are a specialized Trade Surveillance AI, NOT a general chatbot.
- IF A QUESTION IS UNRELATED to trade surveillance, compliance, or the data provided, you MUST reply with "I don't know" or state that you can only answer compliance questions.
- All your analysis must reference the actual data above.
- Provide precise, evidence-based answers citing specific traders, patterns, metrics.
- Use regulatory terminology (spoofing, wash trading, market manipulation).
- Format your response using Markdown (bolding, lists, and code blocks if needed).
- Keep responses professional, concise, and boardroom-ready.

Respond as an expert compliance investigator reviewing the evidence above."""

    return prompt
