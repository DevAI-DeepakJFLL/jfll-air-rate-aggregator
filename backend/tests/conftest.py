import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_tariffs():
    return [
        {
            "origin": "BOM",
            "destination": "DXB",
            "airline": "Air India",
            "carrier_code": "AI",
            "prefix": "098",
            "rate_basis": "NET_NET_PLUS_PLUS",
            "min_charge": 3500.0,
            "rate_normal": 250.0,
            "rate_45": 200.0,
            "rate_100": 170.0,
            "rate_250": 145.0,
            "rate_300": 130.0,
            "fsc_per_kg": 20.0,
            "fsc_min": 3500.0,
            "ssc_per_kg": 3.5,
            "ssc_min": 500.0,
        },
        {
            "origin": "BOM",
            "destination": "ORD",
            "airline": "Etihad Airways",
            "carrier_code": "EY",
            "prefix": "607",
            "rate_basis": "NET_NET_PLUS_PLUS",
            "min_charge": 18165.0,
            "rate_normal": 852.0,
            "rate_45": 762.0,
            "rate_100": 686.0,
            "rate_250": 614.0,
            "rate_300": 590.0,
            "fsc_per_kg": 45.0,
            "fsc_min": 4500.0,
            "ssc_per_kg": 5.0,
            "ssc_min": 800.0,
        }
    ]
