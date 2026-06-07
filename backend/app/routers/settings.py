from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.audit import AppSettings, TokenUsage
from app.models.user import User
from app.services.auth_service import get_current_user
from app.schemas import SettingsUpdate, SettingsResponse, MessageResponse, TokenMetricsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTING_KEYS = [
    "groq_api_key", "anthropic_api_key", "default_profile_id", "replay_speed",
    "theme", "slack_bot_key", "slack_channel", "atlassian_endpoint", "atlassian_secret",
    "jira_project_id", "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_recipient"
]


async def _get_setting(db: AsyncSession, key: str, user_id: str) -> str | None:
    result = await db.execute(select(AppSettings).where(AppSettings.key == key, AppSettings.user_id == user_id))
    row = result.scalar_one_or_none()
    return row.value if row else None


async def _set_setting(db: AsyncSession, key: str, value: str, user_id: str):
    result = await db.execute(select(AppSettings).where(AppSettings.key == key, AppSettings.user_id == user_id))
    row = result.scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(AppSettings(key=key, value=value, user_id=user_id))


@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    groq_key = await _get_setting(db, "groq_api_key", user_id)
    anthropic_key = await _get_setting(db, "anthropic_api_key", user_id)
    return SettingsResponse(
        groq_api_key_set=bool(groq_key),
        anthropic_api_key_set=bool(anthropic_key),
        default_profile_id=await _get_setting(db, "default_profile_id", user_id),
        replay_speed=int(await _get_setting(db, "replay_speed", user_id) or "1"),
        theme=await _get_setting(db, "theme", user_id) or "light",
        slack_bot_key_set=bool(await _get_setting(db, "slack_bot_key", user_id)),
        slack_channel=await _get_setting(db, "slack_channel", user_id),
        atlassian_endpoint=await _get_setting(db, "atlassian_endpoint", user_id),
        atlassian_secret_set=bool(await _get_setting(db, "atlassian_secret", user_id)),
        jira_project_id=await _get_setting(db, "jira_project_id", user_id),
        smtp_host=await _get_setting(db, "smtp_host", user_id),
        smtp_port=await _get_setting(db, "smtp_port", user_id),
        smtp_user=await _get_setting(db, "smtp_user", user_id),
        smtp_pass_set=bool(await _get_setting(db, "smtp_pass", user_id)),
        smtp_recipient=await _get_setting(db, "smtp_recipient", user_id),
    )


@router.put("", response_model=MessageResponse)
async def update_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        await _set_setting(db, key, str(value), user_id)
    return MessageResponse(message="Settings saved")


@router.get("/token-metrics", response_model=TokenMetricsResponse)
async def get_token_metrics(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = str(current_user.id)
    
    result = await db.execute(
        select(
            func.sum(TokenUsage.total_cost),
            func.sum(TokenUsage.input_tokens),
            func.sum(TokenUsage.output_tokens)
        ).where(TokenUsage.user_id == user_id)
    )
    total_cost, total_input, total_output = result.first()
    
    by_model_result = await db.execute(
        select(TokenUsage.model_name, func.sum(TokenUsage.total_cost))
        .group_by(TokenUsage.model_name)
    )
    by_model = {row[0]: float(row[1] or 0.0) for row in by_model_result.all()}
    
    return TokenMetricsResponse(
        total_cost=float(total_cost or 0.0),
        total_input=int(total_input or 0),
        total_output=int(total_output or 0),
        by_model=by_model
    )
