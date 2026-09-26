"""Bounded public GET audit. Never calls ingest, admin, view or provider endpoints."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

BASE = "https://allball-backend-production.up.railway.app"
OUT = Path("evidence/news-public-readonly.json")
NOW = datetime.now(timezone.utc)
report = {"observed_at": NOW.isoformat(), "mode": "public GET only; no writes or ingestion", "requests": [], "lists": {}, "details": []}


def read(path):
    assert path.startswith(("/articles", "/portal/home")) and "/view" not in path
    request = Request(BASE + path, headers={"User-Agent": "NinkoSports-News-ReadOnly-QA/1.0", "Accept": "application/json"}, method="GET")
    record = {"path": path}
    report["requests"].append(record)
    try:
        with urlopen(request, timeout=20) as response:
            record["status"] = response.status
            raw = response.read(3_000_001)
            if len(raw) > 3_000_000:
                raise ValueError("response exceeds audit size limit")
            data = json.loads(raw)
            record["ok"] = True
            return data
    except (HTTPError, URLError, ValueError, TimeoutError, OSError) as error:
        record.update(ok=False, error=str(error)[:250])
        if isinstance(error, HTTPError):
            record["status"] = error.code
        return None


def stories(value, depth=0):
    if depth > 12:
        return []
    if isinstance(value, list):
        return [row for item in value for row in stories(item, depth + 1)]
    if isinstance(value, dict):
        if isinstance(value.get("slug"), str) and isinstance(value.get("title"), str):
            return [value]
        return [row for item in value.values() if isinstance(item, (dict, list)) for row in stories(item, depth + 1)]
    return []


def age_hours(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return None  # Do not silently invent a timezone for source dates.
        return round((NOW - parsed).total_seconds() / 3600, 2)
    except ValueError:
        return None


def metadata(row):
    image = row.get("image_url")
    return {
        "id": row.get("id"), "slug": row.get("slug"), "title": row.get("title"),
        "sport": row.get("sport"), "league": row.get("league"),
        "published_at": row.get("published_at"), "created_at": row.get("created_at"),
        "publication_age_hours": age_hours(row.get("published_at")),
        "creation_age_hours": age_hours(row.get("created_at")),
        "image_present": bool(isinstance(image, str) and image.strip()),
        "image_host": urlparse(image).hostname if isinstance(image, str) else None,
    }


for name, path in [("articles", "/articles?limit=20"), ("recent", "/articles/recent?limit=12"), ("home", "/portal/home")]:
    data = read(path)
    rows = stories(data)
    unique = {row["slug"]: row for row in rows}
    report["lists"][name] = {
        "response_available": data is not None,
        "placements": len(rows), "unique_slugs": len(unique),
        "without_image": sum(not metadata(row)["image_present"] for row in unique.values()),
        "rows": [metadata(row) for row in unique.values()],
    }

candidates = report["lists"]["articles"]["rows"][:3]
for candidate in candidates:
    slug = candidate["slug"]
    data = read("/articles/" + quote(slug, safe=""))
    if not isinstance(data, dict):
        continue
    content = data.get("content") if isinstance(data.get("content"), str) else ""
    blocks = data.get("blocks") if isinstance(data.get("blocks"), list) else []
    block_text = "\n".join(block.get("text", "") for block in blocks if isinstance(block, dict) and isinstance(block.get("text"), str))
    text = block_text or content
    related = stories(read("/articles/" + quote(slug, safe="") + "/related?limit=6"))
    report["details"].append({
        **metadata(data), "requested_slug": slug,
        "identity_matches_list": data.get("slug") == slug and data.get("id") == candidate.get("id"),
        "title_matches_list": data.get("title") == candidate.get("title"),
        "content_words": len(re.findall(r"\b[\w'-]+\b", content)),
        "block_text_words": len(re.findall(r"\b[\w'-]+\b", block_text)),
        "block_count": len(blocks), "has_readable_text": bool(text.strip()),
        "truncation_marker": bool(re.search(r"\[\+\s*\d+\s*chars?\]", text, re.I)),
        "related_count": len(related),
        "related_other_known_sport": [row["slug"] for row in related if row.get("sport") and data.get("sport") and row["sport"] != data["sport"]],
    })

report["limitations"] = [
    "Sample only; not worldwide or full News completion.",
    "Image URL presence is not proof that the image loads or may be reused.",
    "No provider freshness, article factuality, rights, ingestion or scheduler diagnosis is inferred from this read-only sample.",
    "No production writes, view-count POSTs, DB resets, AI calls, or Railway operations were performed by this script.",
]
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
print("NEWS_PUBLIC_READONLY_REPORT_START")
print(json.dumps(report, indent=2, ensure_ascii=False))
print("NEWS_PUBLIC_READONLY_REPORT_END")
