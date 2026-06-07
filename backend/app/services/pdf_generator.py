import os
import uuid
import tempfile
import httpx
import logging
from typing import Dict, Any, List

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

logger = logging.getLogger(__name__)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        # Only draw headers, footers, and page numbers on page 2 and later (keeps cover page clean)
        if self._pageNumber > 1:
            self.saveState()
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#475569"))
            
            # Header
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(40, 800, 555, 800)
            self.drawString(40, 806, "MarketTrace Surveillance & Investigation Report")
            
            # Footer
            self.line(40, 50, 555, 50)
            
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(555, 35, page_text)
            self.drawString(40, 35, "CONFIDENTIAL — FOR INTERNAL COMPLIANCE REVIEW ONLY")
            
            self.restoreState()


def _create_pie_chart(alert_patterns: Dict[str, int]) -> str:
    """Generates a beautifully styled pie chart for alert distribution and returns its temp path."""
    fig, ax = plt.subplots(figsize=(4.5, 3), dpi=300)
    
    # Sort and take data
    sorted_patterns = sorted(alert_patterns.items(), key=lambda x: x[1], reverse=True)
    labels = [x[0] for x in sorted_patterns]
    sizes = [x[1] for x in sorted_patterns]
    
    colors_list = ['#1a56db', '#7c3aed', '#ea580c', '#059669', '#db2777', '#f59e0b', '#06b6d4']
    
    # Check if there is data
    if not sizes:
        ax.text(0.5, 0.5, "No Alert Data", ha='center', va='center', color='#64748b')
        ax.axis('off')
    else:
        # Format labels with counts
        formatted_labels = [f"{lbl}\n({sz})" for lbl, sz in zip(labels, sizes)]
        wedges, texts, autotexts = ax.pie(
            sizes, 
            labels=formatted_labels, 
            autopct='%1.1f%%',
            startangle=140, 
            colors=colors_list[:len(sizes)],
            textprops=dict(color='#0f172a', fontsize=7),
            pctdistance=0.75
        )
        # Style percentage text inside wedges
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontsize(7)
            autotext.set_weight('bold')
            
    ax.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle.
    plt.tight_layout()
    
    # Save to a temporary file
    fd, path = tempfile.mkstemp(suffix='.png')
    os.close(fd)
    fig.savefig(path, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig)
    return path

def _create_bar_chart(top_symbols: Dict[str, int]) -> str:
    """Generates a styled vertical bar chart for top symbols by alerts and returns its temp path."""
    fig, ax = plt.subplots(figsize=(4.5, 3), dpi=300)
    
    # Take top 5
    top_5 = list(top_symbols.items())[:5]
    if not top_5:
        ax.text(0.5, 0.5, "No Stock Data", ha='center', va='center', color='#64748b')
        ax.axis('off')
    else:
        symbols = [x[0] for x in top_5]
        counts = [x[1] for x in top_5]
        
        bars = ax.bar(symbols, counts, color='#3b82f6', width=0.5, edgecolor=None, zorder=3)
        
        # Style chart
        ax.set_ylabel("Alert Count", color='#475569', fontsize=8, weight='bold')
        ax.tick_params(colors='#475569', labelsize=8)
        ax.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)
        
        # Hide top & right spines
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#e2e8f0')
        ax.spines['bottom'].set_color('#e2e8f0')
        
        # Label bar values on top of each bar
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),  # 3 points vertical offset
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=7, color='#475569', weight='bold')
                        
    plt.tight_layout()
    
    # Save to a temporary file
    fd, path = tempfile.mkstemp(suffix='.png')
    os.close(fd)
    fig.savefig(path, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig)
    return path

def _create_trader_alert_chart(alerts: List[Dict[str, Any]]) -> str:
    """Generates a bar chart showing the frequency of alerts by pattern for a specific trader."""
    fig, ax = plt.subplots(figsize=(6, 2.5), dpi=300)
    
    # Count patterns
    pattern_counts = {}
    for a in alerts:
        pat = a.get('pattern', 'Other')
        pattern_counts[pat] = pattern_counts.get(pat, 0) + 1
        
    sorted_pats = sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True)
    
    if not sorted_pats:
        ax.text(0.5, 0.5, "No Alert Patterns", ha='center', va='center', color='#64748b')
        ax.axis('off')
    else:
        pats = [x[0] for x in sorted_pats]
        counts = [x[1] for x in sorted_pats]
        
        # Shorten very long names
        pats_display = [p[:15] + '..' if len(p) > 15 else p for p in pats]
        
        # Use alternating premium blue and purple colors
        bar_colors = ['#1a56db' if i % 2 == 0 else '#7c3aed' for i in range(len(pats))]
        bars = ax.barh(pats_display, counts, color=bar_colors, height=0.5, edgecolor=None, zorder=3)
        
        # Style chart
        ax.set_xlabel("Alert Count", color='#475569', fontsize=8, weight='bold')
        ax.tick_params(colors='#475569', labelsize=8)
        ax.grid(axis='x', linestyle='--', alpha=0.5, zorder=0)
        
        # Invert y-axis to show highest count at the top
        ax.invert_yaxis()
        
        # Hide top & right spines
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#e2e8f0')
        ax.spines['bottom'].set_color('#e2e8f0')
        
        # Label bar values next to each bar
        for bar in bars:
            width = bar.get_width()
            ax.annotate(f' {width}',
                        xy=(width, bar.get_y() + bar.get_height() / 2),
                        xytext=(3, 0),  # 3 points horizontal offset
                        textcoords="offset points",
                        ha='left', va='center', fontsize=7, color='#475569', weight='bold')
                        
    plt.tight_layout()
    
    # Save to a temporary file
    fd, path = tempfile.mkstemp(suffix='.png')
    os.close(fd)
    fig.savefig(path, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig)
    return path


def _create_trader_bar_chart(top_traders: Dict[str, int]) -> str:
    """Generates a styled horizontal bar chart for top traders by alerts and returns its temp path."""
    fig, ax = plt.subplots(figsize=(4.5, 3), dpi=300)
    
    # Take top 5
    top_5 = list(top_traders.items())[:5]
    if not top_5:
        ax.text(0.5, 0.5, "No Trader Data", ha='center', va='center', color='#64748b')
        ax.axis('off')
    else:
        traders = [x[0] for x in top_5]
        counts = [x[1] for x in top_5]
        
        # Reverse to show highest count at the top in horizontal chart
        traders.reverse()
        counts.reverse()
        
        bars = ax.barh(traders, counts, color='#7c3aed', height=0.5, edgecolor=None, zorder=3)
        
        # Style chart
        ax.set_xlabel("Alert Count", color='#475569', fontsize=8, weight='bold')
        ax.tick_params(colors='#475569', labelsize=8)
        ax.grid(axis='x', linestyle='--', alpha=0.5, zorder=0)
        
        # Hide top & right spines
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#e2e8f0')
        ax.spines['bottom'].set_color('#e2e8f0')
        
        # Label values
        for bar in bars:
            width = bar.get_width()
            ax.annotate(f' {width}',
                        xy=(width, bar.get_y() + bar.get_height() / 2),
                        xytext=(3, 0),
                        textcoords="offset points",
                        ha='left', va='center', fontsize=7, color='#475569', weight='bold')
                        
    plt.tight_layout()
    
    # Save to a temporary file
    fd, path = tempfile.mkstemp(suffix='.png')
    os.close(fd)
    fig.savefig(path, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig)
    return path


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
    Generate a beautiful programmatic PDF using ReportLab with Matplotlib charts and custom templates.
    """
    ai_summary = await _generate_ai_summary(trader_id, data, api_key)
    
    tmp_dir = tempfile.gettempdir()
    pdf_path = os.path.join(tmp_dir, f"dossier_{trader_id}_{uuid.uuid4().hex[:8]}.pdf")
    
    # Use 65pt top and bottom margins to prevent overlap with dynamic header/footer
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=65,
        bottomMargin=65
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=TA_LEFT,
        spaceAfter=5
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        textColor=colors.HexColor('#4f46e5'), # Indigo Accent
        alignment=TA_LEFT,
        spaceAfter=20
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=15,
        spaceAfter=10,
        borderPadding=(0, 0, 4, 0),
        borderColor=colors.HexColor('#3b82f6'), # Blue Accent line
        borderWidth=1.5
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        textColor=colors.HexColor('#334155'),
        alignment=TA_JUSTIFY,
        leading=14,
        spaceAfter=12
    )
    
    elements = []
    
    # Title Header (Modern left-aligned branding)
    elements.append(Paragraph("MarketTrace Investigation Dossier", title_style))
    elements.append(Paragraph(f"FORENSIC REPORT FOR TRADER: <b>{trader_id}</b>", subtitle_style))
    
    # Executive Summary (AI Generated)
    elements.append(Paragraph("Executive Summary", section_title_style))
    for paragraph in ai_summary.split('\n\n'):
        if paragraph.strip():
            elements.append(Paragraph(paragraph.strip(), body_style))
    
    # Metrics Overview Table
    elements.append(Paragraph("Trader Metrics Overview", section_title_style))
    
    metrics_data = [
        ["Surveillance Risk Score", f"{data.get('risk_score', 0):.1f}"],
        ["Total Executed Volume", f"{data.get('executed_volume', 0):,}"],
        ["Order Cancellation Ratio", f"{data.get('cancel_ratio', 0)}%"],
        ["Stocks Traded", ", ".join(data.get('symbols', []))]
    ]
    
    # Premium styled table
    metrics_table = Table(metrics_data, colWidths=[180, 320])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#0f172a')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
    ]))
    
    elements.append(metrics_table)
    elements.append(Spacer(1, 15))
    
    # Generate and Add Matplotlib Chart
    alerts = data.get('alerts', [])
    temp_files = []
    
    if alerts:
        chart_path = _create_trader_alert_chart(alerts)
        temp_files.append(chart_path)
        elements.append(Paragraph("Alert Frequency by Pattern", section_title_style))
        elements.append(Spacer(1, 5))
        elements.append(KeepTogether([
            Image(chart_path, width=450, height=187.5),
            Spacer(1, 15)
        ]))

    # Triggered Patterns
    elements.append(Paragraph("Triggered Surveillance Patterns", section_title_style))
    
    if not alerts:
        elements.append(Paragraph("No direct alerts linked in primary investigation.", body_style))
    else:
        alert_elements = []
        for idx, alert in enumerate(alerts):
            severity_color = '#dc2626' if alert['severity'] == 'CRITICAL' else '#ea580c'
            
            header_data = [
                [
                    Paragraph(f"<b>{alert['pattern']}</b>", ParagraphStyle('P_Title', fontName='Helvetica-Bold', fontSize=11, textColor=colors.HexColor('#0f172a'))),
                    Paragraph(f"<font color='{severity_color}'><b>{alert['severity']} Severity</b></font>  •  Confidence: <b>{alert['confidence']}</b>", ParagraphStyle('P_Tag', fontName='Helvetica-Bold', fontSize=8.5, alignment=TA_RIGHT))
                ]
            ]
            
            header_table = Table(header_data, colWidths=[240, 240])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            desc_style = ParagraphStyle(
                'AlertDesc',
                parent=body_style,
                fontSize=9,
                textColor=colors.HexColor('#475569'),
                spaceAfter=5
            )
            
            alert_card = [
                header_table,
                Paragraph(alert['description'], desc_style),
                Spacer(1, 8)
            ]
            
            # Line separator between alerts
            if idx < len(alerts) - 1:
                line = Table([[""]], colWidths=[480])
                line.setStyle(TableStyle([
                    ('LINEABOVE', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ]))
                alert_card.append(line)
                
            alert_elements.append(KeepTogether(alert_card))
            
        elements.extend(alert_elements)

    # Build the PDF using NumberedCanvas
    try:
        doc.build(elements, canvasmaker=NumberedCanvas)
    finally:
        # Clean up temporary chart files
        for f in temp_files:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception as e:
                    logger.error(f"Failed to delete temp file {f}: {e}")
    
    return pdf_path

async def _generate_market_summary(inv_name: str, data: Dict[str, Any], api_key: str) -> str:
    prompt = f"Generate a highly professional, 2-paragraph Executive Summary for Market Surveillance Run: {inv_name}.\n"
    prompt += f"Total Trades: {data.get('total_trades', 0)}\n"
    prompt += f"Alerts: {data.get('total_alerts', 0)}\n"
    prompt += f"Cases Created: {data.get('total_cases', 0)}\n"
    prompt += f"Escalated Cases: {data.get('escalated_cases', 0)}\n"
    
    top_stocks = ", ".join([f"{k} ({v} alerts)" for k, v in data.get('top_symbols', {}).items()][:5])
    prompt += f"Top Suspicious Stocks: {top_stocks}\n"
    
    prompt += "\nWrite in a neutral, authoritative, forensic tone. Summarize the overall health of the market, the volume of manipulative patterns detected, and highlight the highest risk areas."
    
    messages = [
        {"role": "system", "content": "You are a Chief Compliance Officer writing an executive summary for a board report. Output only paragraphs of text, no markdown."},
        {"role": "user", "content": prompt}
    ]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": messages, "temperature": 0.2, "max_tokens": 500},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.error(f"Failed to generate market summary: {e}")
        return "The Market Surveillance Engine completed its analysis. Several suspicious patterns were detected across multiple symbols, resulting in the creation of investigatory cases. Please review the breakdown below."

async def generate_investigation_pdf(inv_name: str, data: Dict[str, Any], api_key: str) -> str:
    ai_summary = await _generate_market_summary(inv_name, data, api_key)
    
    tmp_dir = tempfile.gettempdir()
    pdf_path = os.path.join(tmp_dir, f"market_report_{uuid.uuid4().hex[:8]}.pdf")
    
    # 65pt margins to prevent dynamic header/footer overlapping with elements
    doc = SimpleDocTemplate(
        pdf_path, 
        pagesize=A4, 
        rightMargin=40, 
        leftMargin=40, 
        topMargin=65, 
        bottomMargin=65
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    cover_title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=32,
        leading=38,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=10
    )
    
    cover_subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=30
    )
    
    cover_meta_label_style = ParagraphStyle(
        'CoverMetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=3
    )
    
    cover_meta_value_style = ParagraphStyle(
        'CoverMetaValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=15
    )
    
    title_style = ParagraphStyle(
        'MainTitle', 
        parent=styles['Heading1'], 
        fontName='Helvetica-Bold', 
        fontSize=24, 
        textColor=colors.HexColor('#0f172a'), 
        alignment=TA_LEFT, 
        spaceAfter=5
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle', 
        parent=styles['Normal'], 
        fontName='Helvetica', 
        fontSize=11, 
        textColor=colors.HexColor('#4f46e5'), 
        alignment=TA_LEFT, 
        spaceAfter=20
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle', 
        parent=styles['Heading2'], 
        fontName='Helvetica-Bold', 
        fontSize=14, 
        textColor=colors.HexColor('#0f172a'), 
        spaceBefore=15, 
        spaceAfter=10, 
        borderPadding=(0, 0, 4, 0), 
        borderColor=colors.HexColor('#3b82f6'), 
        borderWidth=1.5
    )
    
    body_style = ParagraphStyle(
        'BodyText', 
        parent=styles['Normal'], 
        fontName='Helvetica', 
        fontSize=9.5, 
        textColor=colors.HexColor('#334155'), 
        alignment=TA_JUSTIFY, 
        leading=14, 
        spaceAfter=12
    )
    
    elements = []
    
    # ─── Page 1: Cover Page ───
    elements.append(Spacer(1, 100))
    
    decor_bar = Table([[""]], colWidths=[80], rowHeights=[4])
    decor_bar.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1a56db')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]))
    elements.append(decor_bar)
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("Market Surveillance Report", cover_title_style))
    elements.append(Paragraph(f"Surveillance Audit Run: {inv_name}", cover_subtitle_style))
    
    sep_line = Table([[""]], colWidths=[515], rowHeights=[1])
    sep_line.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e2e8f0')),
    ]))
    elements.append(sep_line)
    elements.append(Spacer(1, 100))
    
    import datetime
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    elements.append(Paragraph("PREPARED FOR", cover_meta_label_style))
    elements.append(Paragraph("Compliance Review Board & Audit Committee", cover_meta_value_style))
    
    elements.append(Paragraph("GENERATED DATE", cover_meta_label_style))
    elements.append(Paragraph(current_time, cover_meta_value_style))
    
    elements.append(Paragraph("SYSTEM REPORT ID", cover_meta_label_style))
    elements.append(Paragraph(f"MT-SRV-{uuid.uuid4().hex[:8].upper()}", cover_meta_value_style))
    
    elements.append(Spacer(1, 40))
    
    warning_box_data = [[
        Paragraph("<b>CLASSIFICATION: STRICTLY CONFIDENTIAL</b><br/>"
                  "This document contains proprietary trade data and analysis generated by MarketTrace automated surveillance. "
                  "Unauthorized distribution, copying, or disclosure is strictly prohibited under federal regulations.", 
                  ParagraphStyle('WarningBoxText', fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#7f1d1d')))
    ]]
    warning_box = Table(warning_box_data, colWidths=[515])
    warning_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef2f2')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#fca5a5')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(warning_box)
    elements.append(PageBreak())
    
    # ─── Page 2: Report Content ───
    elements.append(Paragraph("Market Surveillance Report", title_style))
    elements.append(Paragraph(f"INVESTIGATION RUN: <b>{inv_name}</b>", subtitle_style))
    
    elements.append(Paragraph("Executive Summary", section_title_style))
    for paragraph in ai_summary.split('\n\n'):
        if paragraph.strip():
            elements.append(Paragraph(paragraph.strip(), body_style))
            
    elements.append(Paragraph("Surveillance Metrics", section_title_style))
    metrics_data = [
        ["Total Trades Analyzed", f"{data.get('total_trades', 0):,}"],
        ["Alerts Detected", f"{data.get('total_alerts', 0):,}"],
        ["Cases Created", f"{data.get('total_cases', 0):,}"],
        ["Escalated for Enforcement", f"{data.get('escalated_cases', 0):,}"]
    ]
    
    metrics_table = Table(metrics_data, colWidths=[250, 250])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#0f172a')),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
    ]))
    elements.append(metrics_table)
    elements.append(Spacer(1, 15))
    
    # CHARTS SECTION
    alert_patterns = data.get('alert_patterns', {})
    top_symbols = data.get('top_symbols', {})
    top_traders = data.get('top_traders', {})
    temp_files = []
    
    if alert_patterns or top_symbols or top_traders:
        elements.append(Paragraph("Visual Analysis", section_title_style))
        
        pie_img = None
        bar_img = None
        trader_img = None
        
        if alert_patterns:
            pie_path = _create_pie_chart(alert_patterns)
            temp_files.append(pie_path)
            pie_img = Image(pie_path, width=225, height=150)
            
        if top_symbols:
            bar_path = _create_bar_chart(top_symbols)
            temp_files.append(bar_path)
            bar_img = Image(bar_path, width=225, height=150)
            
        if top_traders:
            trader_path = _create_trader_bar_chart(top_traders)
            temp_files.append(trader_path)
            trader_img = Image(trader_path, width=330, height=220)
            
        row1_flowables = []
        if pie_img and bar_img:
            row1_table = Table([[pie_img, bar_img]], colWidths=[250, 250])
            row1_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
            ]))
            row1_flowables.append(row1_table)
        elif pie_img:
            row1_flowables.append(pie_img)
        elif bar_img:
            row1_flowables.append(bar_img)
            
        chart_flowables = []
        if row1_flowables:
            chart_flowables.extend(row1_flowables)
            chart_flowables.append(Spacer(1, 10))
            
        if trader_img:
            chart_flowables.append(Paragraph("<b>Top Suspicious Traders by Alert Frequency</b>", ParagraphStyle('ChartLabel', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#475569'), alignment=TA_CENTER, spaceAfter=5)))
            
            trader_table = Table([[trader_img]], colWidths=[500])
            trader_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            chart_flowables.append(trader_table)
            
        elements.append(KeepTogether(chart_flowables))
        elements.append(Spacer(1, 15))

    if top_symbols:
        elements.append(Paragraph("Top Suspicious Stocks", section_title_style))
        sym_data = [["Stock", "Alert Count"]]
        for sym, count in list(top_symbols.items())[:10]:
            sym_data.append([sym, str(count)])
        
        sym_table = Table(sym_data, colWidths=[250, 250])
        sym_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#ffffff')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9.5),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(KeepTogether([sym_table, Spacer(1, 15)]))
        
    top_cases = data.get('top_cases', [])
    if top_cases:
        elements.append(Paragraph("High-Priority Cases", section_title_style))
        
        t_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#ffffff')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9.5),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#cbd5e1')),
            ('ALIGN', (2, 0), (3, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]
        
        case_data = [["Case Ref", "Trader ID", "Score", "Status"]]
        for idx, c in enumerate(top_cases[:15]):
            status = c.get('status', 'Open')
            row_idx = idx + 1
            
            if status == 'Escalated':
                t_styles.append(('BACKGROUND', (3, row_idx), (3, row_idx), colors.HexColor('#fee2e2')))
                t_styles.append(('TEXTCOLOR', (3, row_idx), (3, row_idx), colors.HexColor('#991b1b')))
                t_styles.append(('FONTNAME', (3, row_idx), (3, row_idx), 'Helvetica-Bold'))
            elif status == 'Investigating':
                t_styles.append(('BACKGROUND', (3, row_idx), (3, row_idx), colors.HexColor('#fef3c7')))
                t_styles.append(('TEXTCOLOR', (3, row_idx), (3, row_idx), colors.HexColor('#92400e')))
                t_styles.append(('FONTNAME', (3, row_idx), (3, row_idx), 'Helvetica-Bold'))
            elif status == 'Closed':
                t_styles.append(('BACKGROUND', (3, row_idx), (3, row_idx), colors.HexColor('#f1f5f9')))
                t_styles.append(('TEXTCOLOR', (3, row_idx), (3, row_idx), colors.HexColor('#475569')))
            else: # Open
                t_styles.append(('BACKGROUND', (3, row_idx), (3, row_idx), colors.HexColor('#dbeafe')))
                t_styles.append(('TEXTCOLOR', (3, row_idx), (3, row_idx), colors.HexColor('#1e40af')))
                t_styles.append(('FONTNAME', (3, row_idx), (3, row_idx), 'Helvetica-Bold'))
                
            case_data.append([
                c.get('case_ref', ''), 
                c.get('trader_id', ''), 
                f"{c.get('risk_score', 0):.1f}", 
                status
            ])
            
        case_table = Table(case_data, colWidths=[120, 180, 80, 120])
        case_table.setStyle(TableStyle(t_styles))
        elements.append(KeepTogether([case_table]))
        
    try:
        doc.build(elements, canvasmaker=NumberedCanvas)
    finally:
        for f in temp_files:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception as e:
                    logger.error(f"Failed to delete temp file {f}: {e}")
                    
    return pdf_path

