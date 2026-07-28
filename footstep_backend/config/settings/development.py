"""
Development settings for FootStep backend.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# CORS — allow all in development
CORS_ALLOW_ALL_ORIGINS = True
