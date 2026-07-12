"""
Real computer-vision analysis (Phase 2, v4).

- YOLOv8m-pose + BoT-SORT tracking.
- Co-occurrence selection: 2 DISTINCT players per side (rejects fragments).
- Optional COURT CALIBRATION: given the 4 tapped court corners, foot positions
  are mapped to a top-down court -> TRUE left/right, real front/mid/back zones,
  distances in metres, and an on-court filter that drops anyone off the court.
- Per-player roles + ID-photo crops, plus a reference frame for calibration.

Requires the CV stack (Python 3.12): ultralytics, opencv-python, numpy, torch.
"""

from __future__ import annotations

import os
import tempfile

import cv2
import numpy as np

COURT_LEN_M = 13.4   # baseline to baseline
COURT_WID_M = 6.1    # doubles width

_model = None


def _get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO("yolov8m-pose.pt")  # medium: better detection than nano
    return _model


def gpu_info() -> str:
    try:
        import torch
        if torch.cuda.is_available():
            return f"CUDA on {torch.cuda.get_device_name(0)}"
        return "CPU (no CUDA detected)"
    except Exception:  # noqa: BLE001
        return "unknown"


def _smooth(a: np.ndarray, k: int = 5) -> np.ndarray:
    if len(a) < k:
        return a
    return np.convolve(a, np.ones(k) / k, mode="valid")


def _role(cov: dict) -> str:
    f, m, r = cov.get("front", 0), cov.get("mid", 0), cov.get("rear", 0)
    if f >= 50:
        return "Net / front-court player"
    if r >= 50:
        return "Back-court player"
    if m >= 45:
        return "Mid-court linker"
    return "All-court player"


def _homography(corners):
    # corners: 4 [x, y] in normalized image coords, ordered
    #   near-left, near-right, far-right, far-left
    # Destination court: x 0..1 (left..right), y 0=far baseline, 1=near baseline.
    src = np.array(corners, dtype=np.float32)
    dst = np.array([[0, 1], [1, 1], [1, 0], [0, 0]], dtype=np.float32)
    return cv2.getPerspectiveTransform(src, dst)


def _to_court(H, xs, ys):
    pts = np.stack([xs, ys], axis=1).astype(np.float32).reshape(-1, 1, 2)
    out = cv2.perspectiveTransform(pts, H).reshape(-1, 2)
    return out[:, 0], out[:, 1]


def _side_summary(tracks, court_mode=False, is_near=True) -> dict:
    xs = np.concatenate([t["x"] for t in tracks])
    ys = np.concatenate([t["y"] for t in tracks])

    left = float((xs < 0.5).mean() * 100)
    right = 100.0 - left

    if court_mode:
        # Depth relative to the net (court y=0.5): 0 at net, 1 at own baseline.
        depth = (ys - 0.5) / 0.5 if is_near else (0.5 - ys) / 0.5
        depth = np.clip(depth, 0, 1)
    else:
        lo, hi = np.percentile(ys, 5), np.percentile(ys, 95)
        depth = np.clip((ys - lo) / max(hi - lo, 1e-6), 0, 1)

    front = float((depth < 0.33).mean() * 100)
    rear = float((depth > 0.66).mean() * 100)
    mid = max(0.0, 100.0 - front - rear)

    dists = []
    for t in tracks:
        sx, sy = _smooth(t["x"]), _smooth(t["y"])
        if court_mode:
            d = np.sum(np.sqrt((np.diff(sx) * COURT_WID_M) ** 2 +
                               (np.diff(sy) * COURT_LEN_M) ** 2))
        else:
            d = np.sum(np.sqrt(np.diff(sx) ** 2 + np.diff(sy) ** 2)) * COURT_LEN_M
        dists.append(d)
    dist_m = round(float(np.mean(dists)), 1)

    return {
        "court_coverage_pct": {"front": round(front), "mid": round(mid), "rear": round(rear)},
        "lateral_balance_pct": {"left": round(left), "right": round(right)},
        "total_distance_m": dist_m,
    }


def _cut_window(src, dst, start_f, n_frames):
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    writer = cv2.VideoWriter(dst, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_f)
    ref = None
    for i in range(n_frames):
        ok, frame = cap.read()
        if not ok:
            break
        if i == 0:
            ref = frame.copy()
        writer.write(frame)
    cap.release()
    writer.release()
    return fps, ref


def _pick_two(side: list[dict]) -> list[dict]:
    """Busiest track + its true partner (co-present but elsewhere on court)."""
    side = sorted(side, key=lambda c: c["n"], reverse=True)
    if not side:
        return []
    a = side[0]
    best, best_ov = None, 0
    for c in side[1:]:
        shared = a["fset"] & c["fset"]
        if len(shared) < 8:
            continue
        sep = float(np.mean([
            ((a["fx"][f][0] - c["fx"][f][0]) ** 2 +
             (a["fx"][f][1] - c["fx"][f][1]) ** 2) ** 0.5
            for f in shared
        ]))
        if sep < 0.06:                 # same person under two track IDs
            continue
        if len(shared) > best_ov:
            best_ov, best = len(shared), c
    return [a, best] if best else [a]


def extract_metrics(video_path, corners=None, window_seconds=30, vid_stride=2) -> dict:
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    win_len = int(window_seconds * fps)
    start = int(total * 0.25) if total > win_len * 2 else 0
    win_len = min(win_len, total - start)

    win_path = tempfile.mktemp(suffix=".mp4")
    _, ref_frame = _cut_window(video_path, win_path, start, win_len)

    court_mode = bool(corners) and len(corners) == 4
    H = _homography(corners) if court_mode else None
    print(f"       {window_seconds}s window (frames {start}-{start + win_len}); "
          f"court_calibration={'ON' if court_mode else 'OFF'}")

    model = _get_model()
    tracks: dict[int, dict] = {}
    frames = 0
    results = model.track(
        source=win_path, stream=True, persist=True, classes=[0],
        tracker="botsort.yaml", vid_stride=vid_stride, verbose=False,
    )
    for r in results:
        frames += 1
        b = getattr(r, "boxes", None)
        if b is None or b.id is None or len(b) == 0:
            continue
        h, w = r.orig_shape
        xy = b.xyxy.cpu().numpy()
        ids = b.id.cpu().numpy().astype(int)
        img = r.orig_img
        for k in range(len(ids)):
            x1, y1, x2, y2 = xy[k]
            t = tracks.setdefault(int(ids[k]), {"x": [], "y": [], "f": [], "best_area": 0.0, "crop": None})
            t["x"].append(float((x1 + x2) / 2 / w))
            t["y"].append(float(y2 / h))
            t["f"].append(frames)
            area = float((x2 - x1) * (y2 - y1))
            if img is not None and area > t["best_area"]:
                pw, ph = (x2 - x1) * 0.12, (y2 - y1) * 0.08
                cx1, cy1 = max(0, int(x1 - pw)), max(0, int(y1 - ph))
                cx2, cy2 = min(w, int(x2 + pw)), min(h, int(y2 + ph))
                t["best_area"] = area
                t["crop"] = img[cy1:cy2, cx1:cx2].copy()

    # Map image positions to court coords and drop off-court points.
    if court_mode:
        for t in tracks.values():
            if not t["x"]:
                continue
            cx, cy = _to_court(H, np.array(t["x"]), np.array(t["y"]))
            keep = (cx > -0.15) & (cx < 1.15) & (cy > -0.15) & (cy < 1.15)
            t["x"] = list(cx[keep])
            t["y"] = list(cy[keep])
            t["f"] = list(np.array(t["f"])[keep])

    min_frames = max(8, frames // 8)
    cand = []
    for tid, t in tracks.items():
        if len(t["x"]) < min_frames:
            continue
        x = np.array(t["x"])
        y = np.array(t["y"])
        movement = float(np.hypot(x.std(), y.std()))
        if movement < 0.015:
            continue
        cand.append({
            "id": tid, "x": x, "y": y, "n": len(x), "my": float(np.median(y)),
            "crop": t.get("crop"),
            "fset": set(int(v) for v in t["f"]),
            "fx": {int(fi): (float(xi), float(yi)) for fi, xi, yi in zip(t["f"], x, y)},
        })

    result = {
        "source": "cv-yolov8m-pose-v4",
        "frames_analyzed": frames,
        "window_seconds": window_seconds,
        "court_calibrated": court_mode,
    }
    if ref_frame is not None:
        ok, buf = cv2.imencode(".jpg", ref_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ok:
            result["_ref_frame"] = buf.tobytes()

    try:
        os.remove(win_path)
    except Exception:  # noqa: BLE001
        pass

    if not cand:
        result["players"] = {}
        return result

    if court_mode:
        near_tracks = _pick_two([c for c in cand if c["my"] >= 0.5])
        far_tracks = _pick_two([c for c in cand if c["my"] < 0.5])
    else:
        ys = np.array([c["my"] for c in cand])
        net = float((ys.min() + ys.max()) / 2.0)
        near_tracks = _pick_two([c for c in cand if c["my"] >= net])
        far_tracks = _pick_two([c for c in cand if c["my"] < net])
    print(f"       {len(tracks)} tracks, {len(cand)} moving -> "
          f"near={len(near_tracks)} far={len(far_tracks)}")

    entries = []
    for side_name, team, is_near in (("bottom", near_tracks, True), ("top", far_tracks, False)):
        for t in team:
            s = _side_summary([t], court_mode=court_mode, is_near=is_near)
            s["side"] = side_name
            s["role"] = _role(s["court_coverage_pct"])
            crop = t.get("crop")
            if crop is not None and getattr(crop, "size", 0) > 0:
                ok, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 80])
                if ok:
                    s["_thumb"] = buf.tobytes()
            entries.append(s)

    entries.sort(key=lambda e: e["total_distance_m"], reverse=True)
    max_d = max((e["total_distance_m"] for e in entries), default=1.0) or 1.0
    out = {}
    for i, e in enumerate(entries, start=1):
        e["label"] = f"Player {i}"
        ratio = e["total_distance_m"] / max_d
        e["workload"] = "high" if ratio >= 0.66 else "low" if ratio <= 0.33 else "medium"
        out[f"player_{i}"] = e

    result["players"] = out
    return result
