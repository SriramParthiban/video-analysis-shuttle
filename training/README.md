# Training — automatic court detection

Goal: a model that finds the **4 court corners** in any badminton frame, at any
angle — so calibration becomes automatic (no manual tapping).

## Approach (why this one)
We **repurpose YOLOv8-pose**: treat the court as a single object with **4
keypoints** (the corners). We already have Ultralytics installed and it's a
proven, transfer-learnable architecture — so we fine-tune from the pretrained
pose weights rather than training from scratch. A few hundred labeled frames can
get a usable first model.

## The pipeline
```
clips/  (raw badminton videos, many angles)
   │  label_court.py  ← YOU click the 4 corners on sampled frames
   ▼
dataset/images + dataset/labels  (YOLO-pose format)
   │  train_court.py  ← fine-tune YOLOv8-pose on your GPU
   ▼
runs/court/weights/best.pt  ← the court detector
   │  integrate into cv_analyze.py (auto-corners, no tapping)
   ▼
accurate metrics at any angle
```

## Steps
1. **Gather clips** → drop 15–30 badminton videos into `training/clips/`.
   Maximize *variety*: different **angles** (end-on, side, corner, elevated),
   venues, lighting, singles + doubles. YouTube match clips are fine. Short is OK.
2. **Label** → `python label_court.py` (needs a screen). Click the 4 corners
   (near-left → near-right → far-right → far-left) on each sampled frame.
   Aim for **200–400 labeled frames** for a first model.
3. **Split** → hold out ~15% of images/labels into a `val/` set (edit court.yaml).
4. **Train** → `python train_court.py` (uses the RTX 5060). ~30–90 min.
5. **Evaluate** → check `runs/court/` — does it place corners correctly on
   *held-out* clips? Iterate: more/varied data > more epochs.
6. **Integrate** → load `best.pt` in the worker to auto-detect corners.

## Honest expectations
- This is **days-to-weeks**, mostly **data work** (labeling is the grind).
- Quality scales with **data variety**, not epochs. 300 varied frames beat 3000
  from one match.
- The calibration UI we built already collects (frame → corners) pairs from real
  usage — so every coach who calibrates grows this dataset for free later.

Run everything from the `training/` folder with the CV venv:
`..\worker\.venv-cv\Scripts\activate`
