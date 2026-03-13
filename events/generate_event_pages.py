from __future__ import annotations

import argparse
import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Set


DIVISION_CONFIG: Dict[str, str] = {
    "b": "B2027.txt",
    "c": "C2027.txt",
}

EVENTS_JSON_FILENAME = "events.json"
DIVISION_LABELS = {
    "b": "B",
    "c": "C",
}

DEFAULT_EMPTY_EVENT_FIELDS: Dict[str, Any] = {
    "tags": [],
    "event-type": [],
    "event parameters": {},
    "event-category": "",
}


HTML_TEMPLATE = """<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\">
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
  <title>{title} | MSU Science Olympiad</title>
  
  <!-- Favicons -->
  <link rel=\"icon\" type=\"image/svg+xml\" href=\"/favicon.svg\">
  <link rel=\"icon\" type=\"image/x-icon\" sizes=\"32x32\" href=\"/favicon.ico\">
  <link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/favicon.png\">
  
  <link rel=\"stylesheet\" href=\"../../global.css\">
  <script type=\"module\" src=\"https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js\"></script>
  <script nomodule src=\"https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js\"></script>
  <script src=\"../../scripts/navigation.js\" defer></script>
  <script src=\"../../card.js\" defer></script>
</head>
<body>
    <msu-navbar page-links='[{{"href":"../../index.html#about","text":"About"}},{{"href":"../../index.html#events","text":"Events"}},{{"href":"../../resources.html","text":"Resources"}},{{"href":"../../index.html#contact","text":"Contact"}}]'></msu-navbar>

  <main class=\"section\">
    <div class=\"container\">
      <h1>{title}</h1>
      <!-- Event content to be added here -->
    </div>
  </main>

    <msu-footer page-links='[{{"href":"../../index.html#about","text":"About"}},{{"href":"../../index.html#events","text":"Events"}},{{"href":"../../index.html#events","text":"Resources"}},{{"href":"../../index.html#contact","text":"Contact"}}]'></msu-footer>
</body>
</html>
"""


@dataclass(frozen=True)
class EventDefinition:
    raw_line: str
    title: str
    slug: str

    @property
    def filename(self) -> str:
        return f"{self.slug}.html"


def normalize_event_title(line: str) -> str:
    """Strip division suffixes and normalize the display title."""
    base = line.split(" (", 1)[0].strip()
    return base.replace("&", "and")


def slugify_event_title(title: str) -> str:
    """Generate a stable, lowercase file slug from an event title."""
    slug = title.lower()
    slug = slug.replace("&", "and")
    slug = slug.replace("'", "")
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def parse_event_file(file_path: Path) -> List[EventDefinition]:
    definitions: List[EventDefinition] = []
    seen: Set[str] = set()

    for raw in file_path.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if not stripped:
            continue

        title = normalize_event_title(stripped)
        slug = slugify_event_title(title)

        if not slug:
            continue

        if slug in seen:
            raise ValueError(
                f"Duplicate event slug '{slug}' generated from line '{raw}' in {file_path.name}."
            )

        seen.add(slug)
        definitions.append(EventDefinition(raw_line=raw, title=title, slug=slug))

    return definitions


def unique_archive_target(archive_path: Path) -> Path:
    if not archive_path.exists():
        return archive_path

    stem = archive_path.stem
    suffix = archive_path.suffix
    counter = 1
    while True:
        candidate = archive_path.with_name(f"{stem}.dup{counter}{suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def render_event_html(title: str) -> str:
    return HTML_TEMPLATE.format(title=title)


def title_from_slug(slug: str) -> str:
    return " ".join(word.capitalize() for word in slug.split("-") if word)


def parse_existing_events_json(events_json_path: Path) -> tuple[Dict[str, Any], List[Dict[str, Any]], bool]:
    if not events_json_path.exists():
        return {"events": []}, [], True

    payload = json.loads(events_json_path.read_text(encoding="utf-8"))

    if isinstance(payload, list):
        entries = [entry for entry in payload if isinstance(entry, dict)]
        return {"events": payload}, entries, True

    if isinstance(payload, dict):
        raw_events = payload.get("events", [])
        if not isinstance(raw_events, list):
            raise ValueError("events.json has an 'events' field that is not a list.")
        entries = [entry for entry in raw_events if isinstance(entry, dict)]
        return payload, entries, False

    raise ValueError("events.json must be a JSON object or array.")


def normalize_division_array(value: Any) -> List[str]:
    allowed = {"B", "C"}

    if isinstance(value, str):
        found = []
        upper = value.upper()
        if "B" in upper:
            found.append("B")
        if "C" in upper:
            found.append("C")
        return found

    if isinstance(value, list):
        normalized: List[str] = []
        for item in value:
            if not isinstance(item, str):
                continue
            upper = item.upper().strip()
            if upper in allowed and upper not in normalized:
                normalized.append(upper)
        normalized.sort()
        return normalized

    return []


def normalize_event_type_array(value: Any) -> List[str]:
    """Normalize event-type into a lowercase string list for one or more types."""
    if isinstance(value, list):
        normalized: List[str] = []
        for item in value:
            if not isinstance(item, str):
                continue
            item_value = item.strip().lower()
            if item_value and item_value not in normalized:
                normalized.append(item_value)
        return normalized

    if isinstance(value, str):
        return [
            item
            for item in re.split(r"[,/|+]", value.strip().lower())
            if item
        ]

    return []


def set_default_empty_fields(event_entry: Dict[str, Any]) -> None:
    for field_name, default_value in DEFAULT_EMPTY_EVENT_FIELDS.items():
        if field_name in event_entry:
            continue
        if isinstance(default_value, list):
            event_entry[field_name] = []
        elif isinstance(default_value, dict):
            event_entry[field_name] = {}
        else:
            event_entry[field_name] = default_value


def collect_event_definitions(base_dir: Path) -> Dict[str, Dict[str, EventDefinition]]:
    per_division: Dict[str, Dict[str, EventDefinition]] = {}

    for division, event_file in DIVISION_CONFIG.items():
        definitions = parse_event_file(base_dir / event_file)
        per_division[division] = {definition.slug: definition for definition in definitions}

    return per_division


def collect_division_file_stems(base_dir: Path, division: str, folder_name: str) -> Set[str]:
    target_dir = base_dir / division / folder_name if folder_name else base_dir / division
    if not target_dir.exists():
        return set()
    return {
        file_path.stem
        for file_path in target_dir.glob("*.html")
        if file_path.is_file()
    }


def update_events_json(base_dir: Path, dry_run: bool = False) -> None:
    event_definitions = collect_event_definitions(base_dir)

    active_by_division: Dict[str, Set[str]] = {}
    archive_by_division: Dict[str, Set[str]] = {}
    for division in DIVISION_CONFIG:
        active_by_division[division] = collect_division_file_stems(base_dir, division, "")
        archive_by_division[division] = collect_division_file_stems(base_dir, division, "archive")

    events_json_path = base_dir / EVENTS_JSON_FILENAME
    container, existing_entries, was_top_level_list = parse_existing_events_json(events_json_path)

    existing_by_slug: Dict[str, Dict[str, Any]] = {}
    extra_existing_entries: List[Dict[str, Any]] = []

    for entry in existing_entries:
        raw_name = entry.get("name")
        slug = slugify_event_title(raw_name) if isinstance(raw_name, str) else ""
        if not slug:
            extra_existing_entries.append(entry)
            continue
        if slug in existing_by_slug:
            extra_existing_entries.append(entry)
            continue
        existing_by_slug[slug] = entry

    all_slugs: Set[str] = set(existing_by_slug.keys())
    for division in DIVISION_CONFIG:
        all_slugs.update(event_definitions[division].keys())
        all_slugs.update(active_by_division[division])
        all_slugs.update(archive_by_division[division])

    merged_events: List[Dict[str, Any]] = []
    for slug in sorted(all_slugs):
        existing = dict(existing_by_slug.get(slug, {}))

        inferred_name = None
        for division in DIVISION_CONFIG:
            definition = event_definitions[division].get(slug)
            if definition is not None:
                inferred_name = definition.title
                break

        existing_name = existing.get("name")
        final_name = inferred_name or (existing_name if isinstance(existing_name, str) and existing_name.strip() else title_from_slug(slug))

        inferred_divisions: Set[str] = set()
        for division in DIVISION_CONFIG:
            label = DIVISION_LABELS.get(division, division.upper())
            if (
                slug in event_definitions[division]
                or slug in active_by_division[division]
                or slug in archive_by_division[division]
            ):
                inferred_divisions.add(label)

        if inferred_divisions:
            final_divisions = sorted(inferred_divisions)
        else:
            final_divisions = normalize_division_array(existing.get("division"))

        is_active = any(slug in active_by_division[division] for division in DIVISION_CONFIG)

        existing["name"] = final_name
        existing["active"] = is_active
        existing["division"] = final_divisions
        existing["event-type"] = normalize_event_type_array(existing.get("event-type"))

        set_default_empty_fields(existing)
        merged_events.append(existing)

    merged_events.extend(extra_existing_entries)
    merged_events.sort(key=lambda event: str(event.get("name", "")).casefold())

    if was_top_level_list:
        output_obj: Any = merged_events
    else:
        output_obj = dict(container)
        output_obj["events"] = merged_events

    new_content = json.dumps(output_obj, indent=2, ensure_ascii=True) + "\n"
    old_content = events_json_path.read_text(encoding="utf-8") if events_json_path.exists() else None

    print(f"\n[JSON] Sync {EVENTS_JSON_FILENAME}")
    if old_content == new_content:
        print("  keep    events.json")
        return

    if dry_run:
        action = "create" if old_content is None else "update"
        print(f"  {action}  events.json ({len(merged_events)} events)")
        return

    events_json_path.write_text(new_content, encoding="utf-8")
    action = "created" if old_content is None else "updated"
    print(f"  {action} events.json ({len(merged_events)} events)")


def sync_division(base_dir: Path, division: str, event_list_file: str, dry_run: bool = False) -> None:
    division_dir = base_dir / division
    archive_dir = division_dir / "archive"
    event_file = base_dir / event_list_file

    if not event_file.exists():
        raise FileNotFoundError(f"Missing event list file: {event_file}")

    events = parse_event_file(event_file)
    desired_by_filename: Dict[str, EventDefinition] = {event.filename: event for event in events}
    desired_filenames: Set[str] = set(desired_by_filename.keys())

    division_dir.mkdir(parents=True, exist_ok=True)
    archive_dir.mkdir(parents=True, exist_ok=True)

    existing_active: Set[str] = {
        path.name
        for path in division_dir.glob("*.html")
        if path.is_file()
    }

    existing_archive: Set[str] = {
        path.name
        for path in archive_dir.glob("*.html")
        if path.is_file()
    }

    print(f"\n[{division.upper()}] Sync from {event_file.name}")

    for filename in sorted(desired_filenames):
        active_path = division_dir / filename
        archive_path = archive_dir / filename
        event = desired_by_filename[filename]

        if filename in existing_active:
            print(f"  keep    {filename}")
            continue

        if filename in existing_archive:
            print(f"  restore {filename} from archive")
            if not dry_run:
                shutil.move(str(archive_path), str(active_path))
            continue

        print(f"  create  {filename}")
        if not dry_run:
            active_path.write_text(render_event_html(event.title), encoding="utf-8")

    obsolete_active = sorted(existing_active - desired_filenames)

    for filename in obsolete_active:
        source_path = division_dir / filename
        archive_target = archive_dir / filename
        if archive_target.exists():
            archive_target = unique_archive_target(archive_target)

        print(f"  archive {filename} -> {archive_target.name}")
        if not dry_run:
            shutil.move(str(source_path), str(archive_target))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync event HTML pages from B/C event list text files."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned actions without changing files.",
    )
    parser.add_argument(
        "--division",
        choices=sorted(DIVISION_CONFIG.keys()),
        nargs="*",
        help="Optional subset of divisions to sync (default: all).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_dir = Path(__file__).resolve().parent
    divisions = args.division if args.division else sorted(DIVISION_CONFIG.keys())

    for division in divisions:
        sync_division(
            base_dir=base_dir,
            division=division,
            event_list_file=DIVISION_CONFIG[division],
            dry_run=args.dry_run,
        )

    update_events_json(base_dir=base_dir, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
