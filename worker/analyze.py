"""
Badminton analysis worker.

Flow
----
1. Polls Supabase for videos with status = 'uploaded'.
2. Downloads the clip from Storage.
3. Extracts movement metrics:
      - REAL computer vision (YOLOv8-pose) if the CV stack is installed (Py 3.12), or
      - placeholder metrics as a fallback (e.g. the Py 3.14 stub env).
4. Turns metrics into a coaching report:
      - Claude, if ANTHROPIC_API_KEY is set, or
      - a rule-based generator that reads the real numbers.
5. Writes summary + findings back and marks the video 'done'.

Run:  python analyze.py
"""

import json
import os
import tempfile
import time
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client

# Real CV is optional — the worker still runs (stub metrics) without it.
try:
    from cv_analyze import extract_metrics, gpu_info
    CV_AVAILABLE = True
    CV_IMPORT_ERROR = None
except Exception as e:  # noqa: BLE001
    CV_AVAILABLE = False
    CV_IMPORT_ERROR = e

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL_SECONDS", "5"))
MODEL = "claude-sonnet-5"
MODEL_VERSION = "cv-yolov8n-pose-v2" if CV_AVAILABLE else "stub-0.1"

sb: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ---------------------------------------------------------------------------
# Placeholder metrics — only used when the CV stack isn't installed.
# ---------------------------------------------------------------------------
def fake_metrics() -> dict:
    return {
        "source": "stub",
        "players": {
            "near": {
                "court_coverage_pct": {"front": 22, "mid": 41, "rear": 37},
                "lateral_balance_pct": {"left": 58, "right": 42},
                "total_distance_m": 512,
            },
            "far": {
                "court_coverage_pct": {"front": 15, "mid": 38, "rear": 47},
                "lateral_balance_pct": {"left": 47, "right": 53},
                "total_distance_m": 604,
            },
        },
    }


def download_video(storage_path: str) -> str:
    """Download a clip from the 'videos' bucket to a temp file; return its path."""
    data = sb.storage.from_("videos").download(storage_path)
    ext = os.path.splitext(storage_path)[1] or ".mp4"
    fd, path = tempfile.mkstemp(suffix=ext)
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    return path


# ---------------------------------------------------------------------------
# Rule-based report — derives findings from the ACTUAL numbers.
# Used when there's no Claude key (and as the shape Claude also fills).
# ---------------------------------------------------------------------------
def heuristic_report(metrics: dict) -> dict:
    players = metrics.get("players", {})
    if not players:
        return {
            "summary": "Couldn't reliably detect two players in this clip. For best "
                       "results use an end-on view (camera behind the court) where both "
                       "players are clearly visible.",
            "findings": [],
        }

    entries = list(players.values())
    findings: list[dict] = []

    for e in entries:
        label = e.get("label", "Player")
        role = e.get("role", "All-court player")
        side = e.get("side", "")
        cov = e.get("court_coverage_pct", {})
        workload = e.get("workload", "medium")

        if role.startswith("Back-court"):
            findings.append({
                "side": side, "category": "positioning", "kind": "weakness", "severity": 3,
                "title": f"{label} stays too deep",
                "detail": f"{label} spends almost the whole rally at the back of the court and "
                          "rarely moves up. Opponents can pull them forward with drop shots and "
                          "net play they won't reach in time. Work on: faster forward movement "
                          "and reading the drop earlier.",
                "evidence": {"role": role, "court_coverage_pct": cov},
            })
        elif role.startswith("Net"):
            findings.append({
                "side": side, "category": "positioning", "kind": "weakness", "severity": 3,
                "title": f"{label} camps at the net",
                "detail": f"{label} owns the front court but gets caught out when the shuttle is "
                          "lifted over their head. Opponents will clear to the back to exploit it. "
                          "Work on: covering the lift and recovering to the backcourt.",
                "evidence": {"role": role, "court_coverage_pct": cov},
            })
        elif role.startswith("All-court") and workload == "high":
            findings.append({
                "side": side, "category": "workload", "kind": "weakness", "severity": 3,
                "title": f"{label} is doing too much of the running",
                "detail": f"{label} covers the whole court and runs more than anyone else — usually "
                          "a sign of being moved around or covering for a partner. Risk of tiring "
                          "late in matches. Work on: tighter positioning and sharing the court "
                          "with the partner.",
                "evidence": {"role": role, "workload": workload},
            })
        else:
            findings.append({
                "side": side, "category": "positioning", "kind": "strength", "severity": 2,
                "title": f"{label} moves well",
                "detail": f"{label} ({role.lower()}) covers the court well with no obvious "
                          "positional weakness in this passage of play.",
                "evidence": {"role": role, "court_coverage_pct": cov},
            })

    busiest = entries[0].get("label", "Player 1") if entries else "Player 1"
    weaknesses = [f for f in findings if f["kind"] == "weakness"]
    summary = f"{busiest} is doing the most running on court. "
    if weaknesses:
        summary += "Biggest things to work on: " + "; ".join(
            f["title"] for f in weaknesses[:3]) + "."
    else:
        summary += "Both pairs are positionally solid in this clip."

    return {"summary": summary, "findings": findings}


# ---------------------------------------------------------------------------
# Claude turns the (real) metrics into a coaching report; falls back to rules.
# ---------------------------------------------------------------------------
def build_report(metrics: dict) -> dict:
    if not ANTHROPIC_API_KEY:
        return heuristic_report(metrics)

    from anthropic import Anthropic

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    prompt = (
        "You are a professional badminton performance analyst. Below are objective "
        "movement metrics extracted from one match video (players keyed by 'near'/'far' "
        "court side).\n\n"
        f"METRICS:\n{json.dumps(metrics, indent=2)}\n\n"
        "Identify each player's key weaknesses (and a strength if clear), grounded ONLY "
        "in these numbers. Respond with STRICT JSON only, no prose:\n"
        '{"summary": "<2-3 sentences>", "findings": [{'
        '"side": "near|far", "category": "footwork|backhand|net_play|defense|attack|'
        'consistency", "kind": "weakness|strength", "severity": 1-5, '
        '"title": "<short>", "detail": "<one sentence citing the metric>", '
        '"evidence": {<relevant metric keys/values>}}]}'
    )

    msg = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1].lstrip("json").strip()
    return json.loads(text)


# ---------------------------------------------------------------------------
# Process a single video row end-to-end.
# ---------------------------------------------------------------------------
def process_video(video: dict) -> None:
    vid = video["id"]
    coach_id = video["coach_id"]
    print(f"  -> processing video {vid}")

    sb.table("videos").update({"status": "processing"}).eq("id", vid).execute()

    analysis_id = str(uuid.uuid4())
    sb.table("analyses").insert({
        "id": analysis_id,
        "video_id": vid,
        "coach_id": coach_id,
        "status": "processing",
        "model_version": MODEL_VERSION,
    }).execute()

    temp_path = None
    try:
        if CV_AVAILABLE:
            temp_path = download_video(video["storage_path"])
            print("     running pose analysis…")
            metrics = extract_metrics(temp_path, corners=video.get("court_corners"))
        else:
            metrics = fake_metrics()

        # Save a reference frame so the coach can tap the court corners in the app.
        ref = metrics.pop("_ref_frame", None)
        if ref:
            fpath = f"{coach_id}/frames/{vid}.jpg"
            try:
                sb.storage.from_("videos").upload(
                    fpath, ref, {"content-type": "image/jpeg", "upsert": "true"})
                sb.table("videos").update(
                    {"reference_frame_path": fpath}).eq("id", vid).execute()
            except Exception as fe:  # noqa: BLE001
                print(f"     ref frame upload failed: {fe}")

        # Upload each player's ID-photo (clearest crop) to Storage.
        for key, p in metrics.get("players", {}).items():
            thumb = p.pop("_thumb", None)
            if not thumb:
                continue
            tpath = f"{coach_id}/thumbs/{analysis_id}_{key}.jpg"
            try:
                sb.storage.from_("videos").upload(
                    tpath, thumb,
                    {"content-type": "image/jpeg", "upsert": "true"},
                )
                p["thumb_path"] = tpath
            except Exception as te:  # noqa: BLE001
                print(f"     thumb upload failed ({key}): {te}")

        report = build_report(metrics)

        sb.table("analyses").update({
            "status": "done",
            "metrics": metrics,
            "summary": report.get("summary", ""),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", analysis_id).execute()

        findings = report.get("findings", [])
        for f in findings:
            f["analysis_id"] = analysis_id
            f["coach_id"] = coach_id
        if findings:
            sb.table("findings").insert(findings).execute()

        sb.table("videos").update({"status": "done"}).eq("id", vid).execute()
        print(f"     done: {len(findings)} findings")

    except Exception as e:  # noqa: BLE001
        print(f"     FAILED: {e}")
        sb.table("analyses").update({"status": "failed"}).eq("id", analysis_id).execute()
        sb.table("videos").update(
            {"status": "failed", "error_message": str(e)[:500]}
        ).eq("id", vid).execute()
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


def main() -> None:
    if CV_AVAILABLE:
        print(f"Worker started (REAL CV: {gpu_info()}). Polling every {POLL_INTERVAL}s. "
              f"Claude: {'ON' if ANTHROPIC_API_KEY else 'OFF (rule-based report)'}")
    else:
        print(f"Worker started (STUB metrics — CV stack not installed). "
              f"Polling every {POLL_INTERVAL}s.")
        print(f"   (CV import error: {CV_IMPORT_ERROR})")

    while True:
        try:
            res = (
                sb.table("videos")
                .select("*")
                .eq("status", "uploaded")
                .order("created_at")
                .limit(5)
                .execute()
            )
            for video in res.data or []:
                process_video(video)
        except Exception as e:  # noqa: BLE001
            print(f"poll error: {e}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
