"""
AWS Lambda entrypoint for Jet Freight Logistics Rate Aggregator FastAPI backend.
Uses Mangum ASGI adapter to run FastAPI seamlessly on AWS Lambda with Function URLs.
Strips duplicate CORS headers to prevent modern browsers from failing preflight/CORS checks.
"""
from mangum import Mangum
from app.main import app

# Initialize underlying Mangum handler for AWS Lambda (lifespan="off" ensures clean cold-starts on serverless)
_mangum_handler = Mangum(app, lifespan="off")


def handler(event, context):
    """
    Lambda invocation entrypoint.
    Executes FastAPI via Mangum and sanitizes response headers.
    When AWS Lambda Function URL has CORS enabled, AWS injects its own
    Access-Control-Allow-Origin header. If FastAPI/Mangum also returns one,
    the browser receives duplicate 'Access-Control-Allow-Origin: *, *' headers,
    which causes all modern browsers (Chrome, Safari, Firefox, Edge) to reject
    the response with 'Failed to fetch'.
    """
    response = _mangum_handler(event, context)

    if isinstance(response, dict) and "headers" in response:
        headers = response["headers"]
        # Remove any access-control-* headers produced by FastAPI/Starlette
        for key in list(headers.keys()):
            if key.lower().startswith("access-control-"):
                del headers[key]

    return response
