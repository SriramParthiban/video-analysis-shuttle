"""Debug: isolate the white court lines on a frame and visualise line detection."""
import cv2
import numpy as np

CLIP = (
    r"C:\Users\Admin\AppData\Local\Temp\claude"
    r"\c--Users-Admin-Desktop-Video-Analysis-V2"
    r"\1786f434-eadc-48d9-8455-52d4a4817905\scratchpad\clip.mp4"
)
OUT = (
    "C:/Users/Admin/AppData/Local/Temp/claude"
    "/c--Users-Admin-Desktop-Video-Analysis-V2"
    "/1786f434-eadc-48d9-8455-52d4a4817905/scratchpad"
)

cap = cv2.VideoCapture(CLIP)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * 0.25))
ok, frame = cap.read()
cap.release()
h, w = frame.shape[:2]
print(f"frame {w}x{h}")

# White lines = bright + low saturation.
hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
white = cv2.inRange(hsv, (0, 0, 140), (180, 70, 255))
white = cv2.morphologyEx(white, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))

lines = cv2.HoughLinesP(
    white, 1, np.pi / 180, threshold=60,
    minLineLength=int(w * 0.12), maxLineGap=30,
)

vis = frame.copy()
n = 0 if lines is None else len(lines)
if lines is not None:
    for l in lines:
        x1, y1, x2, y2 = (int(v) for v in np.ravel(l)[:4])
        cv2.line(vis, (x1, y1), (x2, y2), (0, 255, 0), 2)

cv2.imwrite(OUT + "/court_white.png", white)
cv2.imwrite(OUT + "/court_lines.png", vis)
print(f"detected {n} line segments")
