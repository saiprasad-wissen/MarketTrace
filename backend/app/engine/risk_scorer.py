"""
Risk Scorer
===========
Computes composite risk scores (0-100) per trader based on detected alerts.
Fully data-agnostic: scores are derived from alert severity, pattern weights,
frequency, and volume impact — not from hardcoded trader identities.
"""

from __future__ import annotations
from typing import List, Dict, Any
from collections import defaultdict
from dataclasses import dataclass, field

from app.engine.surveillance import DetectedAlert


# Pattern severity base scores (configurable)
# Weights are calibrated to EDA risk scoring sheet:
#   Spoofing 40pts, Layering 35pts, Wash Trading 35pts,
#   Momentum 30pts, Pump&Dump 30pts, Quote Stuffing 25pts, Close Manip 15pts
# Base scores represent a CRITICAL, High-confidence trigger.
# Final scores are scaled by severity and confidence multipliers, then capped at 100.
PATTERN_BASE_SCORES: Dict[str, float] = {
    "Spoofing": 85.0,
    "Momentum Ignition": 80.0,
    "Pump & Dump": 90.0,
    "Quote Stuffing": 70.0,
    "Wash Trading": 80.0,       # EDA: 35 pts contribution; higher base reflects volume-symmetry severity
    "Layering": 75.0,           # EDA: 35 pts contribution
    "Close Manipulation": 65.0, # EDA: 15 pts contribution
}

SEVERITY_MULTIPLIERS: Dict[str, float] = {
    "CRITICAL": 1.0,
    "HIGH": 0.85,
    "MEDIUM": 0.65,
    "LOW": 0.40,
}

CONFIDENCE_MULTIPLIERS: Dict[str, float] = {
    "High": 1.0,
    "Medium": 0.80,
    "Low": 0.55,
}


@dataclass
class TraderRiskProfile:
    trader_id: str
    risk_score: float                          # 0-100
    priority: str                              # Critical | High | Medium | Low
    patterns: List[str]                        # Unique pattern names
    alert_count: int
    symbol_count: int
    evidence_summary: Dict[str, Any] = field(default_factory=dict)


def compute_risk_scores(alerts: List[DetectedAlert]) -> Dict[str, TraderRiskProfile]:
    """
    Compute risk score for each trader based on their alerts.
    Returns a dict keyed by trader_id.
    """
    trader_alerts: Dict[str, List[DetectedAlert]] = defaultdict(list)
    for alert in alerts:
        trader_alerts[alert.trader_id].append(alert)

    profiles: Dict[str, TraderRiskProfile] = {}

    for trader_id, t_alerts in trader_alerts.items():
        # Base score: highest single pattern score
        pattern_scores = []
        for alert in t_alerts:
            base = PATTERN_BASE_SCORES.get(alert.pattern, 60.0)
            sev_mult = SEVERITY_MULTIPLIERS.get(alert.severity, 0.65)
            conf_mult = CONFIDENCE_MULTIPLIERS.get(alert.confidence, 0.80)
            score = base * sev_mult * conf_mult
            pattern_scores.append(score)

        if not pattern_scores:
            continue

        # Primary score = max individual pattern score
        primary_score = max(pattern_scores)

        # Frequency bonus: multiple patterns add up to 15 points
        unique_patterns = list(set(a.pattern for a in t_alerts))
        frequency_bonus = min(len(unique_patterns) * 4.0, 15.0)

        # Multi-symbol bonus: active across many symbols (up to 10 points)
        unique_symbols = set(a.symbol for a in t_alerts)
        symbol_bonus = min(len(unique_symbols) * 2.5, 10.0)

        # Hard cap at 100 — the rule-based engine is scored out of 100
        total_score = min(primary_score + frequency_bonus + symbol_bonus, 100.0)
        total_score = round(total_score, 1)

        # Priority classification
        if total_score >= 85:
            priority = "Critical"
        elif total_score >= 70:
            priority = "High"
        elif total_score >= 50:
            priority = "Medium"
        else:
            priority = "Low"

        # Build evidence summary
        evidence_summary: Dict[str, Any] = {
            "pattern_scores": {a.pattern: round(s, 1) for a, s in zip(t_alerts, pattern_scores)},
            "frequency_bonus": round(frequency_bonus, 1),
            "symbol_bonus": round(symbol_bonus, 1),
        }

        # Aggregate key evidence fields across alerts
        for alert in t_alerts:
            if alert.evidence:
                for k, v in alert.evidence.items():
                    if k not in evidence_summary:
                        evidence_summary[k] = v

        profiles[trader_id] = TraderRiskProfile(
            trader_id=trader_id,
            risk_score=total_score,
            priority=priority,
            patterns=unique_patterns,
            alert_count=len(t_alerts),
            symbol_count=len(unique_symbols),
            evidence_summary=evidence_summary,
        )

    return profiles
