"""
CSV Parser for MarketTrace
===========================
Validates and normalizes CSV uploads.
The parser is fully schema-driven — it expects specific column names but
makes NO assumptions about the values within those columns.

Required CSV schemas:
  trades.csv:   timestamp, trader_id, symbol, side, quantity, price, order_id, status
  stocks.csv:   symbol, company[opt], sector[opt], exchange[opt]
  traders.csv:  trader_id, trader_name[opt], desk[opt], region[opt]
  context.csv:  timestamp, symbol, type, severity, title, summary[opt]
"""

from __future__ import annotations
import io
import csv
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass


@dataclass
class ParseResult:
    success: bool
    rows: List[Dict[str, Any]]
    errors: List[str]
    warnings: List[str]
    row_count: int


# ---------------------------------------------------------------------------
# Required columns per file type
# ---------------------------------------------------------------------------

TRADES_REQUIRED = {"timestamp", "trader_id", "symbol", "side", "quantity", "price", "order_id", "status"}
STOCKS_REQUIRED = {"symbol"}
TRADERS_REQUIRED = {"trader_id"}
CONTEXT_REQUIRED = {"timestamp", "symbol", "type", "severity", "title"}

VALID_SIDES = {"BUY", "SELL"}
VALID_STATUSES = {"NEW", "EXECUTE", "CANCEL", "EXECUTED", "FILLED", "CANCELLED", "REJECTED", "PARTIAL"}

# Normalize status aliases to canonical values
STATUS_ALIASES = {
    "EXECUTED": "EXECUTE",
    "FILLED": "EXECUTE",
    "CANCELLED": "CANCEL",
    "CANCELED": "CANCEL",
    "REJECTED": "CANCEL",
}


def _normalize_header(headers: List[str]) -> List[str]:
    """Strip whitespace and lowercase column headers for matching."""
    return [h.strip().lower() for h in headers]


def _check_required_cols(headers: List[str], required: set, file_type: str) -> List[str]:
    missing = required - set(headers)
    if missing:
        return [f"Missing required columns in {file_type}: {', '.join(sorted(missing))}"]
    return []


def parse_trades_csv(content: bytes) -> ParseResult:
    """
    Parse trades CSV. Validates structure and normalizes values.
    Does NOT enforce specific trader IDs, symbols, or prices.
    """
    errors: List[str] = []
    warnings: List[str] = []
    rows: List[Dict[str, Any]] = []

    try:
        text = content.decode("utf-8-sig").strip()
        reader = csv.DictReader(io.StringIO(text))

        # Normalize headers
        if reader.fieldnames is None:
            return ParseResult(False, [], ["Empty file or no headers found"], [], 0)

        norm_headers = _normalize_header(list(reader.fieldnames))
        col_errors = _check_required_cols(norm_headers, TRADES_REQUIRED, "trades.csv")
        if col_errors:
            return ParseResult(False, [], col_errors, [], 0)

        for line_num, raw_row in enumerate(reader, start=2):
            # Normalize keys
            row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}

            # Skip blank lines
            if not any(row.values()):
                continue

            row_errors = []

            # Validate and parse quantity
            try:
                qty = float(row.get("quantity", "0").replace(",", ""))
                if qty <= 0:
                    row_errors.append(f"Row {line_num}: quantity must be > 0, got {qty}")
            except ValueError:
                row_errors.append(f"Row {line_num}: invalid quantity '{row.get('quantity')}'")
                qty = 0.0

            # Validate and parse price
            try:
                price = float(row.get("price", "0").replace(",", ""))
                if price < 0:
                    row_errors.append(f"Row {line_num}: price must be ≥ 0, got {price}")
            except ValueError:
                row_errors.append(f"Row {line_num}: invalid price '{row.get('price')}'")
                price = 0.0

            # Normalize side
            side = row.get("side", "").upper()
            if side not in VALID_SIDES:
                row_errors.append(f"Row {line_num}: invalid side '{side}', expected BUY or SELL")

            # Normalize status
            status = row.get("status", "").upper()
            status = STATUS_ALIASES.get(status, status)
            if status not in {"NEW", "EXECUTE", "CANCEL"}:
                row_errors.append(f"Row {line_num}: invalid status '{status}'")

            if row_errors:
                errors.extend(row_errors)
                continue

            rows.append({
                "timestamp": row.get("timestamp", ""),
                "trader_id": row.get("trader_id", ""),
                "symbol": row.get("symbol", "").upper(),
                "side": side,
                "quantity": qty,
                "price": price,
                "order_id": row.get("order_id", ""),
                "status": status,
            })

    except UnicodeDecodeError:
        errors.append("File encoding error — please save the CSV as UTF-8")
    except Exception as e:
        errors.append(f"Unexpected parse error: {str(e)}")

    if not rows and not errors:
        errors.append("No valid data rows found in trades.csv")

    success = len(errors) == 0 or (len(rows) > 0 and len(errors) < len(rows) * 0.1)
    return ParseResult(success, rows, errors, warnings, len(rows))


def parse_stocks_csv(content: bytes) -> ParseResult:
    errors: List[str] = []
    warnings: List[str] = []
    rows: List[Dict[str, Any]] = []

    try:
        text = content.decode("utf-8-sig").strip()
        reader = csv.DictReader(io.StringIO(text))

        if reader.fieldnames is None:
            return ParseResult(False, [], ["Empty file or no headers found"], [], 0)

        norm_headers = _normalize_header(list(reader.fieldnames))
        col_errors = _check_required_cols(norm_headers, STOCKS_REQUIRED, "stocks.csv")
        if col_errors:
            return ParseResult(False, [], col_errors, [], 0)

        for line_num, raw_row in enumerate(reader, start=2):
            row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
            if not any(row.values()):
                continue

            symbol = row.get("symbol", "").strip().upper()
            if not symbol:
                errors.append(f"Row {line_num}: symbol cannot be empty")
                continue

            rows.append({
                "symbol": symbol,
                "company": row.get("company", row.get("company_name", symbol)),
                "sector": row.get("sector", ""),
                "exchange": row.get("exchange", ""),
            })

    except Exception as e:
        errors.append(f"Parse error: {str(e)}")

    success = len(rows) > 0
    return ParseResult(success, rows, errors, warnings, len(rows))


def parse_traders_csv(content: bytes) -> ParseResult:
    errors: List[str] = []
    warnings: List[str] = []
    rows: List[Dict[str, Any]] = []

    try:
        text = content.decode("utf-8-sig").strip()
        reader = csv.DictReader(io.StringIO(text))

        if reader.fieldnames is None:
            return ParseResult(False, [], ["Empty file or no headers found"], [], 0)

        norm_headers = _normalize_header(list(reader.fieldnames))
        col_errors = _check_required_cols(norm_headers, TRADERS_REQUIRED, "traders.csv")
        if col_errors:
            return ParseResult(False, [], col_errors, [], 0)

        for line_num, raw_row in enumerate(reader, start=2):
            row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
            if not any(row.values()):
                continue

            trader_id = row.get("trader_id", "").strip()
            if not trader_id:
                errors.append(f"Row {line_num}: trader_id cannot be empty")
                continue

            rows.append({
                "trader_id": trader_id,
                "trader_name": row.get("trader_name", row.get("name", trader_id)),
                "desk": row.get("desk", row.get("desk_name", "")),
                "region": row.get("region", row.get("office", "")),
            })

    except Exception as e:
        errors.append(f"Parse error: {str(e)}")

    success = len(rows) > 0
    return ParseResult(success, rows, errors, warnings, len(rows))


def parse_context_csv(content: bytes) -> ParseResult:
    errors: List[str] = []
    warnings: List[str] = []
    rows: List[Dict[str, Any]] = []

    try:
        text = content.decode("utf-8-sig").strip()
        reader = csv.DictReader(io.StringIO(text))

        if reader.fieldnames is None:
            return ParseResult(False, [], ["Empty file or no headers found"], [], 0)

        norm_headers = _normalize_header(list(reader.fieldnames))
        col_errors = _check_required_cols(norm_headers, CONTEXT_REQUIRED, "context.csv")
        if col_errors:
            return ParseResult(False, [], col_errors, [], 0)

        valid_severities = {"HIGH", "MEDIUM", "LOW", "CRITICAL", "INFO"}

        for line_num, raw_row in enumerate(reader, start=2):
            row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}
            if not any(row.values()):
                continue

            severity = row.get("severity", "MEDIUM").upper()
            if severity not in valid_severities:
                warnings.append(f"Row {line_num}: unknown severity '{severity}', defaulting to MEDIUM")
                severity = "MEDIUM"

            rows.append({
                "timestamp": row.get("timestamp", ""),
                "symbol": row.get("symbol", "MARKET").upper(),
                "event_type": row.get("type", row.get("event_type", "NEWS")).upper(),
                "severity": severity,
                "title": row.get("title", ""),
                "summary": row.get("summary", row.get("description", "")),
            })

    except Exception as e:
        errors.append(f"Parse error: {str(e)}")

    success = len(rows) > 0
    return ParseResult(success, rows, errors, warnings, len(rows))
