"""All Pydantic schemas for MarketTrace API."""
import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Profile Schemas
# ---------------------------------------------------------------------------

class ProfileStockBase(BaseModel):
    symbol: str
    company: Optional[str] = None
    sector: Optional[str] = None
    exchange: Optional[str] = None


class ProfileTraderBase(BaseModel):
    trader_id: str
    trader_name: Optional[str] = None
    desk: Optional[str] = None
    region: Optional[str] = None


class ProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    stocks: List[ProfileStockBase] = []
    traders: List[ProfileTraderBase] = []
    investigation_count: int = 0

    class Config:
        from_attributes = True


class ProfileListResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    status: str
    created_at: datetime
    stock_count: int = 0
    trader_count: int = 0

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Investigation Schemas
# ---------------------------------------------------------------------------

class InvestigationCreate(BaseModel):
    name: str
    profile_id: uuid.UUID


class InvestigationUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class InvestigationResponse(BaseModel):
    id: uuid.UUID
    name: str
    profile_id: uuid.UUID
    status: str
    total_trades: int
    total_alerts: int
    total_cases: int
    escalated_cases: int
    suspicious_traders: int
    avg_risk_score: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Trade Schemas
# ---------------------------------------------------------------------------

class TradeResponse(BaseModel):
    id: uuid.UUID
    timestamp: str
    trader_id: str
    symbol: str
    side: str
    quantity: float
    price: float
    order_id: str
    status: str
    sequence_num: int

    class Config:
        from_attributes = True


class ContextEventResponse(BaseModel):
    id: uuid.UUID
    timestamp: str
    symbol: Optional[str]
    event_type: str
    severity: str
    title: str
    summary: Optional[str]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Alert Schemas
# ---------------------------------------------------------------------------

class AlertResponse(BaseModel):
    id: uuid.UUID
    trader_id: str
    symbol: str
    pattern: str
    severity: str
    confidence: str
    start_time: Optional[str]
    end_time: Optional[str]
    evidence: Optional[Dict[str, Any]]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Case Schemas
# ---------------------------------------------------------------------------

class CaseCommentCreate(BaseModel):
    content: str
    author: Optional[str] = "Analyst"


class CaseCommentResponse(BaseModel):
    id: uuid.UUID
    author: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class CaseUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    ai_analysis: Optional[str] = None
    priority: Optional[str] = None


class CaseResponse(BaseModel):
    id: uuid.UUID
    investigation_id: uuid.UUID
    case_ref: str
    trader_id: str
    symbol: str
    patterns: Optional[str]
    evidence: Optional[Dict[str, Any]]
    risk_score: float
    priority: str
    status: str
    assigned_to: Optional[str]
    ai_analysis: Optional[str]
    created_at: datetime
    updated_at: datetime
    comments: List[CaseCommentResponse] = []

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Report Schemas
# ---------------------------------------------------------------------------

class ReportCreate(BaseModel):
    report_type: str  # market | stock | trader | case
    subject_id: Optional[str] = None


class ReportResponse(BaseModel):
    id: uuid.UUID
    report_type: str
    title: str
    subject_id: Optional[str]
    content: Optional[str]
    report_data: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AI Schemas
# ---------------------------------------------------------------------------

class AIMessage(BaseModel):
    role: str  # user | assistant
    content: str


class AIAskRequest(BaseModel):
    question: str
    investigation_id: uuid.UUID
    context_type: str = "investigation"  # investigation | trader | stock | case
    context_id: Optional[str] = None
    conversation_history: List[AIMessage] = []


class AIAskResponse(BaseModel):
    answer: str
    conversation_id: Optional[uuid.UUID] = None


# ---------------------------------------------------------------------------
# Settings Schemas
# ---------------------------------------------------------------------------

class SettingsUpdate(BaseModel):
    groq_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    default_profile_id: Optional[str] = None
    replay_speed: Optional[int] = None
    theme: Optional[str] = None
    slack_bot_key: Optional[str] = None
    slack_channel: Optional[str] = None
    atlassian_endpoint: Optional[str] = None
    atlassian_secret: Optional[str] = None
    jira_project_id: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[str] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    smtp_recipient: Optional[str] = None


class SettingsResponse(BaseModel):
    groq_api_key_set: bool
    anthropic_api_key_set: bool
    default_profile_id: Optional[str]
    replay_speed: int
    theme: str
    slack_bot_key_set: bool
    slack_channel: Optional[str]
    atlassian_endpoint: Optional[str]
    atlassian_secret_set: bool
    jira_project_id: Optional[str]
    smtp_host: Optional[str]
    smtp_port: Optional[str]
    smtp_user: Optional[str]
    smtp_pass_set: bool
    smtp_recipient: Optional[str]


# ---------------------------------------------------------------------------
# Generic Responses
# ---------------------------------------------------------------------------

class TokenMetricsResponse(BaseModel):
    total_cost: float
    total_input: int
    total_output: int
    by_model: Dict[str, float]

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class ProcessingStatus(BaseModel):
    stage: str
    progress: int  # 0-100
    details: Optional[str] = None
