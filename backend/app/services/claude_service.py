import logging
from typing import Dict, Any, List
import json
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.settings import AppSettings
from app.models.audit import TokenUsage
from app.models.trade import Trade, ContextEvent

logger = logging.getLogger(__name__)

# Pricing per million tokens
CLAUDE_COST = {"input": 3.0, "output": 15.0}  # Claude 4 Sonnet
GROQ_COST = {"input": 0.5, "output": 0.5}     # Llama 3.3

async def _get_api_keys(db: AsyncSession, user_id: str) -> tuple[str | None, str | None]:
    result = await db.execute(select(AppSettings).where(AppSettings.key.in_(["anthropic_api_key", "groq_api_key"]), AppSettings.user_id == user_id))
    rows = result.scalars().all()
    keys = {row.key: row.value.strip() if row.value else None for row in rows}
    return keys.get("anthropic_api_key"), keys.get("groq_api_key")

async def _log_usage(db: AsyncSession, model_name: str, input_tokens: int, output_tokens: int, user_id: str):
    cost_map = CLAUDE_COST if "claude" in model_name.lower() else GROQ_COST
    cost = (input_tokens / 1_000_000) * cost_map["input"] + (output_tokens / 1_000_000) * cost_map["output"]
    
    usage = TokenUsage(
        user_id=user_id,
        model_name=model_name,
        user_id=user_id,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_cost=cost
    )
    db.add(usage)
    await db.commit()

async def generate_batch_case_reasoning(
    cases_batch: List[Dict[str, Any]],
    trades: List[Trade],
    context_events: List[ContextEvent],
    false_positive_alerts: List[Any],
    db: AsyncSession,
    user_id: str
) -> Dict[str, str]:
    """
    Generate deep forensic reasoning for a batch of cases using Llama 3.3 (Groq).
    Returns a dict mapping case_id to a JSON string representation of the reasoning tree.
    """
    anthropic_key, groq_key = await _get_api_keys(db, user_id)
    if not anthropic_key and not groq_key:
        logger.error("No API keys available for case batching.")
        return {c["case_id"]: json.dumps([{"step": "Configuration Error", "description": "No API keys configured in settings.", "risk_level": "High"}]) for c in cases_batch}

    # Format data for prompt
    prompt_cases = []
    
    context_text = "\n".join([f"[{e.timestamp}] {e.event_type} - {e.title} (Severity: {e.severity})" for e in context_events])

    for c in cases_batch:
        symbol = c.get("symbol")
        
        # Extract trades only for this specific case to keep prompt clean
        rel_trades = [t for t in trades if t.trader_id == c["trader_id"] and t.symbol == c["symbol"]][:20]
        trade_text = "\n".join([f"[{t.timestamp}] {t.side} {t.quantity} {t.symbol} @ {t.price} (Status: {t.status})" for t in rel_trades])
        
        # Build false positive context for this specific trader
        fp_patterns = [a.pattern for a in false_positive_alerts if a.trader_id == c["trader_id"]]
        fp_text = ""
        if fp_patterns:
            unique_fps = list(set(fp_patterns))
            fp_text = f"\nFALSE POSITIVE CONTEXT (HEAVILY WEIGHT THIS):\nNote: {len(fp_patterns)} similar alerts from this trader ({', '.join(unique_fps)}) were previously marked FALSE POSITIVE by compliance. If the current behavior matches these patterns exactly, you MUST explicitly state that this is likely benign behavior in your reasoning and lower the risk_level."

        prompt_cases.append(f"""
CASE ID: {c.get('case_id')}
Trader: {c.get('trader_id')}
Symbol: {symbol}
Risk Score: {c.get('risk_score')}
Patterns Detected: {c.get('patterns')}
Evidence Extract: {c.get('evidence')}{fp_text}
Recent Trades (Sample):
{trade_text}
Market Context:
{context_text}
""")

    batch_text = "\n==========================\n".join(prompt_cases)
    
    prompt = f"""
You are an expert Forensic Market Surveillance Analyst.
Analyze the following batch of {len(cases_batch)} market manipulation cases.

For EACH case, construct a step-by-step 'Reasoning Tree' explaining how the manipulation occurred.
You MUST carefully trace down the timeline of events by taking the 'Market Context' into consideration alongside the 'Recent Trades'.
You MUST output ONLY a valid JSON object where the keys are the EXACT CASE IDs provided, and the value is a JSON array of steps.
Do NOT output any markdown, markdown code blocks, or explanatory text. Just the raw JSON object.

Each step in the array should have:
- "step": A short title for the step.
- "description": A highly detailed, data-driven narrative explaining exactly what the trader did. DO NOT write single generic sentences. Instead, weave a comprehensive forensic narrative that heavily cites the exact numbers from the evidence extract and recent trades (e.g. 'T007 placed 11 large BUY orders on NVDA (>=28,395 units, 100% cancelled within 30s), then executed 5,000 units on the SELL side...'). The compliance judges require extensive, precise evidence from the extract.
- "risk_level": "High", "Medium", or "Low"

CASES:
{batch_text}

EXPECTED OUTPUT FORMAT (RAW JSON ONLY):
{{
  "case_id_1": [
    {{"step": "...", "description": "...", "risk_level": "..."}},
    {{"step": "...", "description": "...", "risk_level": "..."}}
  ],
  "case_id_2": [...]
}}
"""

    messages = [
        {"role": "system", "content": "You are a forensic API that outputs ONLY valid JSON without any markdown formatting or wrapper."},
        {"role": "user", "content": prompt}
    ]

    try:
        if not anthropic_key:
            raise ValueError("No Anthropic key, skipping to Groq fallback")
            
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=anthropic_key)
        
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            temperature=0.1,
            system="You are a forensic API that outputs ONLY valid JSON without any markdown formatting or wrapper.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text
        await _log_usage(db, "claude-3.5-sonnet", response.usage.input_tokens, response.usage.output_tokens, user_id)
        
        import re
        json_match = re.search(r'\{.*\}', content.strip(), re.DOTALL)
        if json_match:
            parsed_json = json.loads(json_match.group(0))
        else:
            parsed_json = json.loads(content.strip())
            
        result = {}
        for cid in [c["case_id"] for c in cases_batch]:
            if cid in parsed_json:
                result[cid] = json.dumps(parsed_json[cid])
            else:
                result[cid] = json.dumps([{"step": "Parse Error", "description": "Claude failed to return reasoning for this specific case ID.", "risk_level": "Medium"}])
        return result
        
    except Exception as e:
        logger.error(f"Claude 4 Sonnet batch case reasoning failed: {e}. Falling back to Groq...")
        
        if not groq_key:
            return {c["case_id"]: json.dumps([{"step": "API Error", "description": f"Claude failed: {str(e)}. No Groq fallback key.", "risk_level": "High"}]) for c in cases_batch}
            
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": messages,
                        "temperature": 0.1,
                        "max_tokens": 4096,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                
                await _log_usage(
                    db,
                    model_name="llama-3.3-70b-versatile",
                    input_tokens=data.get("usage", {}).get("prompt_tokens", 0),
                    output_tokens=data.get("usage", {}).get("completion_tokens", 0),
                    user_id=user_id
                )
                
                content = data["choices"][0]["message"]["content"].strip()
                
                import re
                json_match = re.search(r'\{.*\}', content.strip(), re.DOTALL)
                if json_match:
                    parsed_json = json.loads(json_match.group(0))
                else:
                    parsed_json = json.loads(content.strip())
                
                result = {}
                for cid in [c["case_id"] for c in cases_batch]:
                    if cid in parsed_json:
                        result[cid] = json.dumps(parsed_json[cid])
                    else:
                        result[cid] = json.dumps([{"step": "Parse Error", "description": "Llama 3.3 failed to return reasoning for this specific case ID.", "risk_level": "Medium"}])
                return result
                
        except Exception as fallback_err:
            logger.error(f"Llama 3.3 batch case reasoning failed: {fallback_err}")
            return {c["case_id"]: json.dumps([{"step": "API Error", "description": f"Both Claude and Llama failed. Claude: {str(e)} | Llama: {str(fallback_err)}", "risk_level": "High"}]) for c in cases_batch}


async def generate_trader_profile_reasoning(
    trader_id: str,
    cases_summary: List[Dict[str, Any]],
    false_positive_alerts: List[Any],
    db: AsyncSession,
    user_id: str
) -> str:
    """
    Generate an overarching Suspicious Trader Profile using Claude 4 Sonnet.
    """
    anthropic_key, groq_key = await _get_api_keys(db, user_id)
    if not anthropic_key and not groq_key:
        return "No API keys configured for AI analysis."

    cases_text = ""
    for c in cases_summary:
        cases_text += f"- Symbol: {c.get('symbol')} | Risk: {c.get('risk_score')} | Patterns: {c.get('patterns')}\n"

    fp_patterns = [a.pattern for a in false_positive_alerts if a.trader_id == trader_id]
    fp_text = ""
    if fp_patterns:
        unique_fps = list(set(fp_patterns))
        fp_text = f"\nFALSE POSITIVE CONTEXT (HEAVILY WEIGHT THIS):\nNote: {len(fp_patterns)} patterns ({', '.join(unique_fps)}) from this desk were previously marked FALSE POSITIVE by compliance. Acknowledge this mitigating factor explicitly when profiling the trader's behavior."

    prompt = f"""
You are an expert Forensic Market Surveillance Analyst.
Create a comprehensive 'Suspicious Trader Profile' report for the following trader based on the summarized cases flagged during the session.

Trader ID: {trader_id}
Total Cases Flagged: {len(cases_summary)}

Flagged Activity Summary:
{cases_text}{fp_text}

CRITICAL INSTRUCTIONS:
- DO NOT write generic boilerplate sections (e.g., do NOT include 'Executive Summary', 'Risk Assessment', 'Recommendations', or 'Conclusion').
- Instead, dive straight into a detailed forensic analysis of EACH CASE. Expand extensively on the reasoning for each manipulation pattern flagged for this trader based on the cases summary.
- Use the provided cases summary to construct a timeline of abusive behavior.
- Use clean Markdown formatting. Do not output JSON.
"""

    try:
        if not anthropic_key:
            raise ValueError("No Anthropic key, skipping to fallback")
            
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=anthropic_key)
        
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            temperature=0.2,
            system="You are an expert Forensic Market Surveillance Analyst.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text
        
        # Log token usage
        await _log_usage(db, "claude-3.5-sonnet", response.usage.input_tokens, response.usage.output_tokens, user_id)
        
        return content
    except Exception as e:
        logger.error(f"Claude 4 Sonnet trader profile generation failed, falling back to Groq: {e}")
        
        if not groq_key:
            return f"AI Analysis failed. Anthropic error: {str(e)} and no Groq fallback key available."
            
        try:
            import httpx
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": "You are an expert Forensic Market Surveillance Analyst."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2,
                        "max_completion_tokens": 1024
                    }
                )
                resp.raise_for_status()
                data = resp.json()
                
                content = data["choices"][0]["message"]["content"]
                
                # Log usage
                usage = data.get("usage", {})
                await _log_usage(db, "llama-3.3-70b-versatile (fallback)", usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0), user_id)
                
                return content
        except Exception as fallback_err:
            logger.error(f"Groq fallback also failed: {fallback_err}")
            return f"AI Analysis completely failed.\nAnthropic Error: {str(e)}\nGroq Fallback Error: {str(fallback_err)}"
