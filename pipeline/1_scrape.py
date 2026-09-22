"""Stage 1: cache public source files with robots and rate-limit checks.

This module deliberately has no project-specific source URLs. A future research
run supplies URLs explicitly, so an unavailable official site does not prevent
the static app from building.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, build_opener
from urllib.robotparser import RobotFileParser

Fetcher = Callable[[str, str, int], bytes]


def utc_timestamp() -> str:
    """Return a stable, human-readable UTC timestamp."""

    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def url_to_filename(url: str) -> str:
    """Create a deterministic cache filename without exposing URL characters."""

    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix not in {".pdf", ".html", ".htm", ".txt", ".json", ".xml"}:
        suffix = ".bin"
    return f"{digest}{suffix}"


def load_manifest(path: Path) -> list[dict[str, Any]]:
    """Load a manifest, treating a missing file as an empty manifest."""

    if not path.exists():
        return []
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError(f"Manifest must contain a JSON array: {path}")
    return value


def save_manifest(path: Path, entries: Iterable[dict[str, Any]]) -> None:
    """Write a byte-stable, URL-sorted manifest."""

    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(entries, key=lambda entry: str(entry.get("url", "")))
    path.write_text(
        json.dumps(ordered, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def robots_allowed(url: str, user_agent: str, timeout: int = 30) -> bool:
    """Return whether robots.txt permits fetching ``url``.

    Local fixture URLs do not have robots.txt and are allowed. If a remote
    robots file cannot be read, the source is treated as temporarily available;
    the failed fetch is still represented by the stage's manifest status.
    """

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return True
    origin = f"{parsed.scheme}://{parsed.netloc}"
    parser = RobotFileParser(f"{origin}/robots.txt")
    try:
        parser.read()
    except (OSError, TimeoutError):
        return True
    return parser.can_fetch(user_agent, url)


def fetch_url(url: str, user_agent: str, timeout: int) -> bytes:
    """Fetch one URL using a descriptive user agent."""

    request = Request(url, headers={"User-Agent": user_agent})
    opener = build_opener()
    with opener.open(request, timeout=timeout) as response:
        return response.read()


def scrape_urls(
    urls: Iterable[str],
    *,
    raw_dir: Path,
    manifest_path: Path,
    user_agent: str = "BetterLimayResearchBot/0.1 (+https://betterlimay.org)",
    min_delay: float = 1.0,
    timeout: int = 30,
    skip_robots: bool = False,
    fetcher: Fetcher | None = None,
) -> list[dict[str, Any]]:
    """Cache URLs and return the complete manifest.

    Existing URL entries whose cached file still exists are reused without
    opening a network connection. ``fetcher`` is injectable for offline tests.
    """

    raw_dir.mkdir(parents=True, exist_ok=True)
    existing = {str(entry.get("url")): entry for entry in load_manifest(manifest_path)}
    last_fetch = 0.0
    fetch = fetcher or fetch_url

    for url in sorted({value.strip() for value in urls if value.strip()}):
        previous = existing.get(url)
        if previous:
            cached_path = manifest_path.parent / str(previous.get("path", ""))
            if cached_path.exists() and previous.get("status") in {"fetched", "cached"}:
                continue

        if not skip_robots and not robots_allowed(url, user_agent, timeout):
            existing[url] = {
                "url": url,
                "status": "blocked_by_robots",
                "retrieved_at": utc_timestamp(),
                "path": "",
            }
            continue

        elapsed = time.monotonic() - last_fetch
        if last_fetch and elapsed < min_delay:
            time.sleep(min_delay - elapsed)
        try:
            content = fetch(url, user_agent, timeout)
            filename = url_to_filename(url)
            destination = raw_dir / filename
            destination.write_bytes(content)
            last_fetch = time.monotonic()
            existing[url] = {
                "url": url,
                "status": "fetched",
                "retrieved_at": utc_timestamp(),
                "path": destination.relative_to(manifest_path.parent).as_posix(),
                "sha256": hashlib.sha256(content).hexdigest(),
                "bytes": len(content),
            }
        except Exception as exc:  # noqa: BLE001 - record source failures, do not abort a batch
            existing[url] = {
                "url": url,
                "status": "error",
                "retrieved_at": utc_timestamp(),
                "path": "",
                "error": f"{type(exc).__name__}: {exc}",
            }

    result = list(existing.values())
    save_manifest(manifest_path, result)
    return sorted(result, key=lambda entry: str(entry.get("url", "")))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", action="append", default=[], help="Public URL; repeatable")
    parser.add_argument("--urls-file", type=Path, help="UTF-8 file with one URL per line")
    parser.add_argument("--raw-dir", type=Path, default=Path("pipeline/raw_data/pages"))
    parser.add_argument("--manifest", type=Path, default=Path("pipeline/raw_data/manifest.json"))
    parser.add_argument("--user-agent", default="BetterLimayResearchBot/0.1 (+https://betterlimay.org)")
    parser.add_argument("--min-delay", type=float, default=1.0)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--skip-robots", action="store_true", help="Only for local fixtures/tests")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    urls = list(args.url)
    if args.urls_file:
        if args.urls_file.exists():
            urls.extend(
                line.strip()
                for line in args.urls_file.read_text(encoding="utf-8").splitlines()
                if line.strip() and not line.lstrip().startswith("#")
            )
        else:
            print(f"URL file not found; continuing with no sources: {args.urls_file}")
    entries = scrape_urls(
        urls,
        raw_dir=args.raw_dir,
        manifest_path=args.manifest,
        user_agent=args.user_agent,
        min_delay=args.min_delay,
        timeout=args.timeout,
        skip_robots=args.skip_robots,
    )
    failures = [entry for entry in entries if entry.get("status") == "error"]
    print(f"Scrape manifest: {args.manifest} ({len(entries)} URL(s), {len(failures)} error(s))")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
