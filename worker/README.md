# Worker — badminton analysis engine

The worker watches Supabase for newly uploaded videos, analyzes them, and writes
a coaching report back. It runs on **your machine** (the one with the GPU), not
on the phone.

## Phase 1 (now) — stub + real Claude report

`analyze.py` today produces **placeholder movement metrics** (the exact JSON
shape the real CV pipeline will emit) and sends them to **Claude**, which writes
the summary and the list of weaknesses. This proves the whole pipeline
end-to-end. It runs fine on your current **Python 3.14** — no GPU needed.

```bash
cd worker
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell:  .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env          # then edit .env with real values
python analyze.py
```

Leave it running. Upload a clip from the app → within a few seconds you'll see it
go `uploaded → processing → done`, and the report appears in the app.

> No `ANTHROPIC_API_KEY` yet? It still works — it falls back to a canned report
> so you can test the flow, then add the key for real AI-written reports.

## Phase 2 (next) — real computer vision

Replace `fake_metrics()` with a real pipeline. This stack needs **Python 3.12**
(PyTorch/Ultralytics don't support 3.14 yet) in a **separate** venv:

```bash
py -3.12 -m venv .venv-cv
.venv-cv\Scripts\activate
# RTX 5060 is Blackwell -> needs CUDA 12.8+ build:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
pip install -r requirements-cv.txt
```

Planned pipeline:
1. **YOLOv8-Pose + ByteTrack** — detect & track both players, get body pose per frame.
2. **Court detection** (OpenCV line detection + homography) — map positions to a
   top-down 2D court.
3. **Metrics** — court-coverage heatmap, left/right & front/rear balance, recovery
   time, distance covered, per player.
4. (stretch) **TrackNet** — shuttlecock trajectory → shot type classification.
5. Feed metrics to Claude exactly as Phase 1 already does.

Only step 3's output changes; the app and database stay identical.
