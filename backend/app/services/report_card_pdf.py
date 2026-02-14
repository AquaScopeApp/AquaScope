"""
Report Card PDF Generator — compact single-page report with visual grade ring.
"""
import io
from datetime import date
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Flowable,
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT


# ── Palette ──────────────────────────────────────────────────────────────────

GRADE_COLORS = {
    'A+': '#10b981', 'A': '#10b981', 'A-': '#10b981',
    'B+': '#0ea5e9', 'B': '#0ea5e9', 'B-': '#0ea5e9',
    'C+': '#f59e0b', 'C': '#f59e0b', 'C-': '#f59e0b',
    'D+': '#f97316', 'D': '#f97316', 'D-': '#f97316',
    'F': '#ef4444',
}

CATEGORY_META = {
    'parameter_stability': 'Parameters',
    'maintenance':         'Maintenance',
    'livestock_health':    'Livestock',
    'equipment':           'Equipment',
    'maturity':            'Maturity',
    'water_chemistry':     'Chemistry',
}

STATUS_LABELS = {
    'excellent': 'EXCELLENT',
    'good': 'GOOD',
    'fair': 'FAIR',
    'poor': 'POOR',
    'critical': 'CRITICAL',
}

ENERGY_LABEL_DATA = [
    ('A', '90–100', '#10b981', 0.40),
    ('B', '80–89',  '#0ea5e9', 0.52),
    ('C', '70–79',  '#f59e0b', 0.64),
    ('D', '60–69',  '#f97316', 0.76),
    ('F', '0–59',   '#ef4444', 0.88),
]


# ── Custom Flowables ─────────────────────────────────────────────────────────

class AccentBar(Flowable):
    """Thin colored bar spanning full width."""
    def __init__(self, width, height=3):
        Flowable.__init__(self)
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(colors.HexColor('#0369a1'))
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)


class GradeRing(Flowable):
    """Circular grade gauge with arc progress, score, and status label."""
    def __init__(self, grade, score, status, size=95):
        Flowable.__init__(self)
        self.grade = grade
        self.score = score
        self.status = status
        self.size = size
        self.width = size
        self.height = size + 16

    def draw(self):
        c = self.canv
        cx = self.size / 2
        cy = self.size / 2 + 12
        r = self.size / 2 - 6
        ghex = GRADE_COLORS.get(self.grade, '#9ca3af')

        # Background ring
        c.setStrokeColor(colors.HexColor('#e5e7eb'))
        c.setLineWidth(7)
        c.setLineCap(1)
        c.circle(cx, cy, r, stroke=1, fill=0)

        # Progress arc (from 12-o'clock, clockwise)
        if self.score > 0:
            c.setStrokeColor(colors.HexColor(ghex))
            c.setLineWidth(7)
            c.setLineCap(1)
            c.arc(cx - r, cy - r, cx + r, cy + r, 90, -(self.score / 100) * 360)

        # Grade letter
        c.setFillColor(colors.HexColor(ghex))
        c.setFont('Helvetica-Bold', 28)
        c.drawCentredString(cx, cy, self.grade)

        # Score
        c.setFillColor(colors.HexColor('#6b7280'))
        c.setFont('Helvetica', 10)
        c.drawCentredString(cx, cy - 17, f"{self.score}/100")

        # Status label below the ring
        c.setFillColor(colors.HexColor(ghex))
        c.setFont('Helvetica-Bold', 7)
        c.drawCentredString(cx, 2, STATUS_LABELS.get(self.status, ''))


class ProgressBar(Flowable):
    """Horizontal rounded progress bar."""
    def __init__(self, score, color_hex, width=145, height=7):
        Flowable.__init__(self)
        self.score = score
        self.color_hex = color_hex
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        rad = self.height / 2
        # Track
        c.setFillColor(colors.HexColor('#e5e7eb'))
        c.roundRect(0, 0, self.width, self.height, rad, fill=1, stroke=0)
        # Fill
        if self.score > 0:
            filled = max(self.height, (self.score / 100) * self.width)
            c.setFillColor(colors.HexColor(self.color_hex))
            c.roundRect(0, 0, filled, self.height, rad, fill=1, stroke=0)


class EnergyLabel(Flowable):
    """EU energy-label style grade scale with arrow bars."""
    def __init__(self, current_grade, total_width=180):
        Flowable.__init__(self)
        self.current_grade = current_grade
        self.total_width = total_width
        self.row_h = 14
        self.gap = 2
        self.width = total_width
        self.height = len(ENERGY_LABEL_DATA) * (self.row_h + self.gap) - self.gap

    def _grade_level(self, grade):
        if grade.startswith('A'):
            return 'A'
        if grade.startswith('B'):
            return 'B'
        if grade.startswith('C'):
            return 'C'
        if grade.startswith('D'):
            return 'D'
        return 'F'

    def draw(self):
        c = self.canv
        active_level = self._grade_level(self.current_grade)
        bar_area = self.total_width * 0.60  # bars use 60% of width
        y = self.height - self.row_h

        for grade, label, hex_color, width_frac in ENERGY_LABEL_DATA:
            is_active = (grade == active_level)
            bar_w = bar_area * width_frac / 0.88  # normalize so F=full
            arrow_tip = 6

            # Arrow-shaped bar
            alpha = 1.0 if is_active else 0.35
            c.saveState()
            c.setFillColor(colors.HexColor(hex_color))
            if not is_active:
                c.setFillAlpha(alpha)
            p = c.beginPath()
            p.moveTo(0, y)
            p.lineTo(bar_w - arrow_tip, y)
            p.lineTo(bar_w, y + self.row_h / 2)
            p.lineTo(bar_w - arrow_tip, y + self.row_h)
            p.lineTo(0, y + self.row_h)
            p.close()
            c.drawPath(p, fill=1, stroke=0)
            c.restoreState()

            # Grade letter inside bar
            c.saveState()
            c.setFillColor(colors.white)
            c.setFont('Helvetica-Bold', 9)
            c.drawString(6, y + 3.5, grade)
            c.restoreState()

            # Score range to the right of bar
            c.saveState()
            text_color = '#374151' if is_active else '#9ca3af'
            c.setFillColor(colors.HexColor(text_color))
            c.setFont('Helvetica' if not is_active else 'Helvetica-Bold', 8)
            c.drawString(bar_w + 8, y + 3.5, label)
            c.restoreState()

            # Current grade pointer
            if is_active:
                ptr_x = bar_w + 52
                c.saveState()
                c.setFillColor(colors.HexColor('#111827'))
                # Small left-pointing triangle
                p2 = c.beginPath()
                p2.moveTo(ptr_x, y + self.row_h / 2)
                p2.lineTo(ptr_x + 6, y + self.row_h - 1)
                p2.lineTo(ptr_x + 6, y + 1)
                p2.close()
                c.drawPath(p2, fill=1, stroke=0)
                # Actual grade
                c.setFont('Helvetica-Bold', 9)
                c.drawString(ptr_x + 9, y + 3.5, self.current_grade)
                c.restoreState()

            y -= (self.row_h + self.gap)


class CircularImage(Flowable):
    """Circular clipped image (avatar style)."""
    def __init__(self, image_path, diameter=80):
        Flowable.__init__(self)
        self.image_path = image_path
        self.diameter = diameter
        self.width = diameter
        self.height = diameter

    def draw(self):
        c = self.canv
        r = self.diameter / 2
        try:
            # Resize image to 2x diameter for retina-quality but small file size
            target_px = int(self.diameter * 2)
            pil_img = PILImage.open(self.image_path)
            pil_img = pil_img.convert('RGB')
            # Center-crop to square
            iw, ih = pil_img.size
            side = min(iw, ih)
            left = (iw - side) // 2
            top = (ih - side) // 2
            pil_img = pil_img.crop((left, top, left + side, top + side))
            pil_img = pil_img.resize((target_px, target_px), PILImage.LANCZOS)
            img_buf = io.BytesIO()
            pil_img.save(img_buf, format='JPEG', quality=80)
            img_buf.seek(0)
            img = ImageReader(img_buf)

            # Clip to circle
            c.saveState()
            p = c.beginPath()
            p.circle(r, r, r)
            c.clipPath(p, stroke=0)
            c.drawImage(img, 0, 0, self.diameter, self.diameter)
            c.restoreState()

            # Thin border ring
            c.setStrokeColor(colors.HexColor('#d1d5db'))
            c.setLineWidth(1)
            c.circle(r, r, r, stroke=1, fill=0)
        except Exception:
            # If image fails, draw a placeholder circle
            c.setFillColor(colors.HexColor('#f3f4f6'))
            c.circle(r, r, r, fill=1, stroke=0)
            c.setFillColor(colors.HexColor('#9ca3af'))
            c.setFont('Helvetica', 10)
            c.drawCentredString(r, r - 3, '?')


# ── Main Generator ───────────────────────────────────────────────────────────

def _resolve_image_path(image_url: str | None) -> str | None:
    """Convert a relative image_url to an absolute filesystem path."""
    if not image_url:
        return None
    # image_url is like /uploads/tank-images/uuid.jpg
    file_path = Path(f"/app{image_url}")
    if file_path.exists():
        return str(file_path)
    return None


def generate_report_card_pdf(
    tank_name: str,
    water_type: str,
    report_data: dict,
    tank_info: dict | None = None,
) -> bytes:
    """Generate a compact, single-page PDF report card."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=14 * mm,
        bottomMargin=10 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
    )

    pw = A4[0] - 36 * mm  # usable page width (~493 pt)
    styles = getSampleStyleSheet()

    # ── Styles ──
    s_title = ParagraphStyle(
        'T', parent=styles['Title'],
        fontSize=20, leading=24,
        textColor=colors.HexColor('#111827'), spaceAfter=2,
    )
    s_sub = ParagraphStyle(
        'S', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#6b7280'), spaceAfter=8,
    )
    s_section = ParagraphStyle(
        'H', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#374151'),
        fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=3,
    )
    s_body = ParagraphStyle(
        'B', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#4b5563'), leading=13,
    )
    s_small = ParagraphStyle(
        'Sm', parent=styles['Normal'],
        fontSize=8, textColor=colors.HexColor('#374151'), leading=11,
    )
    s_footer = ParagraphStyle(
        'F', parent=styles['Normal'],
        fontSize=7, textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER, spaceBefore=6,
    )
    s_cat_label = ParagraphStyle(
        'CL', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#374151'), leading=12,
    )
    s_cat_score = ParagraphStyle(
        'CS', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#6b7280'),
        alignment=TA_RIGHT, leading=12,
    )

    elements = []

    # ── Accent bar ───────────────────────────────────────────────────────────
    elements.append(AccentBar(pw))
    elements.append(Spacer(1, 8))

    # ── Header with optional tank avatar ─────────────────────────────────────
    image_path = _resolve_image_path(
        tank_info.get('image_url') if tank_info else None
    )
    if image_path:
        avatar = CircularImage(image_path, diameter=60)
        header_table = Table(
            [[avatar, Paragraph(tank_name, s_title)]],
            colWidths=[72, pw - 72],
        )
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
    else:
        elements.append(Paragraph(tank_name, s_title))

    elements.append(Paragraph(
        f"Tank Report Card &nbsp;&bull;&nbsp; {water_type.capitalize()} "
        f"&nbsp;&bull;&nbsp; {date.today().strftime('%B %d, %Y')}",
        s_sub,
    ))
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb'),
    ))
    elements.append(Spacer(1, 6))

    # ── Hero: Grade Ring + Energy Label + Category Bars ─────────────────────
    overall_grade = report_data.get('overall_grade', 'N/A')
    overall_score = report_data.get('overall_score', 0)
    status = report_data.get('status', 'unknown')
    categories = report_data.get('categories', {})

    grade_ring = GradeRing(overall_grade, overall_score, status)
    energy_label = EnergyLabel(overall_grade, total_width=130)

    cat_bar_w = 110  # narrower progress bars to fit 3-col layout
    cat_rows = []
    for key, cat in categories.items():
        label = CATEGORY_META.get(key, key)
        ghex = GRADE_COLORS.get(cat['grade'], '#9ca3af')
        cat_rows.append([
            Paragraph(
                f"<b>{label}</b> "
                f"<font size=7 color='#9ca3af'>({cat['weight']}%)</font>",
                s_cat_label,
            ),
            ProgressBar(cat['score'], ghex, width=cat_bar_w),
            Paragraph(
                f"{cat['score']} "
                f"<font color='{ghex}'><b>{cat['grade']}</b></font>",
                s_cat_score,
            ),
        ])

    cat_table = Table(cat_rows, colWidths=[85, cat_bar_w + 10, 48])
    cat_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (0, -1), 0),
        ('RIGHTPADDING', (-1, 0), (-1, -1), 0),
    ]))

    ring_w = 100
    label_w = 140
    cat_w = pw - ring_w - label_w - 10
    hero = Table(
        [[grade_ring, energy_label, cat_table]],
        colWidths=[ring_w, label_w, cat_w],
    )
    hero.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(hero)
    elements.append(Spacer(1, 6))

    # ── Achievements (inline) ────────────────────────────────────────────────
    achievements = report_data.get('achievements', [])
    if achievements:
        elements.append(Paragraph('ACHIEVEMENTS', s_section))
        parts = [f"<b>{a['label']}</b>" for a in achievements]
        elements.append(Paragraph(
            " &nbsp;&bull;&nbsp; ".join(parts), s_small,
        ))
        elements.append(Spacer(1, 2))

    # ── Insights ─────────────────────────────────────────────────────────────
    insights = report_data.get('insights', [])
    if insights:
        type_colors = {
            'success': '#10b981', 'info': '#0ea5e9',
            'warning': '#f59e0b', 'alert': '#ef4444',
        }
        elements.append(Paragraph('INSIGHTS', s_section))
        for ins in insights:
            col = type_colors.get(ins['type'], '#6b7280')
            elements.append(Paragraph(
                f"<font color='{col}'>&bull;</font>&nbsp; {ins['message']}",
                s_body,
            ))
        elements.append(Spacer(1, 2))

    # ── Divider ──────────────────────────────────────────────────────────────
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=colors.HexColor('#e5e7eb'),
    ))
    elements.append(Spacer(1, 4))

    # ── Tank Profile (two-column key-value grid) ─────────────────────────────
    stats = report_data.get('stats', {})
    left_kv = []
    right_kv = []

    if tank_info and tank_info.get('setup_date'):
        left_kv.append(('Setup', tank_info['setup_date']))
    left_kv.append(('Water Type', water_type.capitalize()))
    left_kv.append(('Livestock', str(stats.get('total_livestock', 0))))
    left_kv.append(('Species', str(stats.get('species_count', 0))))

    if tank_info and tank_info.get('display_volume_liters'):
        right_kv.append(('Display Vol.', f"{tank_info['display_volume_liters']:.0f} L"))
    if tank_info and tank_info.get('sump_volume_liters'):
        right_kv.append(('Sump Vol.', f"{tank_info['sump_volume_liters']:.0f} L"))
    if tank_info and tank_info.get('total_volume_liters'):
        right_kv.append(('Total Vol.', f"{tank_info['total_volume_liters']:.0f} L"))
    right_kv.append(('Equipment', str(stats.get('equipment_count', 0))))
    if stats.get('active_diseases', 0) > 0:
        right_kv.append(('Diseases', str(stats['active_diseases'])))

    max_rows = max(len(left_kv), len(right_kv))
    profile_rows = []
    for i in range(max_rows):
        profile_rows.append([
            left_kv[i][0] if i < len(left_kv) else '',
            left_kv[i][1] if i < len(left_kv) else '',
            '',
            right_kv[i][0] if i < len(right_kv) else '',
            right_kv[i][1] if i < len(right_kv) else '',
        ])

    if profile_rows:
        elements.append(Paragraph('TANK PROFILE', s_section))
        pt = Table(profile_rows, colWidths=[70, 80, 15, 80, 80])
        pt.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#111827')),
            ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#6b7280')),
            ('TEXTCOLOR', (4, 0), (4, -1), colors.HexColor('#111827')),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
            ('FONTNAME', (4, 0), (4, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('BACKGROUND', (0, 0), (1, -1), colors.HexColor('#f9fafb')),
            ('BACKGROUND', (3, 0), (4, -1), colors.HexColor('#f9fafb')),
        ]))
        elements.append(pt)
        elements.append(Spacer(1, 4))

    # ── Livestock Roster (compact) ───────────────────────────────────────────
    if tank_info and tank_info.get('livestock'):
        elements.append(Paragraph('LIVESTOCK', s_section))
        ls_data = [['Species', 'Common Name', 'Type', 'Qty']]
        for item in tank_info['livestock'][:15]:
            ls_data.append([
                item.get('species', '-'),
                item.get('common', '-') or '-',
                (item.get('type', '') or '').replace('_', ' ').title(),
                str(item.get('qty', 1)),
            ])
        if len(tank_info['livestock']) > 15:
            remaining = len(tank_info['livestock']) - 15
            ls_data.append([f'... and {remaining} more', '', '', ''])

        lt = Table(ls_data, colWidths=[140, 120, 70, 35])
        lt.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#374151')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#4b5563')),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('ALIGN', (3, 0), (3, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.white, colors.HexColor('#fafafa')]),
        ]))
        elements.append(lt)
        elements.append(Spacer(1, 4))

    # ── Refugium + Lighting (compact inline) ─────────────────────────────────
    extra_parts = []

    if tank_info and tank_info.get('has_refugium'):
        bits = []
        if tank_info.get('refugium_type'):
            bits.append(
                f"Type: {tank_info['refugium_type'].replace('_', ' ').title()}")
        if tank_info.get('refugium_volume_liters'):
            bits.append(f"Vol: {tank_info['refugium_volume_liters']:.0f} L")
        if tank_info.get('refugium_algae'):
            bits.append(f"Algae: {tank_info['refugium_algae']}")
        if tank_info.get('refugium_lighting_hours'):
            bits.append(
                f"Light: {tank_info['refugium_lighting_hours']:.1f} h/day")
        if bits:
            extra_parts.append(Paragraph(
                "<b>REFUGIUM</b>&nbsp;&nbsp;" +
                " &nbsp;&bull;&nbsp; ".join(
                    f"<font color='#4b5563'>{b}</font>" for b in bits),
                ParagraphStyle('RP', parent=s_small, fontSize=8, leading=11),
            ))

    if tank_info and tank_info.get('lighting'):
        for sched in tank_info['lighting']:
            st = 'Active' if sched.get('active') else 'Inactive'
            extra_parts.append(Paragraph(
                f"<b>LIGHTING</b>&nbsp;&nbsp;"
                f"<font color='#4b5563'>{sched.get('name', '?')} "
                f"({st}, {sched.get('channels', 0)} channels)</font>",
                ParagraphStyle('LP', parent=s_small, fontSize=8, leading=11),
            ))

    for ep in extra_parts:
        elements.append(ep)
    if extra_parts:
        elements.append(Spacer(1, 4))

    # ── Footer ───────────────────────────────────────────────────────────────
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=colors.HexColor('#d1d5db'),
    ))
    elements.append(Paragraph(
        f"Generated by AquaScope &mdash; {date.today().strftime('%Y-%m-%d')}",
        s_footer,
    ))

    doc.build(elements)
    return buffer.getvalue()
