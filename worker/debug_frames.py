"""
Debug helper: download the clip, run pose detection on a few sample frames,
and save annotated images so we can SEE what the model detects.
"""

import os
import cv2
from dotenv import load_dotenv
from supabase import create_client
from ultralytics import YOLO

load_dotenv()

STORAGE_PATH = "87ab5a6d-1478-40b4-b108-6b5a4cb60712/1783783168992-sy89wb8g18f.mp4"
OUT_DIR = (
    r"C:\Users\Admin\AppData\Local\Temp\claude"
    r"\c--Users-Admin-Desktop-Video-Analysis-V2"
    r"\1786f434-eadc-48d9-8455-52d4a4817905\scratchpad"
)

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

print("downloading clip…")
data = sb.storage.from_("videos").download(STORAGE_PATH)
tmp = os.path.join(OUT_DIR, "clip.mp4")
with open(tmp, "wb") as f:
    f.write(data)
print(f"downloaded {len(data)/1e6:.1f} MB")

model = YOLO("yolov8n-pose.pt")
cap = cv2.VideoCapture(tmp)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)
print(f"video: {total} frames @ {fps:.1f} fps  (~{total/max(fps,1)/60:.1f} min)")

for i, frac in enumerate([0.15, 0.4, 0.6, 0.85]):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * frac))
    ok, frame = cap.read()
    if not ok:
        continue
    res = model(frame, verbose=False)[0]
    annotated = res.plot()
    out = os.path.join(OUT_DIR, f"debug_frame_{i}.png")
    cv2.imwrite(out, annotated)
    print(f"frame {i} (t={frac}): {len(res.boxes)} people detected -> {out}")

cap.release()
print("done")
