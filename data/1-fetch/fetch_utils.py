"""Shared fetch utilities with retry and graceful fallback."""

from __future__ import annotations

import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable


def fetch_url(
    url: str,
    timeout: int = 60,
    retries: int = 3,
    backoff: float = 2.0,
    headers: dict | None = None,
) -> bytes | None:
    """Fetch raw bytes from URL with exponential backoff retries."""
    default_headers = {"User-Agent": "Mozilla/5.0"}
    if headers:
        default_headers.update(headers)

    last_error = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=default_headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except Exception as e:
            last_error = e
            if attempt < retries - 1:
                sleep_time = backoff * (2 ** attempt)
                print(f"  [WARN] Fetch attempt {attempt + 1}/{retries} failed for {url}: {e}. Retrying in {sleep_time:.0f}s...")
                time.sleep(sleep_time)
    print(f"  [ERROR] All {retries} fetch attempts failed for {url}: {last_error}")
    return None


def fetch_json(
    url: str,
    timeout: int = 60,
    retries: int = 3,
    backoff: float = 2.0,
    headers: dict | None = None,
) -> dict | None:
    """Fetch and parse JSON from URL with retries."""
    data = fetch_url(url, timeout=timeout, retries=retries, backoff=backoff, headers=headers)
    if data is None:
        return None
    try:
        return json.loads(data.decode("utf-8"))
    except Exception as e:
        print(f"  [ERROR] Failed to parse JSON from {url}: {e}")
        return None


def curl_fetch(
    url: str,
    extra_args: list[str] | None = None,
    timeout: int = 120,
    retries: int = 3,
    backoff: float = 2.0,
) -> bytes | None:
    """Fetch raw bytes using curl with retries."""
    cmd = ["curl", "-sL", "--max-time", str(timeout), url]
    if extra_args:
        cmd.extend(extra_args)

    last_error = None
    for attempt in range(retries):
        try:
            result = subprocess.run(cmd, capture_output=True, timeout=timeout + 10)
            if result.returncode == 0:
                return result.stdout
            last_error = f"curl exit {result.returncode}: {result.stderr.decode('utf-8', errors='ignore')[:200]}"
        except Exception as e:
            last_error = str(e)

        if attempt < retries - 1:
            sleep_time = backoff * (2 ** attempt)
            print(f"  [WARN] Curl attempt {attempt + 1}/{retries} failed for {url}: {last_error}. Retrying in {sleep_time:.0f}s...")
            time.sleep(sleep_time)

    print(f"  [ERROR] All {retries} curl attempts failed for {url}: {last_error}")
    return None


def write_json(path: Path, data: dict | list) -> None:
    """Write data to JSON file, creating parent dirs if needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_previous_raw(filename: str, output_dir: Path) -> dict | None:
    """Load previous raw data as fallback when fetch fails."""
    path = output_dir / filename
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"  [WARN] Failed to load previous {path}: {e}")
    return None


def fetch_with_fallback(
    fetcher: Callable[[], dict | None],
    fallback_path: Path,
    source_name: str,
) -> dict | None:
    """Try to fetch fresh data, fall back to cached file if available."""
    fresh = fetcher()
    if fresh is not None:
        return fresh

    print(f"  [WARN] {source_name} 抓取失败，尝试使用缓存数据...")
    cached = load_previous_raw(fallback_path.name, fallback_path.parent)
    if cached is not None:
        print(f"  [OK] {source_name} 使用缓存数据（{fallback_path}）")
        return cached

    print(f"  [ERROR] {source_name} 无缓存可用")
    return None
