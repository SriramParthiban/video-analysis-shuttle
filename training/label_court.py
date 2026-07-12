"""
Label court corners for training the auto court-detection model.

Put badminton clips (any angle) in  training/clips/ , then run this. It samples
frames from each clip and lets you click the 4 corners; it writes YOLO-pose
format labels into  training/dataset/ .

Click order:  NEAR-LEFT -> NEAR-RIGHT -> FAR-RIGHT -> FAR-LEFT  (outer court lines)
Keys:  n = save & next   s = skip frame   r = reset clicks   q = quit
"""

import glob
import os

import cv2
import numpy as np

HERE = os.path.dirname(__file__)
CLIPS = os.path.join(HERE, "clips")
IMG_DIR = os.path.join(HERE, "dataset", "images")
LBL_DIR = os.path.join(HERE, "dataset", "labels")
FRAMES_PER_CLIP = 8

os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(LBL_DIR, exist_ok=True)

pts: list[tuple[int, int]] = []


def on_mouse(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN and len(pts) < 4:
        pts.append((x, y))


def save(frame, name):
    h, w = frame.shape[:2]
    arr = np.array(pts, dtype=float)
    xs, ys = arr[:, 0] / w, arr[:, 1] / h
    x1, y1, x2, y2 = xs.min(), ys.min(), xs.max(), ys.max()
    cx, cy, bw, bh = (x1 + x2) / 2, (y1 + y2) / 2, (x2 - x1), (y2 - y1)
    kpts = " ".join(f"{px:.6f} {py:.6f} 2" for px, py in zip(xs, ys))
    line = f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f} {kpts}\n"
    cv2.imwrite(os.path.join(IMG_DIR, name + ".jpg"), frame)
    with open(os.path.join(LBL_DIR, name + ".txt"), "w") as f:
        f.write(line)


def main():
    clips = sorted(
        glob.glob(os.path.join(CLIPS, "*.mp4")) + glob.glob(os.path.join(CLIPS, "*.mov"))
    )
    if not clips:
        print(f"No clips found in {CLIPS}. Drop some badminton videos there first.")
        return
    print(f"{len(clips)} clips. Click 4 corners per frame; n=save s=skip r=reset q=quit")

    count = len(glob.glob(os.path.join(IMG_DIR, "*.jpg")))
    cv2.namedWindow("label")
    cv2.setMouseCallback("label", on_mouse)

    for ci, clip in enumerate(clips):
        cap = cv2.VideoCapture(clip)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        for fi in range(FRAMES_PER_CLIP):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * (fi + 0.5) / FRAMES_PER_CLIP))
            ok, frame = cap.read()
            if not ok:
                continue
            pts.clear()
            while True:
                vis = frame.copy()
                for i, p in enumerate(pts):
                    cv2.circle(vis, p, 5, (0, 255, 0), -1)
                    cv2.putText(vis, str(i + 1), (p[0] + 6, p[1]),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.putText(vis, f"clip {ci+1}/{len(clips)} | saved {count} | "
                            "near-L, near-R, far-R, far-L | n s r q",
                            (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                cv2.imshow("label", vis)
                k = cv2.waitKey(20) & 0xFF
                if k == ord("n") and len(pts) == 4:
                    save(frame, f"court_{count:04d}")
                    count += 1
                    break
                if k == ord("s"):
                    break
                if k == ord("r"):
                    pts.clear()
                if k == ord("q"):
                    cap.release()
                    cv2.destroyAllWindows()
                    print(f"saved {count} labeled frames total")
                    return
        cap.release()
    cv2.destroyAllWindows()
    print(f"done — {count} labeled frames total")


if __name__ == "__main__":
    main()
