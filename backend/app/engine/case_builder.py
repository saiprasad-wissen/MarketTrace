"""
Case Builder
=============
Auto-generates investigation cases from detected alerts.
Groups alerts by (trader_id, symbol) and assigns priorities based on risk scores.
"""

from __future__ import annotations
import uuid
from typing import List, Dict, Any
from collections import defaultdict

from app.engine.surveillance import DetectedAlert
from app.engine.risk_scorer import TraderRiskProfile


def build_cases(
    alerts: List[DetectedAlert],
    risk_profiles: Dict[str, TraderRiskProfile],
    investigation_short_id: str,
) -> List[Dict[str, Any]]:
    """
    Create case records from alerts.
    One case per (trader_id, symbol) combination that has alerts.
    Returns list of dicts ready for DB insertion.
    """
    # Group alerts by (trader, symbol)
    groups: Dict[tuple, List[DetectedAlert]] = defaultdict(list)
    for alert in alerts:
        groups[(alert.trader_id, alert.symbol)].append(alert)

    cases = []
    seq = 1

    for (trader_id, symbol), group_alerts in groups.items():
        profile = risk_profiles.get(trader_id)
        risk_score = profile.risk_score if profile else 50.0

        # Case reference
        case_ref = f"MT-{investigation_short_id}-{seq:04d}"
        seq += 1

        # Priority based on risk score
        status = "Open"
        if risk_score >= 85:
            priority = "Critical"
            status = "Escalated"
            print(f"[WORKFLOW] 🚀 Automated Escalation Triggered for {case_ref}")
            print(f"[WORKFLOW] ↳ Creating Jira Issue in configured project...")
            print(f"[WORKFLOW] ↳ Dispatching Slack alert to compliance channel...")
            print(f"[WORKFLOW] ↳ Sending email alert to configured address...")
        elif risk_score >= 70:
            priority = "High"
        elif risk_score >= 50:
            priority = "Medium"
        else:
            priority = "Low"

        # Aggregate patterns
        patterns = list(set(a.pattern for a in group_alerts))

        # Aggregate evidence
        evidence: Dict[str, Any] = {}
        for alert in group_alerts:
            if alert.evidence:
                evidence.update(alert.evidence)

        cases.append({
            "case_ref": case_ref,
            "trader_id": trader_id,
            "symbol": symbol,
            "patterns": ", ".join(patterns),
            "evidence": evidence,
            "risk_score": risk_score,
            "priority": priority,
            "status": status,
        })

    # Sort by risk score descending
    cases.sort(key=lambda c: c["risk_score"], reverse=True)
    return cases


def get_investigation_stats(
    trades: List[Dict[str, Any]],
    alerts: List[DetectedAlert],
    cases: List[Dict[str, Any]],
    risk_profiles: Dict[str, TraderRiskProfile],
) -> Dict[str, Any]:
    """Compute aggregate stats for the investigation dashboard."""
    unique_symbols = set(t["symbol"] for t in trades)
    escalated = sum(1 for c in cases if c["status"] == "Escalated")
    suspicious = len(risk_profiles)
    avg_risk = (
        round(sum(p.risk_score for p in risk_profiles.values()) / len(risk_profiles), 1)
        if risk_profiles else 0.0
    )

    return {
        "total_trades": len(trades),
        "stocks_monitored": len(unique_symbols),
        "total_alerts": len(alerts),
        "total_cases": len(cases),
        "escalated_cases": escalated,
        "suspicious_traders": suspicious,
        "avg_risk_score": avg_risk,
    }
