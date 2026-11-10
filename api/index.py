"""
Vercel Serverless Function entry point for CodeMentor AI (FastAPI backend).
"""

import os
import sys

# Add backend directory to sys.path so all backend modules import seamlessly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app

