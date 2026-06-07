import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

def send_otp_email(to_email: str, otp: str):
    """
    Sends an OTP email using standard SMTP.
    """
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Skipping email send.")
        return

    subject = "Your MarketTrace Password Reset Code"
    body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">MarketTrace Security</h2>
            <p>We received a request to reset your password. Use the secure code below to complete the process:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">{otp}</span>
            </div>
            <p style="font-size: 12px; color: #64748b;">This code will expire in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    try:
        # Connect to SMTP server
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        # Login
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        # Send
        server.send_message(msg)
        server.quit()
        logger.info(f"OTP email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise
