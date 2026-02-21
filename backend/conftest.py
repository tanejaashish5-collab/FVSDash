"""
Pytest configuration for backend tests.
Ensures the backend directory is in Python's path for imports.
"""
import sys
import os

# Add backend directory to path so 'main', 'db', 'services' etc. can be imported
sys.path.insert(0, os.path.dirname(__file__))
