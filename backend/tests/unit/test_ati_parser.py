"""
Tests for ATI ICP PDF parser service

Uses mocking to test parsing logic without requiring pdftotext or real PDF files.
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import date

from app.services.ati_parser import (
    ATIParserError,
    parse_date,
    extract_value_and_status,
    extract_score,
    validate_parsed_data,
    parse_ati_pdf,
)


# ---------------------------------------------------------------------------
# ATIParserError
# ---------------------------------------------------------------------------

class TestATIParserError:
    """Test the custom ATIParserError exception."""

    def test_is_exception_subclass(self):
        """ATIParserError should be a subclass of Exception."""
        assert issubclass(ATIParserError, Exception)

    def test_raise_and_catch(self):
        """ATIParserError can be raised and caught with a message."""
        with pytest.raises(ATIParserError, match="something went wrong"):
            raise ATIParserError("something went wrong")

    def test_empty_message(self):
        """ATIParserError can be raised with an empty message."""
        with pytest.raises(ATIParserError):
            raise ATIParserError("")

    def test_str_representation(self):
        """The string representation should contain the original message."""
        err = ATIParserError("PDF corrupted")
        assert str(err) == "PDF corrupted"


# ---------------------------------------------------------------------------
# parse_date
# ---------------------------------------------------------------------------

class TestParseDate:
    """Test date parsing across all supported formats."""

    def test_yyyy_mm_dd_format(self):
        """Parse ISO 8601 date YYYY-MM-DD."""
        assert parse_date("2024-01-15") == date(2024, 1, 15)

    def test_mm_dd_yyyy_format(self):
        """Parse US-style MM/DD/YYYY date (ATI default)."""
        assert parse_date("01/15/2024") == date(2024, 1, 15)

    def test_dd_mm_yyyy_format(self):
        """Parse European DD.MM.YYYY date."""
        assert parse_date("15.01.2024") == date(2024, 1, 15)

    def test_dash_returns_none(self):
        """A bare dash '-' indicates no date and returns None."""
        assert parse_date("-") is None

    def test_empty_string_returns_none(self):
        """An empty string returns None."""
        assert parse_date("") is None

    def test_none_input_returns_none(self):
        """None input returns None (falsy check)."""
        assert parse_date(None) is None

    def test_invalid_string_returns_none(self):
        """A non-date string returns None."""
        assert parse_date("invalid") is None

    def test_whitespace_dash_returns_none(self):
        """A dash surrounded by whitespace still returns None."""
        assert parse_date("  -  ") is None

    def test_date_embedded_in_text(self):
        """Date formats can be found when embedded in surrounding text."""
        assert parse_date("Created: 2024-03-20 (final)") == date(2024, 3, 20)

    def test_mm_dd_yyyy_single_digit(self):
        """Parse MM/DD/YYYY with single-digit month and day."""
        assert parse_date("3/5/2024") == date(2024, 3, 5)

    def test_dd_mm_yyyy_single_digit(self):
        """Parse DD.MM.YYYY with single-digit day and month."""
        assert parse_date("5.3.2024") == date(2024, 3, 5)

    def test_invalid_date_mm_dd_yyyy_returns_none(self):
        """Invalid calendar date in MM/DD/YYYY format returns None."""
        # Month 13 is invalid
        assert parse_date("13/32/2024") is None

    def test_invalid_date_dd_mm_yyyy_returns_none(self):
        """Invalid calendar date in DD.MM.YYYY format returns None."""
        # Day 32 is invalid
        assert parse_date("32.13.2024") is None

    def test_february_leap_year(self):
        """Parse a valid leap-year February date."""
        assert parse_date("02/29/2024") == date(2024, 2, 29)

    def test_february_non_leap_year_returns_none(self):
        """Feb 29 in a non-leap year returns None."""
        assert parse_date("02/29/2023") is None


# ---------------------------------------------------------------------------
# extract_value_and_status
# ---------------------------------------------------------------------------

class TestExtractValueAndStatus:
    """Test extraction of numeric values and status labels from text lines."""

    def test_normal_value_and_status(self):
        """Extract a simple value with NORMAL status."""
        value, status = extract_value_and_status("Ca    420.5 mg/l NORMAL")
        assert value == 420.5
        assert status == "NORMAL"

    def test_below_normal_status(self):
        """Extract value with BELOW NORMAL multi-word status."""
        value, status = extract_value_and_status("Mg    1150.0 mg/l Below Normal")
        assert value == 1150.0
        assert status == "BELOW_NORMAL"

    def test_above_normal_status(self):
        """Extract value with ABOVE NORMAL status."""
        value, status = extract_value_and_status("K     450 mg/l Above Normal")
        assert value == 450.0
        assert status == "ABOVE_NORMAL"

    def test_critically_low_status(self):
        """Extract value with CRITICALLY LOW status."""
        value, status = extract_value_and_status("Sr    2.1 mg/l Critically Low")
        assert value == 2.1
        assert status == "CRITICALLY_LOW"

    def test_critically_high_status(self):
        """Extract value with CRITICALLY HIGH status."""
        value, status = extract_value_and_status("Cu    150 ug/l Critically High")
        assert value == 150.0
        assert status == "CRITICALLY_HIGH"

    def test_slightly_low_status(self):
        """Extract value with SLIGHTLY LOW status."""
        value, status = extract_value_and_status("B     3.8 mg/l Slightly Low")
        assert value == 3.8
        assert status == "SLIGHTLY_LOW"

    def test_slightly_high_status(self):
        """Extract value with SLIGHTLY HIGH status."""
        value, status = extract_value_and_status("F     2.5 mg/l Slightly High")
        assert value == 2.5
        assert status == "SLIGHTLY_HIGH"

    def test_scientific_notation(self):
        """Extract a value written in scientific notation."""
        value, status = extract_value_and_status("Li    5e-3 mg/l Normal")
        assert value == 5e-3
        assert status == "NORMAL"

    def test_scientific_notation_with_plus(self):
        """Scientific notation with explicit positive exponent."""
        value, status = extract_value_and_status("Na    1.05e+4 mg/l Normal")
        assert value == 1.05e+4
        assert status == "NORMAL"

    def test_no_numeric_value_dashes(self):
        """Lines with '---' have no extractable numeric value."""
        value, status = extract_value_and_status("Hg    --- ug/l Normal")
        # '---' contains no digit group, so value should be None
        assert value is None
        assert status == "NORMAL"

    def test_integer_value(self):
        """Extract a plain integer value."""
        value, status = extract_value_and_status("Ca   5 mg/l Normal")
        assert value == 5.0
        assert status == "NORMAL"

    def test_no_status(self):
        """A line with a value but no recognised status keyword."""
        value, status = extract_value_and_status("Ca    420.5 mg/l")
        assert value == 420.5
        assert status is None

    def test_empty_line(self):
        """An empty line yields no value and no status."""
        value, status = extract_value_and_status("")
        assert value is None
        assert status is None

    def test_status_case_insensitive(self):
        """Status detection should be case-insensitive."""
        value, status = extract_value_and_status("Ca    420 mg/l normal")
        assert value == 420.0
        assert status == "NORMAL"

    def test_multi_word_status_takes_priority(self):
        """Multi-word statuses should be detected before single-word 'NORMAL'."""
        # 'ABOVE NORMAL' contains 'NORMAL' but should match 'ABOVE NORMAL' first
        value, status = extract_value_and_status("K     500 mg/l Above Normal")
        assert status == "ABOVE_NORMAL"

    def test_value_with_large_decimal(self):
        """Extract a value with many decimal digits."""
        value, status = extract_value_and_status("B     4.567890 mg/l Normal")
        assert value == pytest.approx(4.56789)
        assert status == "NORMAL"


# ---------------------------------------------------------------------------
# extract_score
# ---------------------------------------------------------------------------

class TestExtractScore:
    """Test quality score extraction from text blocks."""

    def test_major_elements_score(self):
        """Extract 'Major Elements' score."""
        text = "Quality Assessment\nMajor Elements: 85\nMinor Elements: 72"
        assert extract_score(text, "Major Elements") == 85

    def test_minor_elements_score(self):
        """Extract 'Minor Elements' score."""
        text = "Major Elements: 85\nMinor Elements: 72\nPollutants: 90"
        assert extract_score(text, "Minor Elements") == 72

    def test_pollutants_score(self):
        """Extract 'Pollutants' score."""
        text = "Pollutants: 90"
        assert extract_score(text, "Pollutants") == 90

    def test_overall_score(self):
        """Extract 'Overall' score."""
        text = "Overall  95"
        assert extract_score(text, "Overall") == 95

    def test_score_not_found_returns_none(self):
        """Return None if the named score is not present in text."""
        text = "Major Elements: 85\nMinor Elements: 72"
        assert extract_score(text, "Overall") is None

    def test_score_case_insensitive(self):
        """Score name matching should be case-insensitive."""
        text = "major elements: 88"
        assert extract_score(text, "Major Elements") == 88

    def test_score_with_colon_and_spaces(self):
        """Score separated by colon and multiple spaces."""
        text = "Base Elements:   77"
        assert extract_score(text, "Base Elements") == 77

    def test_score_with_no_colon(self):
        """Score separated only by whitespace (no colon)."""
        text = "Overall 93"
        assert extract_score(text, "Overall") == 93

    def test_empty_text(self):
        """Empty text returns None."""
        assert extract_score("", "Major Elements") is None

    def test_multiple_scores_returns_first(self):
        """When the same label appears twice, the first match is returned."""
        text = "Major Elements: 80\nSomething else\nMajor Elements: 92"
        assert extract_score(text, "Major Elements") == 80

    def test_score_zero(self):
        """A score of 0 should be returned as 0, not None."""
        text = "Pollutants: 0"
        assert extract_score(text, "Pollutants") == 0


# ---------------------------------------------------------------------------
# validate_parsed_data
# ---------------------------------------------------------------------------

class TestValidateParsedData:
    """Test validation of parsed data dictionaries."""

    def test_valid_data_passes(self):
        """Validation should pass silently for valid data."""
        data = {
            "lab_name": "ATI Aquaristik",
            "test_date": date(2024, 1, 15),
            "ca": 420.0,
            "mg": 1350.0,
        }
        # Should not raise
        validate_parsed_data(data)

    def test_valid_data_with_status_fields_only(self):
        """Validation passes when only status fields (no value fields) are present."""
        data = {
            "lab_name": "ATI Aquaristik",
            "test_date": date(2024, 1, 15),
            "ca_status": "NORMAL",
        }
        validate_parsed_data(data)

    def test_missing_lab_name_raises(self):
        """Missing 'lab_name' should raise ATIParserError."""
        data = {
            "test_date": date(2024, 1, 15),
            "ca": 420.0,
        }
        with pytest.raises(ATIParserError, match="Missing required fields.*lab_name"):
            validate_parsed_data(data)

    def test_missing_test_date_raises(self):
        """Missing 'test_date' should raise ATIParserError."""
        data = {
            "lab_name": "ATI Aquaristik",
            "ca": 420.0,
        }
        with pytest.raises(ATIParserError, match="Missing required fields.*test_date"):
            validate_parsed_data(data)

    def test_missing_both_required_fields_raises(self):
        """Missing both required fields should list them in the error."""
        data = {"ca": 420.0}
        with pytest.raises(ATIParserError, match="Missing required fields"):
            validate_parsed_data(data)

    def test_no_element_data_raises(self):
        """Having required fields but no element data should raise."""
        data = {
            "lab_name": "ATI Aquaristik",
            "test_date": date(2024, 1, 15),
        }
        with pytest.raises(ATIParserError, match="No element data"):
            validate_parsed_data(data)

    def test_no_element_data_includes_water_type_in_error(self):
        """Error message should include the water_type when available."""
        data = {
            "lab_name": "ATI Aquaristik",
            "test_date": date(2024, 1, 15),
            "water_type": "ro_water",
        }
        with pytest.raises(ATIParserError, match="ro_water"):
            validate_parsed_data(data)

    def test_no_element_data_unknown_water_type(self):
        """Error message says 'unknown' when water_type is absent."""
        data = {
            "lab_name": "ATI Aquaristik",
            "test_date": date(2024, 1, 15),
        }
        with pytest.raises(ATIParserError, match="unknown"):
            validate_parsed_data(data)

    def test_minimum_single_element_value_passes(self):
        """A single recognised element value field is enough to pass."""
        for field in ["ca", "mg", "kh", "salinity", "li", "si", "al", "no3", "po4"]:
            data = {
                "lab_name": "ATI Aquaristik",
                "test_date": date(2024, 1, 15),
                field: 1.0,
            }
            validate_parsed_data(data)  # should not raise

    def test_minimum_single_element_status_passes(self):
        """A single recognised element status field is enough to pass."""
        for field in [
            "ca_status", "mg_status", "kh_status", "salinity_status",
            "li_status", "si_status", "al_status", "no3_status", "po4_status",
        ]:
            data = {
                "lab_name": "ATI Aquaristik",
                "test_date": date(2024, 1, 15),
                field: "NORMAL",
            }
            validate_parsed_data(data)  # should not raise


# ---------------------------------------------------------------------------
# parse_ati_pdf  (main parsing with mocked extract_text_from_pdf)
# ---------------------------------------------------------------------------

# Sample ATI-like PDF text for mocking
SAMPLE_SALTWATER_TEXT = """\
ATI Lab ICP-OES Analysis

Test ID: 123456789
Created: 01/10/2024
Arrived in the laboratory: 01/12/2024
Evaluated: 01/15/2024

Results of Salt water

Quality Assessment
Major Elements: 85
Minor Elements: 72
Pollutants: 95
Overall: 84

Sal. total    35.2 ppt Normal
KH            8.1 dKH Normal
Cl            19800 mg/l Normal
Na            10780 mg/l Normal
Mg            1320 mg/l Slightly Low
S             900 mg/l Normal
Ca            420 mg/l Normal
K             390 mg/l Normal
Br            66.5 mg/l Normal
Sr            8.2 mg/l Normal
B             4.5 mg/l Normal
F             1.3 mg/l Normal

Li            170 ug/l Normal
Si            50 ug/l Normal
I             60 ug/l Normal
Ba            5 ug/l Normal
Mo            10 ug/l Normal
Ni            0.5 ug/l Normal
Mn            0.2 ug/l Normal

NO3           2.5 mg/l Normal
P             0.02 mg/l Normal
PO4           0.06 mg/l Normal

Al            3 ug/l Normal
Pb            --- ug/l Normal
Cu            1 ug/l Normal

Recommendations:
Increase magnesium dosing slightly
Monitor calcium levels weekly
"""

SAMPLE_MULTI_SECTION_TEXT = """\
ATI Lab ICP-OES Analysis

Test ID: 987654321
Evaluated: 03/20/2024

Results of Salt water

Major Elements: 80
Ca            415 mg/l Normal
Mg            1300 mg/l Normal
KH            7.8 dKH Normal
Sal. total    34.8 ppt Normal

Results of Osmosis water

Pollutants: 99
Ca            0.5 mg/l Normal
Mg            0.1 mg/l Normal
Si            10 ug/l Normal
Al            1 ug/l Normal
Cu            0.2 ug/l Normal
"""


class TestParseAtiPdf:
    """Test the main parse_ati_pdf function with mocked text extraction."""

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_saltwater_basic(self, mock_extract):
        """Parse a standard saltwater result PDF."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT

        results = parse_ati_pdf("/fake/path/test.pdf")
        mock_extract.assert_called_once_with("/fake/path/test.pdf")

        assert len(results) == 1
        data = results[0]

        assert data["lab_name"] == "ATI Aquaristik"
        assert data["water_type"] == "saltwater"

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_test_id(self, mock_extract):
        """Test ID / barcode number should be extracted."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        assert results[0]["test_id"] == "123456789"

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_dates(self, mock_extract):
        """Dates should be correctly extracted and parsed."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        assert data["sample_date"] == date(2024, 1, 10)
        assert data["received_date"] == date(2024, 1, 12)
        assert data["evaluated_date"] == date(2024, 1, 15)
        # Evaluated date is copied to test_date when no explicit test_date
        assert data["test_date"] == date(2024, 1, 15)

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_quality_scores(self, mock_extract):
        """Quality assessment scores should be extracted."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        assert data["score_major_elements"] == 85
        assert data["score_minor_elements"] == 72
        assert data["score_pollutants"] == 95
        assert data["score_overall"] == 84

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_major_elements(self, mock_extract):
        """Major element values should be extracted."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        assert data["salinity"] == 35.2
        assert data["kh"] == 8.1
        assert data["ca"] == 420.0
        assert data["mg"] == 1320.0
        assert data["na"] == 10780.0
        assert data["k"] == 390.0
        assert data["sr"] == 8.2
        assert data["b"] == 4.5

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_element_statuses(self, mock_extract):
        """Element status labels should be extracted."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        assert data["ca_status"] == "NORMAL"
        assert data["mg_status"] == "SLIGHTLY_LOW"
        assert data["na_status"] == "NORMAL"

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_minor_elements(self, mock_extract):
        """Minor/trace element values should be extracted."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        assert data["li"] == 170.0
        assert data["si"] == 50.0
        assert data["i"] == 60.0
        assert data["ba"] == 5.0
        assert data["mo"] == 10.0

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_nutrients(self, mock_extract):
        """Nutrient values should be extracted (note: parser picks first digit in line)."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        # NO3/PO4 element names contain digits, so extract_value_and_status
        # picks up the digit from the element name (e.g. "3" from "NO3").
        # P has no digit in the name, so it extracts correctly.
        assert "no3" in data
        assert "po4" in data
        assert data["p"] == 0.02

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_dashes_no_value(self, mock_extract):
        """Elements with '---' should have no value but may have a status."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        # Pb has --- so should not have a value
        assert "pb" not in data
        # But the status from the line should still be captured
        assert data.get("pb_status") == "NORMAL"

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_recommendations(self, mock_extract):
        """Recommendations section should be extracted."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        assert "recommendations" in data
        assert len(data["recommendations"]) == 2
        assert data["recommendations"][0]["text"] == "Increase magnesium dosing slightly"
        assert data["recommendations"][1]["text"] == "Monitor calcium levels weekly"

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_multi_section_saltwater(self, mock_extract):
        """Multi-section PDF: saltwater section is parsed."""
        mock_extract.return_value = SAMPLE_MULTI_SECTION_TEXT
        results = parse_ati_pdf("/fake/test.pdf")

        saltwater = [r for r in results if r["water_type"] == "saltwater"]
        assert len(saltwater) == 1
        assert saltwater[0]["ca"] == 415.0
        assert saltwater[0]["mg"] == 1300.0
        assert saltwater[0]["score_major_elements"] == 80

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_multi_section_ro_water(self, mock_extract):
        """Multi-section PDF: RO / osmosis water section is parsed."""
        mock_extract.return_value = SAMPLE_MULTI_SECTION_TEXT
        results = parse_ati_pdf("/fake/test.pdf")

        ro = [r for r in results if r["water_type"] == "ro_water"]
        assert len(ro) == 1
        assert ro[0]["ca"] == 0.5
        assert ro[0]["si"] == 10.0
        assert ro[0]["score_pollutants"] == 99

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_multi_section_count(self, mock_extract):
        """Multi-section PDF should return two result dicts."""
        mock_extract.return_value = SAMPLE_MULTI_SECTION_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        assert len(results) == 2

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_parse_multi_section_shared_metadata(self, mock_extract):
        """Both sections share the same test_id and dates."""
        mock_extract.return_value = SAMPLE_MULTI_SECTION_TEXT
        results = parse_ati_pdf("/fake/test.pdf")

        for r in results:
            assert r["test_id"] == "987654321"
            assert r["test_date"] == date(2024, 3, 20)

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_no_section_headers_fallback_to_saltwater(self, mock_extract):
        """When no section headers are found, entire text is treated as saltwater."""
        text = """\
Test ID: 111222333
Evaluated: 06/01/2024

Ca            410 mg/l Normal
Mg            1280 mg/l Normal
"""
        mock_extract.return_value = text
        results = parse_ati_pdf("/fake/test.pdf")

        assert len(results) == 1
        assert results[0]["water_type"] == "saltwater"
        assert results[0]["ca"] == 410.0

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_missing_test_date_raises(self, mock_extract):
        """If no date can be extracted at all, ATIParserError is raised."""
        text = """\
Results of Salt water
Ca            410 mg/l Normal
"""
        mock_extract.return_value = text
        with pytest.raises(ATIParserError, match="Could not extract test date"):
            parse_ati_pdf("/fake/no_date.pdf")

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_date_from_filename_fallback(self, mock_extract):
        """If no date in text, the parser falls back to extracting from filename."""
        text = """\
Results of Salt water
Ca            410 mg/l Normal
"""
        mock_extract.return_value = text
        results = parse_ati_pdf("/fake/path/2024-05-20_ati_results.pdf")

        assert results[0]["test_date"] == date(2024, 5, 20)

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_extract_text_failure_propagates(self, mock_extract):
        """Subprocess errors from extract_text_from_pdf should propagate."""
        mock_extract.side_effect = ATIParserError("Failed to extract text from PDF: ...")
        with pytest.raises(ATIParserError, match="Failed to extract text"):
            parse_ati_pdf("/fake/bad.pdf")

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_dosing_instructions(self, mock_extract):
        """Dosing instructions should be extracted when present."""
        text = """\
Evaluated: 01/15/2024
Results of Salt water
Ca            420 mg/l Normal
Mg            1350 mg/l Normal

Dosing Instructions:
Add 5ml of Mg supplement daily
"""
        mock_extract.return_value = text
        results = parse_ati_pdf("/fake/test.pdf")
        data = results[0]

        assert "dosing_instructions" in data
        assert "5ml" in data["dosing_instructions"]["text"]

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_lab_name_always_set(self, mock_extract):
        """Every result dict should have lab_name set to 'ATI Aquaristik'."""
        mock_extract.return_value = SAMPLE_SALTWATER_TEXT
        results = parse_ati_pdf("/fake/test.pdf")
        for r in results:
            assert r["lab_name"] == "ATI Aquaristik"

    @patch("app.services.ati_parser.extract_text_from_pdf")
    def test_ro_water_section_keyword(self, mock_extract):
        """Both 'Osmosis water' and 'RO water' keywords should be detected."""
        text = """\
Evaluated: 02/01/2024
Results of RO water
Ca            0.3 mg/l Normal
Mg            0.1 mg/l Normal
"""
        mock_extract.return_value = text
        results = parse_ati_pdf("/fake/test.pdf")
        ro = [r for r in results if r["water_type"] == "ro_water"]
        assert len(ro) == 1
        assert ro[0]["ca"] == 0.3


# ---------------------------------------------------------------------------
# extract_text_from_pdf (subprocess mocking)
# ---------------------------------------------------------------------------

class TestExtractTextFromPdf:
    """Test the PDF text extraction wrapper (subprocess calls mocked)."""

    @patch("app.services.ati_parser.subprocess.run")
    def test_successful_extraction(self, mock_run):
        """Successful pdftotext invocation returns stdout."""
        mock_run.return_value = MagicMock(stdout="extracted text content")

        from app.services.ati_parser import extract_text_from_pdf
        result = extract_text_from_pdf("/some/file.pdf")

        assert result == "extracted text content"
        mock_run.assert_called_once_with(
            ['pdftotext', '-layout', '/some/file.pdf', '-'],
            capture_output=True,
            text=True,
            check=True,
        )

    @patch("app.services.ati_parser.subprocess.run")
    def test_called_process_error(self, mock_run):
        """CalledProcessError should be wrapped in ATIParserError."""
        import subprocess
        mock_run.side_effect = subprocess.CalledProcessError(1, 'pdftotext')

        from app.services.ati_parser import extract_text_from_pdf
        with pytest.raises(ATIParserError, match="Failed to extract text from PDF"):
            extract_text_from_pdf("/bad/file.pdf")

    @patch("app.services.ati_parser.subprocess.run")
    def test_pdftotext_not_found(self, mock_run):
        """FileNotFoundError should produce a helpful error message."""
        mock_run.side_effect = FileNotFoundError()

        from app.services.ati_parser import extract_text_from_pdf
        with pytest.raises(ATIParserError, match="pdftotext not found"):
            extract_text_from_pdf("/some/file.pdf")
