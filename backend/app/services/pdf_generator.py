import os
import uuid
import tempfile
import httpx
import logging
from typing import Dict, Any

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT

logger = logging.getLogger(__name__)

async def _generate_ai_summary(trader_id: str, data: Dict[str, Any], api_key: str) -> str:
    """Use Groq to generate a concise executive summary based on the exact alerts."""
    
    prompt = f"Generate a highly professional, 2-paragraph Executive Summary for Trader: {trader_id} based on the following surveillance data:\n"
    prompt += f"Risk Score: {data.get('risk_score', 0)}\n"
    for a in data.get('alerts', []):
        prompt += f"- Pattern: {a['pattern']}, Severity: {a['severity']}\n"
    
    prompt += "\nDo not include any greeting. Write in a neutral, authoritative, forensic accounting tone. Summarize the behavioral patterns and the potential market impact."
    
    messages = [
        {"role": "system", "content": "You are a senior compliance officer writing an executive summary for a PDF report. Output only the paragraphs of text, no markdown formatting at all."},
        {"role": "user", "content": prompt}
    ]

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
                    "temperature": 0.2,
                    "max_tokens": 500,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"Failed to generate AI summary: {e}")
        return "MarketTrace automated surveillance has flagged this trader for manipulative trading patterns. Please review the detailed metrics below."

async def generate_reportlab_pdf(trader_id: str, data: Dict[str, Any], api_key: str) -> str:
    """
    Generate a beautiful programmatic PDF using ReportLab.
    """
    ai_summary = await _generate_ai_summary(trader_id, data, api_key)
    
    tmp_dir = tempfile.gettempdir()
    pdf_path = os.path.join(tmp_dir, f"dossier_{trader_id}_{uuid.uuid4().hex[:8]}.pdf")
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=50,
        bottomMargin=50
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER,
        spaceAfter=30
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=20,
        spaceAfter=15,
        borderPadding=(0, 0, 5, 0),
        borderColor=colors.HexColor('#e2e8f0'),
        borderWidth=1
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#334155'),
        alignment=TA_JUSTIFY,
        leading=14,
        spaceAfter=15
    )
    
    elements = []
    
    # Title Header
    elements.append(Paragraph("MarketTrace Investigation Dossier", title_style))
    elements.append(Paragraph(f"Forensic Report for Trader: <b>{trader_id}</b>", subtitle_style))
    
    # Executive Summary (AI Generated)
    elements.append(Paragraph("Executive Summary", section_title_style))
    for paragraph in ai_summary.split('\n\n'):
        if paragraph.strip():
            elements.append(Paragraph(paragraph.strip(), body_style))
    
    # Metrics Overview Table
    elements.append(Paragraph("Metrics Overview", section_title_style))
    
    metrics_data = [
        ["Risk Score", f"{data.get('risk_score', 0):.1f}"],
        ["Executed Volume", f"{data.get('executed_volume', 0):,}"],
        ["Cancel Ratio", f"{data.get('cancel_ratio', 0)}%"],
        ["Symbols Traded", ", ".join(data.get('symbols', []))]
    ]
    
    metrics_table = Table(metrics_data, colWidths=[150, 350])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#0f172a')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#f1f5f9')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
    ]))
    
    elements.append(metrics_table)
    elements.append(Spacer(1, 20))
    
    # Triggered Patterns
    elements.append(Paragraph("Triggered Surveillance Patterns", section_title_style))
    
    alerts = data.get('alerts', [])
    if not alerts:
        elements.append(Paragraph("No direct alerts linked in primary investigation.", body_style))
    else:
        for idx, alert in enumerate(alerts):
            # Card Header Table
            severity_color = '#dc2626' if alert['severity'] == 'CRITICAL' else '#ea580c'
            
            header_data = [
                [
                    Paragraph(f"<b>{alert['pattern']}</b>", ParagraphStyle('P_Title', fontName='Helvetica-Bold', fontSize=12, textColor=colors.HexColor('#0f172a'))),
                    Paragraph(f"<font color='{severity_color}'><b>{alert['severity']} Severity</b></font> • {alert['confidence']} Confidence", ParagraphStyle('P_Tag', fontName='Helvetica-Bold', fontSize=9, alignment=TA_RIGHT))
                ]
            ]
            
            header_table = Table(header_data, colWidths=[250, 250])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            
            elements.append(header_table)
            
            # Description
            desc_style = ParagraphStyle(
                'AlertDesc',
                parent=body_style,
                fontSize=9,
                textColor=colors.HexColor('#475569')
            )
            elements.append(Paragraph(alert['description'], desc_style))
            elements.append(Spacer(1, 10))
            
            # Line separator if not the last alert
            if idx < len(alerts) - 1:
                elements.append(Spacer(1, 10))
                # Just an empty table acting as a line
                line = Table([[""]], colWidths=[500])
                line.setStyle(TableStyle([('LINEABOVE', (0, 0), (-1, -1), 1, colors.HexColor('#f1f5f9'))]))
                elements.append(line)
                elements.append(Spacer(1, 10))

    # Build the PDF
    doc.build(elements)
    
    return pdf_path
