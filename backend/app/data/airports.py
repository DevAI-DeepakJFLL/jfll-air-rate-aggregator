"""
Static Airport & Airline Schedule Reference Data.
Maps IATA 3-letter airport codes to ISO 2-letter country codes,
along with country aliases and standard hub operational flight schedules ex-BOM.
"""

from typing import Dict, Any, Optional, Set

# Airport IATA Code to ISO Country Code Mapping for Corridor Evaluation
AIRPORT_TO_COUNTRY: Dict[str, str] = {
    # United States
    "JFK": "US", "ORD": "US", "LAX": "US", "MIA": "US", "SFO": "US",
    "ATL": "US", "DFW": "US", "BOS": "US", "IAD": "US", "IAH": "US",
    "SEA": "US", "EWR": "US", "DTW": "US", "MSP": "US", "PHL": "US",
    "CLT": "US", "DEN": "US", "LAS": "US", "MCO": "US", "PHX": "US",
    # Canada
    "YYZ": "CA", "YVR": "CA", "YUL": "CA", "YYC": "CA", "YEG": "CA", "YOW": "CA", "YHZ": "CA",
    # United Kingdom
    "LHR": "GB", "LGW": "GB", "MAN": "GB", "EDI": "GB", "BHX": "GB", "GLA": "GB", "STN": "GB", "LTN": "GB",
    # United Arab Emirates
    "DXB": "AE", "AUH": "AE", "SHJ": "AE", "DWC": "AE",
    # Middle East
    "DOH": "QA",
    "MCT": "OM", "SLL": "OM",
    "KWI": "KW",
    "BAH": "BH",
    "RUH": "SA", "JED": "SA", "DMM": "SA", "MED": "SA",
    "AMM": "JO", "BEY": "LB",
    # Europe
    "FRA": "DE", "MUC": "DE", "BER": "DE", "HAM": "DE", "DUS": "DE",
    "CDG": "FR", "ORY": "FR", "NCE": "FR", "LYS": "FR",
    "AMS": "NL",
    "BRU": "BE",
    "MXP": "IT", "FCO": "IT",
    "MAD": "ES", "BCN": "ES",
    "ZRH": "CH", "GVA": "CH",
    "VIE": "AT",
    "DUB": "IE",
    "CPH": "DK",
    "WAW": "PL",
    "IST": "TR",
    "LIS": "PT",
    "ATH": "GR",
    # Asia-Pacific
    "SIN": "SG",
    "BKK": "TH", "HKT": "TH",
    "KUL": "MY",
    "NRT": "JP", "HND": "JP", "KIX": "JP",
    "ICN": "KR",
    "HKG": "HK",
    "PVG": "CN", "PEK": "CN", "PKX": "CN", "CAN": "CN", "SZX": "CN",
    "SYD": "AU", "MEL": "AU", "BNE": "AU", "PER": "AU",
    "BOM": "IN", "DEL": "IN", "BLR": "IN", "MAA": "IN", "HYD": "IN", "CCU": "IN", "COK": "IN", "AMD": "IN",
    "CMB": "LK", "MLE": "MV",
    "CGK": "ID", "DPS": "ID", "KNO": "ID", "KTI": "ID",
    "MNL": "PH",
    # Africa
    "JNB": "ZA", "CPT": "ZA",
    "NBO": "KE",
    "ADD": "ET",
    "CAI": "EG",
    "CMN": "MA",
    "SEZ": "SC",
}

COUNTRY_ALIASES: Dict[str, Set[str]] = {
    "US": {"US", "USA", "UNITED STATES"},
    "CA": {"CA", "CAN", "CANADA"},
    "GB": {"GB", "UK", "GBR", "UNITED KINGDOM"},
    "AE": {"AE", "UAE", "ARE", "UNITED ARAB EMIRATES"},
    "SA": {"SA", "KSA", "SAU", "SAUDI ARABIA"},
    "DE": {"DE", "DEU", "GERMANY"},
    "FR": {"FR", "FRA", "FRANCE"},
    "NL": {"NL", "NLD", "NETHERLANDS"},
    "IN": {"IN", "IND", "INDIA"},
    "SG": {"SG", "SGP", "SINGAPORE"},
    "MY": {"MY", "MYS", "MALAYSIA"},
    "QA": {"QA", "QAT", "QATAR"},
    "OM": {"OM", "OMN", "OMAN"},
    "KW": {"KW", "KWT", "KUWAIT"},
    "BH": {"BH", "BHR", "BAHRAIN"},
    "JP": {"JP", "JPN", "JAPAN"},
    "CN": {"CN", "CHN", "CHINA"},
    "AU": {"AU", "AUS", "AUSTRALIA"},
}

# Pre-computed frozensets for O(1) set operations
COUNTRY_AND_ALIASES: Dict[str, frozenset] = {
    k: frozenset({k} | v) for k, v in COUNTRY_ALIASES.items()
}


def get_country_for_airport(airport_code: str) -> Optional[str]:
    """Returns ISO country code for common airport IATA codes."""
    if not airport_code:
        return None
    return AIRPORT_TO_COUNTRY.get(airport_code.upper().strip())


AIRLINE_SCHEDULES: Dict[str, Dict[str, Any]] = {
    'EK': {'flight': 'EK-505', 'departure': '10:10 IST', 'arrival': '11:55 GST', 'transit': 'Direct Flight (3h 15m)', 'cutoff': '05:30 IST'},
    'AI': {'flight': 'AI-995', 'departure': '17:05 IST', 'arrival': '19:00 GST', 'transit': 'Direct Flight (3h 25m)', 'cutoff': '11:30 IST'},
    '6E': {'flight': '6E-1453', 'departure': '19:20 IST', 'arrival': '21:10 GST', 'transit': 'Direct Flight (3h 20m)', 'cutoff': '13:30 IST'},
    'EY': {'flight': 'EY-205', 'departure': '04:20 IST', 'arrival': '09:30 GST', 'transit': 'Connecting via AUH (5h 10m)', 'cutoff': '22:00 IST (-1d)'},
    'WY': {'flight': 'WY-202', 'departure': '09:40 IST', 'arrival': '15:15 GST', 'transit': 'Connecting via MCT (5h 35m)', 'cutoff': '04:30 IST'},
    'ET': {'flight': 'ET-641', 'departure': '11:05 IST', 'arrival': '22:40 GST', 'transit': 'Connecting via ADD (11h 35m)', 'cutoff': '05:00 IST'},
    'QR': {'flight': 'QR-557', 'departure': '04:10 IST', 'arrival': '10:30 GST', 'transit': 'Connecting via DOH (6h 20m)', 'cutoff': '22:00 IST (-1d)'},
    'D7': {'flight': 'D7-183', 'departure': '23:00 IST', 'arrival': '15:20 CST (+1)', 'transit': 'Connecting via KUL (13h 50m)', 'cutoff': '17:00 IST'},
    'MH': {'flight': 'MH-195', 'departure': '23:25 IST', 'arrival': '15:35 CST (+1)', 'transit': 'Connecting via KUL (13h 40m)', 'cutoff': '17:30 IST'},
    'SV': {'flight': 'SV-773', 'departure': '07:30 IST', 'arrival': '15:45 GST', 'transit': 'Connecting via RUH (8h 15m)', 'cutoff': '02:00 IST'},
}
