"""
AWS Lambda default handler alias.
Ensures AWS Lambda can invoke either:
- lambda_handler.handler
- lambda_function.lambda_handler
- lambda_function.handler
"""
from lambda_handler import handler, handler as lambda_handler

__all__ = ["handler", "lambda_handler"]
