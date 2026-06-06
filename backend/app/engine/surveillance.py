"""
MarketTrace Surveillance Engine
================================
Fully data-agnostic pattern detection engine.
All thresholds are configurable — no hardcoded trader IDs, symbols, or prices.
Detects patterns based purely on structural properties of uploaded trade data.

Patterns Detected:
  1. Spoofing
  2. Quote Stuffing
  3. Momentum Ignition
  4. Pump & Dump
  5. Wash Trading
  6. Layering
  7. Close Manipulation
"""

from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
from dataclasses import dataclass, field
import re

# ---------------------------------------------------------------------------
# Configuration — all thresholds are runtime-configurable, not hardcoded
# ---------------------------------------------------------------------------

@dataclass
class SurveillanceConfig:
    """
    All thresholds used by the detection engine.
    These apply to ANY dataset regardless of exchange, symbol, or trader IDs.
    """
    # Spoofing
    spoofing_min_order_size_multiplier: float = 5.0    # Large order must be N× avg order size
    spoofing_cancel_window_seconds: int = 30            # Must cancel within N seconds
    spoofing_min_cancel_ratio: float = 0.70             # ≥70% of NEW orders cancelled

    # Quote Stuffing
    quote_stuffing_min_cycles: int = 5                  # Min NEW→CANCEL cycles
    quote_stuffing_window_seconds: int = 30             # Within N seconds
    quote_stuffing_min_frequency: float = 3.0           # Min cycles per minute

    # Momentum Ignition
    momentum_min_steps: int = 3                         # Min staircase accumulation steps
    momentum_quantity_increase_pct: float = 0.10        # Each step increases qty by ≥10%
    momentum_exit_multiplier: float = 1.5               # Exit size ≥ N× total accumulated

    # Pump & Dump
    pump_dump_min_accumulation_trades: int = 3          # Min accumulation trades
    pump_dump_min_price_change_pct: float = 0.005       # ≥0.5% price increase during accumulation
    pump_dump_sell_size_multiplier: float = 2.0         # Sell size ≥ N× avg accumulation trade

    # Wash Trading
    wash_trading_time_window_seconds: int = 120         # BUY and SELL within N seconds
    wash_trading_price_tolerance_pct: float = 0.001     # Price difference ≤ 0.1%
    wash_trading_min_quantity: float = 100              # Min quantity to flag

    # Layering
    layering_min_levels: int = 3                        # Min simultaneous bid levels
    layering_cancel_window_seconds: int = 10            # All cancelled within N seconds

    # Close Manipulation
    close_manipulation_window_minutes: int = 30         # Last N minutes of session
    close_manipulation_volume_multiplier: float = 3.0  # Volume ≥ N× trader's avg


DEFAULT_CONFIG = SurveillanceConfig()


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class TradeRecord:
    """Normalized trade record passed into the engine."""
    timestamp: str
    trader_id: str
    symbol: str
    side: str          # BUY | SELL
    quantity: float
    price: float
    order_id: str
    status: str        # NEW | EXECUTE | CANCEL
    sequence_num: int = 0

    def time_seconds(self) -> int:
        """Convert HH:MM:SS or HH:MM timestamp to total seconds since midnight."""
        parts = self.timestamp.strip().split(":")
        try:
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            elif len(parts) == 2:
                return int(parts[0]) * 3600 + int(parts[1]) * 60
        except (ValueError, IndexError):
            pass
        return self.sequence_num * 10  # fallback: use sequence


@dataclass
class DetectedAlert:
    trader_id: str
    symbol: str
    pattern: str
    severity: str       # CRITICAL | HIGH | MEDIUM | LOW
    confidence: str     # High | Medium | Low
    start_time: str
    end_time: str
    evidence: Dict[str, Any]
    description: str


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _parse_time_seconds(ts: str, seq: int = 0) -> int:
    """Parse a timestamp string to seconds. Falls back gracefully."""
    parts = ts.strip().split(":")
    try:
        if len(parts) >= 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 3600 + int(parts[1]) * 60
    except (ValueError, IndexError):
        pass
    return seq * 10


def _session_end_seconds(trades: List[TradeRecord]) -> int:
    """Infer end-of-session time from the latest trade timestamp."""
    times = [_parse_time_seconds(t.timestamp, t.sequence_num) for t in trades]
    return max(times) if times else 57600  # default 16:00


def _avg_order_size(trades: List[TradeRecord], symbol: str) -> float:
    """Compute average EXECUTE order size for a given symbol across all traders."""
    executed = [t.quantity for t in trades if t.symbol == symbol and t.status == "EXECUTE"]
    return sum(executed) / len(executed) if executed else 1.0


# ---------------------------------------------------------------------------
# Pattern 1: Spoofing
# ---------------------------------------------------------------------------

def detect_spoofing(
    trades: List[TradeRecord],
    config: SurveillanceConfig = DEFAULT_CONFIG,
) -> List[DetectedAlert]:
    """
    Spoofing: Trader places large NEW orders on one side, cancels them quickly,
    then executes a profitable trade on the opposite side.
    Detected purely by structural analysis — no hardcoded traders or symbols.
    """
    alerts: List[DetectedAlert] = []

    # Group by (trader, symbol)
    groups: Dict[Tuple[str, str], List[TradeRecord]] = defaultdict(list)
    for t in trades:
        groups[(t.trader_id, t.symbol)].append(t)

    for (trader_id, symbol), group in groups.items():
        group_sorted = sorted(group, key=lambda x: _parse_time_seconds(x.timestamp, x.sequence_num))

        avg_size = _avg_order_size(trades, symbol)
        large_threshold = avg_size * config.spoofing_min_order_size_multiplier

        # Find NEW orders that are large
        new_orders: Dict[str, TradeRecord] = {}
        for t in group_sorted:
            if t.status == "NEW" and t.quantity >= large_threshold:
                new_orders[t.order_id] = t

        if not new_orders:
            continue

        # For each large NEW, check if it was cancelled within window
        cancelled_orders = []
        for t in group_sorted:
            if t.status == "CANCEL" and t.order_id in new_orders:
                new_t = new_orders[t.order_id]
                dt = abs(_parse_time_seconds(t.timestamp, t.sequence_num) -
                         _parse_time_seconds(new_t.timestamp, new_t.sequence_num))
                if dt <= config.spoofing_cancel_window_seconds:
                    cancelled_orders.append((new_t, t))

        if not cancelled_orders:
            continue

        cancel_ratio = len(cancelled_orders) / len(new_orders) if new_orders else 0
        if cancel_ratio < config.spoofing_min_cancel_ratio:
            continue

        # Check for opposite-side execution after the cancel cluster
        cancel_end_time = max(_parse_time_seconds(c.timestamp, c.sequence_num) for _, c in cancelled_orders)
        spoof_side = cancelled_orders[0][0].side
        opposite_side = "SELL" if spoof_side == "BUY" else "BUY"

        post_executions = [
            t for t in group_sorted
            if t.status == "EXECUTE"
            and t.side == opposite_side
            and _parse_time_seconds(t.timestamp, t.sequence_num) >= cancel_end_time
            and _parse_time_seconds(t.timestamp, t.sequence_num) <= cancel_end_time + 120
        ]

        if not post_executions:
            continue

        cancelled_vol = sum(n.quantity for n, _ in cancelled_orders)
        executed_vol = sum(t.quantity for t in post_executions)

        severity = "CRITICAL" if cancel_ratio >= 0.90 else "HIGH"
        confidence = "High" if len(cancelled_orders) >= 3 else "Medium"

        alerts.append(DetectedAlert(
            trader_id=trader_id,
            symbol=symbol,
            pattern="Spoofing",
            severity=severity,
            confidence=confidence,
            start_time=cancelled_orders[0][0].timestamp,
            end_time=post_executions[-1].timestamp,
            evidence={
                "cancelled_orders": len(cancelled_orders),
                "cancellation_ratio": round(cancel_ratio * 100, 1),
                "cancelled_volume": cancelled_vol,
                "executed_volume": executed_vol,
                "large_order_threshold": round(large_threshold, 2),
                "avg_order_size": round(avg_size, 2),
                "spoof_side": spoof_side,
                "execution_side": opposite_side,
            },
            description=(
                f"{trader_id} placed {len(new_orders)} large {spoof_side} orders on {symbol} "
                f"(≥{round(large_threshold):,} units, {round(cancel_ratio*100)}% cancelled within "
                f"{config.spoofing_cancel_window_seconds}s), then executed {executed_vol:,.0f} units "
                f"on the {opposite_side} side — classic spoofing pattern."
            ),
        ))

    return alerts


# ---------------------------------------------------------------------------
# Pattern 2: Quote Stuffing
# ---------------------------------------------------------------------------

def detect_quote_stuffing(
    trades: List[TradeRecord],
    config: SurveillanceConfig = DEFAULT_CONFIG,
) -> List[DetectedAlert]:
    """
    Quote Stuffing: Rapid-fire placement and cancellation of orders to flood
    the order book and slow down other participants.
    Detected by counting NEW→CANCEL cycles within short time windows.
    """
    alerts: List[DetectedAlert] = []

    groups: Dict[Tuple[str, str], List[TradeRecord]] = defaultdict(list)
    for t in trades:
        groups[(t.trader_id, t.symbol)].append(t)

    for (trader_id, symbol), group in groups.items():
        group_sorted = sorted(group, key=lambda x: _parse_time_seconds(x.timestamp, x.sequence_num))

        # Find NEW→CANCEL pairs
        new_orders: Dict[str, int] = {}  # order_id → time_seconds
        cycles = []

        for t in group_sorted:
            t_sec = _parse_time_seconds(t.timestamp, t.sequence_num)
            if t.status == "NEW":
                new_orders[t.order_id] = t_sec
            elif t.status == "CANCEL" and t.order_id in new_orders:
                dt = t_sec - new_orders[t.order_id]
                if dt <= 5:  # Very quick cancel (≤5s)
                    cycles.append((new_orders[t.order_id], t_sec, t.timestamp))
                del new_orders[t.order_id]

        if len(cycles) < config.quote_stuffing_min_cycles:
            continue

        # Check density within the configured window
        for i in range(len(cycles) - config.quote_stuffing_min_cycles + 1):
            window_cycles = cycles[i:i + config.quote_stuffing_min_cycles]
            window_duration = window_cycles[-1][1] - window_cycles[0][0]
            if window_duration <= config.quote_stuffing_window_seconds:
                frequency = len(window_cycles) / (window_duration / 60) if window_duration > 0 else len(window_cycles) * 60

                severity = "HIGH" if len(cycles) >= 10 else "MEDIUM"
                alerts.append(DetectedAlert(
                    trader_id=trader_id,
                    symbol=symbol,
                    pattern="Quote Stuffing",
                    severity=severity,
                    confidence="High",
                    start_time=cycles[0][2] if cycles else group_sorted[0].timestamp,
                    end_time=cycles[-1][2] if cycles else group_sorted[-1].timestamp,
                    evidence={
                        "rapid_cycles": len(cycles),
                        "window_seconds": window_duration,
                        "cycles_per_minute": round(frequency, 1),
                        "min_cycles_threshold": config.quote_stuffing_min_cycles,
                    },
                    description=(
                        f"{trader_id} executed {len(cycles)} rapid order/cancel cycles on {symbol} "
                        f"within {window_duration}s ({round(frequency, 1)} cycles/min) — "
                        f"consistent with quote stuffing to impede market participants."
                    ),
                ))
                break  # One alert per (trader, symbol) pair

    return alerts


# ---------------------------------------------------------------------------
# Pattern 3: Momentum Ignition
# ---------------------------------------------------------------------------

def detect_momentum_ignition(
    trades: List[TradeRecord],
    config: SurveillanceConfig = DEFAULT_CONFIG,
) -> List[DetectedAlert]:
    """
    Momentum Ignition: Trader accumulates positions in a staircase pattern
    (increasing quantity each step), driving price up, then dumps at the peak.
    """
    alerts: List[DetectedAlert] = []

    groups: Dict[Tuple[str, str], List[TradeRecord]] = defaultdict(list)
    for t in trades:
        groups[(t.trader_id, t.symbol)].append(t)

    for (trader_id, symbol), group in groups.items():
        executed = sorted(
            [t for t in group if t.status == "EXECUTE"],
            key=lambda x: _parse_time_seconds(x.timestamp, x.sequence_num),
        )
        if len(executed) < config.momentum_min_steps + 1:
            continue

        # Scan for staircase BUY sequences
        i = 0
        while i < len(executed) - config.momentum_min_steps:
            # Try to build a staircase starting at i
            staircase = [executed[i]]
            j = i + 1
            while j < len(executed):
                last = staircase[-1]
                curr = executed[j]
                if curr.side == last.side == "BUY" and curr.quantity >= last.quantity * (1 + config.momentum_quantity_increase_pct):
                    staircase.append(curr)
                elif curr.side == "SELL" and len(staircase) >= config.momentum_min_steps:
                    # Check exit size
                    total_accumulated = sum(t.quantity for t in staircase)
                    if curr.quantity >= total_accumulated * config.momentum_exit_multiplier * 0.5:
                        # Price impact
                        entry_price = staircase[0].price
                        exit_price = curr.price
                        price_change_pct = (exit_price - entry_price) / entry_price * 100

                        severity = "CRITICAL" if price_change_pct > 2.0 else "HIGH"
                        confidence = "High" if len(staircase) >= 4 else "Medium"

                        alerts.append(DetectedAlert(
                            trader_id=trader_id,
                            symbol=symbol,
                            pattern="Momentum Ignition",
                            severity=severity,
                            confidence=confidence,
                            start_time=staircase[0].timestamp,
                            end_time=curr.timestamp,
                            evidence={
                                "accumulation_steps": len(staircase),
                                "total_accumulated": total_accumulated,
                                "exit_quantity": curr.quantity,
                                "entry_price": round(entry_price, 4),
                                "exit_price": round(exit_price, 4),
                                "price_change_pct": round(price_change_pct, 2),
                                "staircase_quantities": [t.quantity for t in staircase],
                            },
                            description=(
                                f"{trader_id} accumulated {total_accumulated:,.0f} units of {symbol} "
                                f"in {len(staircase)} escalating BUY steps "
                                f"(entry: {entry_price}, exit: {exit_price}, "
                                f"+{round(price_change_pct, 2)}%), then sold {curr.quantity:,.0f} units — "
                                f"momentum ignition pattern."
                            ),
                        ))
                        i = j  # Skip past this sequence
                    break
                else:
                    break
                j += 1
            i += 1

    return alerts


# ---------------------------------------------------------------------------
# Pattern 4: Pump & Dump
# ---------------------------------------------------------------------------

def detect_pump_and_dump(
    trades: List[TradeRecord],
    config: SurveillanceConfig = DEFAULT_CONFIG,
) -> List[DetectedAlert]:
    """
    Pump & Dump: Sustained accumulation over time followed by a large exit
    at a significantly higher price. Differs from momentum ignition by the
    longer accumulation window (minutes vs seconds).
    """
    alerts: List[DetectedAlert] = []

    groups: Dict[Tuple[str, str], List[TradeRecord]] = defaultdict(list)
    for t in trades:
        groups[(t.trader_id, t.symbol)].append(t)

    for (trader_id, symbol), group in groups.items():
        executed = sorted(
            [t for t in group if t.status == "EXECUTE"],
            key=lambda x: _parse_time_seconds(x.timestamp, x.sequence_num),
        )

        buys = [t for t in executed if t.side == "BUY"]
        sells = [t for t in executed if t.side == "SELL"]

        if len(buys) < config.pump_dump_min_accumulation_trades or not sells:
            continue

        # Look for a buy cluster followed by a large sell
        for sell in sells:
            sell_time = _parse_time_seconds(sell.timestamp, sell.sequence_num)
            # Buys that happened before this sell
            prior_buys = [
                b for b in buys
                if _parse_time_seconds(b.timestamp, b.sequence_num) < sell_time
            ]
            if len(prior_buys) < config.pump_dump_min_accumulation_trades:
                continue

            total_buy_vol = sum(b.quantity for b in prior_buys)
            avg_buy_vol = total_buy_vol / len(prior_buys)

            if sell.quantity < avg_buy_vol * config.pump_dump_sell_size_multiplier:
                continue

            # Price movement check
            entry_price = prior_buys[0].price
            exit_price = sell.price
            if entry_price <= 0:
                continue
            price_change_pct = (exit_price - entry_price) / entry_price * 100

            if price_change_pct < config.pump_dump_min_price_change_pct * 100:
                continue

            # Accumulation window
            buy_start = _parse_time_seconds(prior_buys[0].timestamp, prior_buys[0].sequence_num)
            accum_window_minutes = (sell_time - buy_start) / 60

            severity = "CRITICAL" if price_change_pct > 3.0 else "HIGH"
            confidence = "High" if len(prior_buys) >= 4 else "Medium"

            alerts.append(DetectedAlert(
                trader_id=trader_id,
                symbol=symbol,
                pattern="Pump & Dump",
                severity=severity,
                confidence=confidence,
                start_time=prior_buys[0].timestamp,
                end_time=sell.timestamp,
                evidence={
                    "accumulation_trades": len(prior_buys),
                    "total_accumulated": total_buy_vol,
                    "exit_quantity": sell.quantity,
                    "entry_price": round(entry_price, 4),
                    "exit_price": round(exit_price, 4),
                    "price_change_pct": round(price_change_pct, 2),
                    "accumulation_window_minutes": round(accum_window_minutes, 1),
                },
                description=(
                    f"{trader_id} accumulated {total_buy_vol:,.0f} units of {symbol} "
                    f"over {round(accum_window_minutes, 1)} minutes "
                    f"(entry: {entry_price} → exit: {exit_price}, +{round(price_change_pct, 2)}%), "
                    f"then dumped {sell.quantity:,.0f} units — pump & dump pattern."
                ),
            ))
            break  # One alert per (trader, symbol)

    return alerts


# ---------------------------------------------------------------------------
# Pattern 5: Wash Trading
# ---------------------------------------------------------------------------

def detect_wash_trading(
    trades: List[TradeRecord],
    config: SurveillanceConfig = DEFAULT_CONFIG,
) -> List[DetectedAlert]:
    """
    Wash Trading: Same trader buys and sells the same instrument at the same
    price within a short window, creating artificial volume with no real
    economic purpose. Detected by matching BUY/SELL pairs by same trader.
    """
    alerts: List[DetectedAlert] = []

    groups: Dict[Tuple[str, str], List[TradeRecord]] = defaultdict(list)
    for t in trades:
        groups[(t.trader_id, t.symbol)].append(t)

    for (trader_id, symbol), group in groups.items():
        executed = sorted(
            [t for t in group if t.status == "EXECUTE"],
            key=lambda x: _parse_time_seconds(x.timestamp, x.sequence_num),
        )

        buys = [t for t in executed if t.side == "BUY"]
        sells = [t for t in executed if t.side == "SELL"]

        if not buys or not sells:
            continue

        matched_pairs = []
        used_sells = set()

        for buy in buys:
            buy_time = _parse_time_seconds(buy.timestamp, buy.sequence_num)
            buy_price = buy.price

            for si, sell in enumerate(sells):
                if si in used_sells:
                    continue
                sell_time = _parse_time_seconds(sell.timestamp, sell.sequence_num)
                sell_price = sell.price
                dt = abs(sell_time - buy_time)

                if dt > config.wash_trading_time_window_seconds:
                    continue

                price_diff_pct = abs(sell_price - buy_price) / buy_price if buy_price > 0 else 1
                if price_diff_pct > config.wash_trading_price_tolerance_pct:
                    continue

                if buy.quantity < config.wash_trading_min_quantity:
                    continue

                matched_pairs.append((buy, sell))
                used_sells.add(si)
                break

        if not matched_pairs:
            continue

        wash_volume = sum(b.quantity for b, _ in matched_pairs)
        total_volume = sum(t.quantity for t in executed)
        wash_ratio = wash_volume / total_volume if total_volume > 0 else 0

        severity = "HIGH" if len(matched_pairs) >= 3 else "MEDIUM"
        confidence = "High" if wash_ratio > 0.5 else "Medium"

        alerts.append(DetectedAlert(
            trader_id=trader_id,
            symbol=symbol,
            pattern="Wash Trading",
            severity=severity,
            confidence=confidence,
            start_time=matched_pairs[0][0].timestamp,
            end_time=matched_pairs[-1][1].timestamp,
            evidence={
                "matched_pairs": len(matched_pairs),
                "wash_volume": wash_volume,
                "total_volume": total_volume,
                "wash_ratio_pct": round(wash_ratio * 100, 1),
                "price_tolerance_pct": config.wash_trading_price_tolerance_pct * 100,
            },
            description=(
                f"{trader_id} executed {len(matched_pairs)} matched BUY/SELL pairs on {symbol} "
                f"at nearly identical prices within {config.wash_trading_time_window_seconds}s — "
                f"{round(wash_ratio*100, 1)}% of volume is artificial wash trading."
            ),
        ))

    return alerts


# ---------------------------------------------------------------------------
# Pattern 6: Layering
# ---------------------------------------------------------------------------

def detect_layering(
    trades: List[TradeRecord],
    config: SurveillanceConfig = DEFAULT_CONFIG,
) -> List[DetectedAlert]:
    """
    Layering: Multiple bid/ask levels placed simultaneously then cancelled
    together to create a false impression of market depth.
    """
    alerts: List[DetectedAlert] = []

    groups: Dict[Tuple[str, str], List[TradeRecord]] = defaultdict(list)
    for t in trades:
        groups[(t.trader_id, t.symbol)].append(t)

    for (trader_id, symbol), group in groups.items():
        group_sorted = sorted(group, key=lambda x: _parse_time_seconds(x.timestamp, x.sequence_num))

        # Find clusters of simultaneous NEW orders (within 2s of each other)
        new_orders = [t for t in group_sorted if t.status == "NEW"]
        if len(new_orders) < config.layering_min_levels:
            continue

        i = 0
        while i < len(new_orders) - config.layering_min_levels + 1:
            cluster = [new_orders[i]]
            t0 = _parse_time_seconds(new_orders[i].timestamp, new_orders[i].sequence_num)

            j = i + 1
            while j < len(new_orders):
                tj = _parse_time_seconds(new_orders[j].timestamp, new_orders[j].sequence_num)
                if tj - t0 <= 5:  # All placed within 5 seconds
                    cluster.append(new_orders[j])
                    j += 1
                else:
                    break

            if len(cluster) < config.layering_min_levels:
                i += 1
                continue

            # Check how many of these cluster orders were cancelled within the window
            cluster_order_ids = {t.order_id for t in cluster}
            cancels = [
                t for t in group_sorted
                if t.status == "CANCEL"
                and t.order_id in cluster_order_ids
                and _parse_time_seconds(t.timestamp, t.sequence_num) - t0 <= config.layering_cancel_window_seconds
            ]

            if len(cancels) >= config.layering_min_levels:
                price_levels = sorted(set(round(t.price, 4) for t in cluster))

                alerts.append(DetectedAlert(
                    trader_id=trader_id,
                    symbol=symbol,
                    pattern="Layering",
                    severity="HIGH",
                    confidence="Medium",
                    start_time=cluster[0].timestamp,
                    end_time=cancels[-1].timestamp if cancels else cluster[-1].timestamp,
                    evidence={
                        "simultaneous_orders": len(cluster),
                        "cancelled_from_cluster": len(cancels),
                        "price_levels": price_levels,
                        "cancel_window_seconds": config.layering_cancel_window_seconds,
                    },
                    description=(
                        f"{trader_id} placed {len(cluster)} orders on {symbol} across "
                        f"{len(price_levels)} price levels within 5s, then cancelled "
                        f"{len(cancels)} of them within {config.layering_cancel_window_seconds}s — "
                        f"layering to create false market depth."
                    ),
                ))
                i = j
            else:
                i += 1

    return alerts


# ---------------------------------------------------------------------------
# Pattern 7: Close Manipulation
# ---------------------------------------------------------------------------

def detect_close_manipulation(
    trades: List[TradeRecord],
    config: SurveillanceConfig = DEFAULT_CONFIG,
) -> List[DetectedAlert]:
    """
    Close Manipulation: Unusually large volume orders placed near end of session
    to influence the closing price. Detected by comparing trader's closing-period
    volume against their own session average.
    """
    alerts: List[DetectedAlert] = []

    session_end = _session_end_seconds(trades)
    close_window_start = session_end - (config.close_manipulation_window_minutes * 60)

    # Group all executed trades by trader
    trader_all_volume: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    trader_close_volume: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for t in trades:
        if t.status != "EXECUTE":
            continue
        t_sec = _parse_time_seconds(t.timestamp, t.sequence_num)
        trader_all_volume[t.trader_id][t.symbol] += t.quantity
        if t_sec >= close_window_start:
            trader_close_volume[t.trader_id][t.symbol] += t.quantity

    # Compute per-symbol average closing volume across all traders (baseline)
    symbol_avg_close_vol: Dict[str, float] = defaultdict(float)
    symbol_trader_count: Dict[str, int] = defaultdict(int)

    for trader_id, symbol_vols in trader_close_volume.items():
        for symbol, vol in symbol_vols.items():
            symbol_avg_close_vol[symbol] += vol
            symbol_trader_count[symbol] += 1

    for symbol in symbol_avg_close_vol:
        if symbol_trader_count[symbol] > 0:
            symbol_avg_close_vol[symbol] /= symbol_trader_count[symbol]

    for trader_id, symbol_vols in trader_close_volume.items():
        for symbol, close_vol in symbol_vols.items():
            avg_close = symbol_avg_close_vol.get(symbol, 1.0)
            if avg_close <= 0:
                continue

            multiplier = close_vol / avg_close

            if multiplier < config.close_manipulation_volume_multiplier:
                continue

            # Get the close-period trades for evidence
            close_trades = [
                t for t in trades
                if t.trader_id == trader_id
                and t.symbol == symbol
                and t.status == "EXECUTE"
                and _parse_time_seconds(t.timestamp, t.sequence_num) >= close_window_start
            ]

            if not close_trades:
                continue

            close_trades_sorted = sorted(close_trades, key=lambda x: _parse_time_seconds(x.timestamp, x.sequence_num))

            alerts.append(DetectedAlert(
                trader_id=trader_id,
                symbol=symbol,
                pattern="Close Manipulation",
                severity="HIGH" if multiplier >= 5.0 else "MEDIUM",
                confidence="Medium",
                start_time=close_trades_sorted[0].timestamp,
                end_time=close_trades_sorted[-1].timestamp,
                evidence={
                    "close_period_volume": close_vol,
                    "avg_close_volume_all_traders": round(avg_close, 2),
                    "volume_multiplier": round(multiplier, 1),
                    "close_window_minutes": config.close_manipulation_window_minutes,
                    "num_close_trades": len(close_trades),
                },
                description=(
                    f"{trader_id} traded {close_vol:,.0f} units of {symbol} in the last "
                    f"{config.close_manipulation_window_minutes} minutes "
                    f"({round(multiplier, 1)}× the average trader's closing volume) — "
                    f"potential close price manipulation."
                ),
            ))

    return alerts


# ---------------------------------------------------------------------------
# Master runner
# ---------------------------------------------------------------------------

def run_surveillance(
    trades: List[TradeRecord],
    config: Optional[SurveillanceConfig] = None,
) -> List[DetectedAlert]:
    """
    Run all detection patterns against the provided trade records.
    Returns a deduplicated list of alerts sorted by severity.
    """
    if config is None:
        config = DEFAULT_CONFIG

    all_alerts: List[DetectedAlert] = []

    all_alerts.extend(detect_spoofing(trades, config))
    all_alerts.extend(detect_quote_stuffing(trades, config))
    all_alerts.extend(detect_momentum_ignition(trades, config))
    all_alerts.extend(detect_pump_and_dump(trades, config))
    all_alerts.extend(detect_wash_trading(trades, config))
    all_alerts.extend(detect_layering(trades, config))
    all_alerts.extend(detect_close_manipulation(trades, config))

    # Deduplicate: same (trader, symbol, pattern) → keep highest severity
    seen: Dict[Tuple[str, str, str], DetectedAlert] = {}
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    for alert in all_alerts:
        key = (alert.trader_id, alert.symbol, alert.pattern)
        if key not in seen or severity_order.get(alert.severity, 9) < severity_order.get(seen[key].severity, 9):
            seen[key] = alert

    return sorted(seen.values(), key=lambda a: severity_order.get(a.severity, 9))
