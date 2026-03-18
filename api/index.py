"""
DocuAgent — Vercel Serverless Entry Point
Maps to: api/index.py  →  handles all API routes on Vercel
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from server import app   # re-export the FastAPI app — Vercel picks it up as ASGI
