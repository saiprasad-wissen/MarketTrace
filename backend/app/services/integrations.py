import logging
import httpx
import smtplib
from email.message import EmailMessage
from app.services.groq_service import ask_groq
from app.database import AsyncSessionLocal
from app.models.audit import AppSettings
from sqlalchemy import select

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("integrations")

async def get_db_setting(key: str) -> str | None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AppSettings).where(AppSettings.key == key))
        row = result.scalar_one_or_none()
        return row.value if row else None

async def dispatch_escalation(
    case_ref: str, 
    trader_id: str, 
    patterns: str, 
    risk_score: float, 
    evidence: dict
):
    logger.info(f"Starting integration dispatch for escalated case: {case_ref}")
    
    # Fetch settings from Database Config
    atlassian_secret = await get_db_setting("atlassian_secret")
    atlassian_endpoint = await get_db_setting("atlassian_endpoint")
    jira_project_id = await get_db_setting("jira_project_id") or "KAN"
    slack_bot_key = await get_db_setting("slack_bot_key")
    slack_channel = await get_db_setting("slack_channel") or "#compliance-alerts"
    smtp_host = await get_db_setting("smtp_host") or "smtp.gmail.com"
    smtp_port_str = await get_db_setting("smtp_port")
    smtp_port = int(smtp_port_str) if smtp_port_str else 587
    smtp_user = await get_db_setting("smtp_user")
    smtp_pass = await get_db_setting("smtp_pass")
    smtp_recipient = await get_db_setting("smtp_recipient")
    groq_api_key = await get_db_setting("groq_api_key")
    
    # 1. Use Groq to generate a description
    prompt = f"Write a professional, concise executive summary for an escalated trade surveillance case.\nCase Ref: {case_ref}\nTrader: {trader_id}\nRisk Score: {risk_score}\nPatterns: {patterns}\nEvidence: {evidence}\nKeep it under 3 paragraphs, boardroom-ready. Do not use markdown."
    
    try:
        description = await ask_groq(prompt, [], {"groq_api_key": groq_api_key})
        logger.info("Successfully generated Groq description for escalation.")
    except Exception as e:
        logger.error(f"Failed to generate Groq description: {e}")
        description = f"Automated summary unavailable. Review the case details in MarketTrace."

    # 2. Jira
    if atlassian_secret and atlassian_endpoint:
        try:
            import base64
            auth_str = f"{smtp_user}:{atlassian_secret}"
            auth_b64 = base64.b64encode(auth_str.encode()).decode()
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{atlassian_endpoint.rstrip('/')}/rest/api/3/issue",
                    headers={
                        "Authorization": f"Basic {auth_b64}",
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    json={
                        "fields": {
                            "project": {"key": jira_project_id},
                            "summary": f"🚨 Escalated Investigation: {trader_id} - {patterns}",
                            "description": {
                                "type": "doc",
                                "version": 1,
                                "content": [
                                    {
                                        "type": "panel",
                                        "attrs": {"panelType": "error"},
                                        "content": [
                                            {
                                                "type": "paragraph",
                                                "content": [{"type": "text", "text": f"Case Ref: {case_ref} | Risk Score: {risk_score}"}]
                                            }
                                        ]
                                    },
                                    {
                                        "type": "paragraph",
                                        "content": [{"type": "text", "text": description}]
                                    }
                                ]
                            },
                            "issuetype": {"name": "Task"}
                        }
                    }
                )
                if resp.status_code >= 400:
                    logger.error(f"Jira API Error {resp.status_code}: {resp.text}")
                else:
                    jira_key = resp.json().get("key")
                    logger.info(f"Successfully created Jira ticket {jira_key} for {case_ref}")
                    if jira_key:
                        from app.models.case import Case
                        async with AsyncSessionLocal() as session:
                            case_result = await session.execute(select(Case).where(Case.case_ref == case_ref))
                            case_obj = case_result.scalar_one_or_none()
                            if case_obj:
                                case_obj.assigned_to = jira_key
                                await session.commit()
        except Exception as e:
            logger.error(f"Jira integration failed: {e}")
    else:
        # Mock Fallback for Demonstration / Hackathon if Jira is not configured
        import random
        mock_jira_key = f"{jira_project_id}-{random.randint(1000, 9999)}"
        logger.info(f"Jira not configured. Generated mock Jira ticket {mock_jira_key} for {case_ref}")
        from app.models.case import Case
        async with AsyncSessionLocal() as session:
            case_result = await session.execute(select(Case).where(Case.case_ref == case_ref))
            case_obj = case_result.scalar_one_or_none()
            if case_obj:
                case_obj.assigned_to = mock_jira_key
                await session.commit()
            
    # 3. Slack
    if slack_bot_key:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://slack.com/api/chat.postMessage",
                    headers={"Authorization": f"Bearer {slack_bot_key}"},
                    json={
                        "channel": slack_channel,
                        "text": f"🚨 *Escalated Case: {case_ref}*\n*Trader:* `{trader_id}`\n*Patterns:* {patterns}\n*Risk Score:* `{risk_score}`\n\n*AI Executive Summary:*\n> {description.replace(chr(10), chr(10) + '> ')}"
                    }
                )
                if resp.status_code >= 400 or not resp.json().get("ok"):
                    logger.error(f"Slack API Error: {resp.text}")
                else:
                    logger.info(f"Successfully sent Slack message for {case_ref}")
        except Exception as e:
            logger.error(f"Slack integration failed: {e}")

    # 4. Email
    if smtp_host and smtp_user and smtp_pass and smtp_recipient:
        try:
            msg = EmailMessage()
            
            body = f"""URGENT: Escalated Surveillance Case

CASE REF: {case_ref}
TRADER ID: {trader_id}
RISK SCORE: {risk_score}
PATTERNS DETECTED: {patterns}

--------------------------------------------------
EXECUTIVE SUMMARY
--------------------------------------------------
{description}

--------------------------------------------------
Please review this case immediately in the MarketTrace portal.
"""
            msg.set_content(body)
            msg["Subject"] = f"🚨 Escalated Case: {trader_id} - {patterns}"
            msg["From"] = smtp_user
            msg["To"] = smtp_recipient
            
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
                logger.info(f"Successfully sent email for {case_ref}")
        except Exception as e:
            logger.error(f"SMTP Email failed: {e}")
