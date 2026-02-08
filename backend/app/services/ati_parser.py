"""
ATI ICP Test PDF Parser

Parses ATI lab ICP-OES test result PDFs and extracts structured data.
Uses pdftotext (poppler) to extract text from PDF files.
"""
import re
import subprocess
from datetime import date
from typing import Dict, Any, Optional, List
from pathlib import Path


class ATIParserError(Exception):
    """Raised when PDF parsing fails"""
    pass


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using pdftotext"""
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', pdf_path, '-'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise ATIParserError(f"Failed to extract text from PDF: {e}")
    except FileNotFoundError:
        raise ATIParserError("pdftotext not found. Install poppler-utils.")


def parse_date(date_str: str) -> Optional[date]:
    """Parse date string in various formats"""
    if not date_str or date_str.strip() == '-':
        return None

    # Try YYYY-MM-DD format first
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
    if match:
        return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))

    # Try MM/DD/YYYY format (ATI uses this)
    match = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', date_str)
    if match:
        month, day, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            return date(year, month, day)
        except ValueError:
            pass

    # Try DD.MM.YYYY format
    match = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', date_str)
    if match:
        day, month, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        try:
            return date(year, month, day)
        except ValueError:
            pass

    return None


def extract_value_and_status(line: str) -> tuple[Optional[float], Optional[str]]:
    """
    Extract numeric value and status from a line.
    Format: "Element: 123.45 mg/l NORMAL"
    """
    value = None
    status = None

    # Extract numeric value (handles decimals and scientific notation)
    # Pattern: one or more digits, optional decimal point and more digits, optional exponent
    value_match = re.search(r'(\d+\.?\d*(?:e[+-]?\d+)?)', line, re.IGNORECASE)
    if value_match:
        try:
            value = float(value_match.group(1))
        except ValueError:
            pass

    # Extract status - check for multi-word statuses first, then single-word
    status_patterns = [
        'CRITICALLY LOW', 'CRITICALLY HIGH',
        'ABOVE NORMAL', 'BELOW NORMAL',
        'SLIGHTLY LOW', 'SLIGHTLY HIGH',
        'NORMAL'
    ]
    line_upper = line.upper()
    for pattern in status_patterns:
        if pattern in line_upper:
            # Convert to underscore format for consistency
            status = pattern.replace(' ', '_')
            break

    return value, status


def extract_score(text: str, score_name: str) -> Optional[int]:
    """Extract quality score from text"""
    pattern = rf'{score_name}[:\s]+(\d+)'
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def parse_ati_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Parse ATI ICP test PDF and return structured data.

    Returns dict matching ICPTestCreate schema (without tank_id).
    """
    text = extract_text_from_pdf(pdf_path)

    data: Dict[str, Any] = {
        'lab_name': 'ATI Aquaristik',
    }

    # Extract test ID (barcode number)
    test_id_match = re.search(r'(?:Test ID|Barcode)[:\s]+(\d+)', text, re.IGNORECASE)
    if test_id_match:
        data['test_id'] = test_id_match.group(1)

    # Extract dates
    # Look for common date labels
    date_patterns = [
        (r'Test Date[:\s]+([^\n]+)', 'test_date'),
        (r'Sample Date[:\s]+([^\n]+)', 'sample_date'),
        (r'Received[:\s]+([^\n]+)', 'received_date'),
        (r'Evaluated[:\s]+([^\n]+)', 'evaluated_date'),
    ]

    for pattern, field in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            parsed_date = parse_date(match.group(1))
            if parsed_date:
                data[field] = parsed_date

    # If no test_date found, try to extract from filename (YYYY-MM-DD format)
    if 'test_date' not in data:
        filename = Path(pdf_path).name
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
        if date_match:
            data['test_date'] = parse_date(date_match.group(1))

    # Extract quality scores
    score_mappings = [
        ('Major Elements', 'score_major_elements'),
        ('Minor Elements', 'score_minor_elements'),
        ('Pollutants', 'score_pollutants'),
        ('Base Elements', 'score_base_elements'),
        ('Overall', 'score_overall'),
    ]

    for label, field in score_mappings:
        score = extract_score(text, label)
        if score is not None:
            data[field] = score

    # Element mappings: (symbol_pattern, value_field, status_field)
    # ATI format: Symbol line has value, followed by full name line with ideal value
    elements = [
        # Base elements
        (r'^Sal\.\s+total', 'salinity', 'salinity_status'),
        (r'^KH\s+', 'kh', 'kh_status'),

        # Major elements (mg/l)
        (r'^Cl\s+', 'cl', 'cl_status'),
        (r'^Na\s+', 'na', 'na_status'),
        (r'^Mg\s+', 'mg', 'mg_status'),
        (r'^S\s+', 's', 's_status'),
        (r'^Ca\s+', 'ca', 'ca_status'),
        (r'^K\s+', 'k', 'k_status'),
        (r'^Br\s+', 'br', 'br_status'),
        (r'^Sr\s+', 'sr', 'sr_status'),
        (r'^B\s+', 'b', 'b_status'),
        (r'^F\s+', 'f', 'f_status'),

        # Minor elements (µg/l)
        (r'^Li\s+', 'li', 'li_status'),
        (r'^Si\s+', 'si', 'si_status'),
        (r'^I\s+', 'i', 'i_status'),
        (r'^Ba\s+', 'ba', 'ba_status'),
        (r'^Mo\s+', 'mo', 'mo_status'),
        (r'^Ni\s+', 'ni', 'ni_status'),
        (r'^Mn\s+', 'mn', 'mn_status'),
        (r'^As\s+', 'as', 'as_status'),
        (r'^Be\s+', 'be', 'be_status'),
        (r'^Cr\s+', 'cr', 'cr_status'),
        (r'^Co\s+', 'co', 'co_status'),
        (r'^Fe\s+', 'fe', 'fe_status'),
        (r'^Cu\s+', 'cu', 'cu_status'),
        (r'^Se\s+', 'se', 'se_status'),
        (r'^Ag\s+', 'ag', 'ag_status'),
        (r'^V\s+', 'v', 'v_status'),
        (r'^Zn\s+', 'zn', 'zn_status'),
        (r'^Sn\s+', 'sn', 'sn_status'),

        # Nutrients
        (r'^NO3\s+', 'no3', 'no3_status'),
        (r'^P\s+', 'p', 'p_status'),
        (r'^PO4\s+', 'po4', 'po4_status'),

        # Pollutants (µg/l)
        (r'^Al\s+', 'al', 'al_status'),
        (r'^Sb\s+', 'sb', 'sb_status'),
        (r'^Bi\s+', 'bi', 'bi_status'),
        (r'^Pb\s+', 'pb', 'pb_status'),
        (r'^Cd\s+', 'cd', 'cd_status'),
        (r'^La\s+', 'la', 'la_status'),
        (r'^Tl\s+', 'tl', 'tl_status'),
        (r'^Ti\s+', 'ti', 'ti_status'),
        (r'^W\s+', 'w', 'w_status'),
        (r'^Hg\s+', 'hg', 'hg_status'),
    ]

    for pattern, value_field, status_field in elements:
        # Search for lines starting with the element symbol
        regex = re.compile(pattern, re.MULTILINE)
        match = regex.search(text)

        if match:
            # Get the full line
            line_start = match.start()
            line_end = text.find('\n', line_start)
            if line_end == -1:
                line_end = len(text)
            line = text[line_start:line_end]

            # Check if value is "---" (not detected)
            if '---' in line:
                # Store status but no value
                _, status = extract_value_and_status(line)
                if status is not None:
                    data[status_field] = status
            else:
                # Extract value and status
                value, status = extract_value_and_status(line)
                if value is not None:
                    data[value_field] = value
                if status is not None:
                    data[status_field] = status

    # Extract recommendations (if present)
    recommendations_section = re.search(
        r'Recommendations?:(.+?)(?=\n\n|\Z)',
        text,
        re.IGNORECASE | re.DOTALL
    )
    if recommendations_section:
        # Parse recommendations into list of dicts
        recs_text = recommendations_section.group(1).strip()
        recommendations: List[Dict[str, str]] = []

        # Split by newlines and create recommendation objects
        for line in recs_text.split('\n'):
            line = line.strip()
            if line and not line.startswith('-'):
                recommendations.append({'text': line})

        if recommendations:
            data['recommendations'] = recommendations

    # Extract dosing instructions (if present)
    dosing_section = re.search(
        r'Dosing Instructions?:(.+?)(?=\n\n|\Z)',
        text,
        re.IGNORECASE | re.DOTALL
    )
    if dosing_section:
        dosing_text = dosing_section.group(1).strip()
        data['dosing_instructions'] = {'text': dosing_text}

    # Ensure test_date exists (required field)
    if 'test_date' not in data:
        raise ATIParserError("Could not extract test date from PDF")

    return data


def validate_parsed_data(data: Dict[str, Any]) -> None:
    """Validate that parsed data has minimum required fields"""
    required = ['lab_name', 'test_date']
    missing = [field for field in required if field not in data]

    if missing:
        raise ATIParserError(f"Missing required fields: {', '.join(missing)}")

    # Check that at least some element data was extracted
    element_fields = ['ca', 'mg', 'kh', 'salinity']
    has_data = any(field in data for field in element_fields)

    if not has_data:
        raise ATIParserError("No element data could be extracted from PDF")
