"""
Report Card PDF Generator — creates a downloadable PDF report.
"""
import io
from datetime import date
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# Grade-to-color mapping
GRADE_COLORS = {
    'A+': colors.HexColor('#10b981'), 'A': colors.HexColor('#10b981'), 'A-': colors.HexColor('#10b981'),
    'B+': colors.HexColor('#0ea5e9'), 'B': colors.HexColor('#0ea5e9'), 'B-': colors.HexColor('#0ea5e9'),
    'C+': colors.HexColor('#f59e0b'), 'C': colors.HexColor('#f59e0b'), 'C-': colors.HexColor('#f59e0b'),
    'D+': colors.HexColor('#f97316'), 'D': colors.HexColor('#f97316'), 'D-': colors.HexColor('#f97316'),
    'F': colors.HexColor('#ef4444'),
}

CATEGORY_LABELS = {
    'parameter_stability': 'Parameter Stability',
    'maintenance': 'Maintenance Compliance',
    'livestock_health': 'Livestock Health',
    'equipment': 'Equipment Status',
    'maturity': 'Tank Maturity',
    'water_chemistry': 'Water Chemistry',
}

STATUS_LABELS = {
    'excellent': 'Excellent',
    'good': 'Good',
    'fair': 'Fair',
    'poor': 'Poor',
    'critical': 'Critical',
}


def generate_report_card_pdf(tank_name: str, water_type: str, report_data: dict, tank_info: dict | None = None) -> bytes:
    """Generate a PDF report card and return the bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'ReportTitle', parent=styles['Title'],
        fontSize=24, spaceAfter=6, textColor=colors.HexColor('#1f2937'),
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle', parent=styles['Normal'],
        fontSize=12, textColor=colors.HexColor('#6b7280'), spaceAfter=20,
    )
    heading_style = ParagraphStyle(
        'SectionHeading', parent=styles['Heading2'],
        fontSize=14, textColor=colors.HexColor('#374151'),
        spaceBefore=20, spaceAfter=10,
    )
    body_style = ParagraphStyle(
        'BodyText', parent=styles['Normal'],
        fontSize=10, textColor=colors.HexColor('#4b5563'), leading=14,
    )
    grade_style = ParagraphStyle(
        'GradeText', parent=styles['Normal'],
        fontSize=48, alignment=TA_CENTER,
        textColor=colors.HexColor('#1f2937'), spaceAfter=4,
    )
    score_style = ParagraphStyle(
        'ScoreText', parent=styles['Normal'],
        fontSize=14, alignment=TA_CENTER,
        textColor=colors.HexColor('#6b7280'), spaceAfter=4,
    )
    status_style = ParagraphStyle(
        'StatusText', parent=styles['Normal'],
        fontSize=12, alignment=TA_CENTER,
        spaceAfter=20,
    )

    elements = []

    # -- Header --
    elements.append(Paragraph(f"🐠 {tank_name}", title_style))
    elements.append(Paragraph(
        f"Tank Report Card  •  {water_type.capitalize()}  •  {date.today().strftime('%B %d, %Y')}",
        subtitle_style
    ))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
    elements.append(Spacer(1, 10))

    # -- Overall Grade --
    overall_grade = report_data.get('overall_grade', 'N/A')
    overall_score = report_data.get('overall_score', 0)
    status = report_data.get('status', 'unknown')
    grade_color = GRADE_COLORS.get(overall_grade, colors.gray)

    elements.append(Paragraph(f'<b>{overall_grade}</b>', ParagraphStyle(
        'BigGrade', parent=grade_style, textColor=grade_color,
    )))
    elements.append(Paragraph(f'{overall_score} / 100', score_style))
    status_color = GRADE_COLORS.get(overall_grade, colors.gray)
    elements.append(Paragraph(
        f'<b>{STATUS_LABELS.get(status, status).upper()}</b>',
        ParagraphStyle('StatusLabel', parent=status_style, textColor=status_color)
    ))
    elements.append(Spacer(1, 10))

    # -- Category Breakdown --
    elements.append(Paragraph('Category Breakdown', heading_style))

    categories = report_data.get('categories', {})
    table_data = [['Category', 'Weight', 'Score', 'Grade']]

    for key, cat in categories.items():
        label = CATEGORY_LABELS.get(key, key)
        table_data.append([label, f"{cat['weight']}%", f"{cat['score']}/100", cat['grade']])

    cat_table = Table(table_data, colWidths=[200, 60, 70, 50])
    cat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))
    # Color the grade cells
    for i, (key, cat) in enumerate(categories.items(), start=1):
        g_color = GRADE_COLORS.get(cat['grade'], colors.gray)
        cat_table.setStyle(TableStyle([
            ('TEXTCOLOR', (3, i), (3, i), g_color),
            ('FONTNAME', (3, i), (3, i), 'Helvetica-Bold'),
        ]))

    elements.append(cat_table)
    elements.append(Spacer(1, 15))

    # -- Achievements --
    achievements = report_data.get('achievements', [])
    if achievements:
        elements.append(Paragraph('Achievements', heading_style))
        for ach in achievements:
            elements.append(Paragraph(
                f"{ach['icon']}  <b>{ach['label']}</b> — {ach['detail']}",
                body_style
            ))
        elements.append(Spacer(1, 10))

    # -- Insights & Recommendations --
    insights = report_data.get('insights', [])
    if insights:
        elements.append(Paragraph('Insights & Recommendations', heading_style))
        type_icons = {'success': '✅', 'info': 'ℹ️', 'warning': '⚠️', 'alert': '🚨'}
        for ins in insights:
            icon = type_icons.get(ins['type'], '•')
            elements.append(Paragraph(f"{icon}  {ins['message']}", body_style))
        elements.append(Spacer(1, 10))

    # -- Stats Summary --
    stats = report_data.get('stats', {})
    if stats:
        elements.append(Paragraph('Tank Statistics', heading_style))
        stats_data = [
            ['Metric', 'Value'],
            ['Total Livestock', str(stats.get('total_livestock', 0))],
            ['Species Count', str(stats.get('species_count', 0))],
            ['Type Diversity', str(stats.get('type_diversity', 0))],
            ['Active Diseases', str(stats.get('active_diseases', 0))],
            ['Overdue Maintenance', str(stats.get('overdue_maintenance', 0))],
            ['Total Reminders', str(stats.get('total_reminders', 0))],
            ['Equipment Count', str(stats.get('equipment_count', 0))],
        ]

        stats_table = Table(stats_data, colWidths=[200, 80])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        elements.append(stats_table)

    # -- Tank Overview --
    if tank_info:
        elements.append(Paragraph('Tank Overview', heading_style))
        overview_rows = [['Detail', 'Value']]
        if tank_info.get('setup_date'):
            overview_rows.append(['Setup Date', tank_info['setup_date']])
        if tank_info.get('display_volume_liters'):
            overview_rows.append(['Display Volume', f"{tank_info['display_volume_liters']:.0f} L"])
        if tank_info.get('sump_volume_liters'):
            overview_rows.append(['Sump Volume', f"{tank_info['sump_volume_liters']:.0f} L"])
        if tank_info.get('total_volume_liters'):
            overview_rows.append(['Total Volume', f"{tank_info['total_volume_liters']:.0f} L"])

        if len(overview_rows) > 1:
            ov_table = Table(overview_rows, colWidths=[200, 180])
            ov_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            elements.append(ov_table)
            elements.append(Spacer(1, 10))

    # -- Livestock Roster --
    if tank_info and tank_info.get('livestock'):
        elements.append(Paragraph('Livestock Roster', heading_style))
        ls_data = [['Species', 'Common Name', 'Type', 'Qty']]
        for item in tank_info['livestock']:
            ls_data.append([
                item.get('species', '—'),
                item.get('common', '—') or '—',
                (item.get('type', '') or '').replace('_', ' ').title(),
                str(item.get('qty', 1)),
            ])

        ls_table = Table(ls_data, colWidths=[150, 120, 80, 40])
        ls_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        elements.append(ls_table)
        elements.append(Spacer(1, 10))

    # -- Refugium --
    if tank_info and tank_info.get('has_refugium'):
        elements.append(Paragraph('Refugium', heading_style))
        ref_rows = [['Detail', 'Value']]
        if tank_info.get('refugium_type'):
            ref_rows.append(['Type', tank_info['refugium_type'].replace('_', ' ').title()])
        if tank_info.get('refugium_volume_liters'):
            ref_rows.append(['Volume', f"{tank_info['refugium_volume_liters']:.0f} L"])
        if tank_info.get('refugium_algae'):
            ref_rows.append(['Algae', tank_info['refugium_algae']])
        if tank_info.get('refugium_lighting_hours'):
            ref_rows.append(['Lighting', f"{tank_info['refugium_lighting_hours']:.1f} hrs/day"])

        if len(ref_rows) > 1:
            ref_table = Table(ref_rows, colWidths=[200, 180])
            ref_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            elements.append(ref_table)
            elements.append(Spacer(1, 10))

    # -- Lighting Schedules --
    if tank_info and tank_info.get('lighting'):
        elements.append(Paragraph('Lighting Schedules', heading_style))
        lt_data = [['Schedule', 'Channels', 'Status']]
        for sched in tank_info['lighting']:
            lt_data.append([
                sched.get('name', '—'),
                str(sched.get('channels', 0)),
                'Active' if sched.get('active') else 'Inactive',
            ])

        lt_table = Table(lt_data, colWidths=[220, 80, 80])
        lt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
        ]))
        # Color active rows green
        for i, sched in enumerate(tank_info['lighting'], start=1):
            if sched.get('active'):
                lt_table.setStyle(TableStyle([
                    ('TEXTCOLOR', (2, i), (2, i), colors.HexColor('#10b981')),
                    ('FONTNAME', (2, i), (2, i), 'Helvetica-Bold'),
                ]))
        elements.append(lt_table)
        elements.append(Spacer(1, 10))

    # -- Footer --
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#d1d5db')))
    footer_style = ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER,
        spaceBefore=8,
    )
    elements.append(Paragraph(
        f"Generated by AquaScope — {date.today().strftime('%Y-%m-%d')}",
        footer_style
    ))

    doc.build(elements)
    return buffer.getvalue()
