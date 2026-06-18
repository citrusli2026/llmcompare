"""
文本处理工具 — 单一来源

供 build_frontend_models.py / enrich_models.py 共用。
"""

import re


def clean_name(name: str) -> str:
    """去掉末尾括号内的变体后缀，如 (Max)、(High)、(xhigh)、(Feb 2026)"""
    return re.sub(r'\s*\([^)]+\)\s*$', '', name).strip() if name else name
