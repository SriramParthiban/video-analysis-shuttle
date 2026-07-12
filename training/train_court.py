"""
Fine-tune YOLOv8-pose to detect the 4 court corners.

Prereqs: labelled data in training/dataset/ (run label_court.py first).
Run:  python train_court.py     (uses the RTX 5060)
Result: training/runs/court/weights/best.pt
"""

import os

from ultralytics import YOLO

HERE = os.path.dirname(__file__)


def main():
    n_labels = len(
        [f for f in os.listdir(os.path.join(HERE, "dataset", "labels"))
         if f.endswith(".txt")]
    ) if os.path.isdir(os.path.join(HERE, "dataset", "labels")) else 0
    if n_labels < 40:
        print(f"Only {n_labels} labelled frames — label more first "
              "(aim for 200+). Training now would overfit badly.")
        return

    print(f"Training on {n_labels} labelled frames…")
    model = YOLO("yolov8n-pose.pt")  # transfer-learn from pretrained pose
    model.train(
        data=os.path.join(HERE, "court.yaml"),
        epochs=120,
        imgsz=640,
        batch=8,
        patience=30,
        project=os.path.join(HERE, "runs"),
        name="court",
        exist_ok=True,
    )
    print("done — best weights in training/runs/court/weights/best.pt")


if __name__ == "__main__":
    main()
