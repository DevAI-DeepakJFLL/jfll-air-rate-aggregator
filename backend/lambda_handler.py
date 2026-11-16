"""
AWS Lambda entrypoint for Jet Freight Logistics Rate Aggregator FastAPI backend.
Uses Mangum ASGI adapter to run FastAPI seamlessly on AWS Lambda with Function URLs.
"""
from mangum import Mangum
from app.main import app

# Initialize Mangum handler for AWS Lambda (lifespan="off" ensures clean cold-starts on serverless)
handler = Mangum(app, lifespan="off")
