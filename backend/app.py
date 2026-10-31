"""
HardHat Vision — YOLOv5 inference backend.

Loads your custom-trained `best.pt` YOLOv5 helmet-detection model (single class,
class id 0 = "helmet") and exposes three endpoints the frontend expects:

    GET  /health
    POST /detect/image   -> { annotatedImage, detections, latencyMs }
    POST /detect/video   -> { annotatedVideo, detections, helmetCount,
                              latencyMs, fps, framesProcessed }

Run locally on your Windows laptop (NOT inside Bolt's cloud environment):

    pip install -r requirements.txt
    python app.py

Place your `best.pt` next to this file, or set HARDHAT_MODEL_PATH. The model is
loaded via torch.hub; by default it pulls the YOLOv5 repo from
ultralytics/yolov5. If you keep a local YOLOv5 clone, point HARDHAT_YOLOV5_REPO
at its path and set HARDHAT_YOLOV5_SOURCE=local.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import cv2
import numpy as np
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow the Bolt frontend origin to call this server.

# --- Configuration -----------------------------------------------------------
MODEL_PATH = os.environ.get("HARDHAT_MODEL_PATH", str(Path(__file__).parent / "best.pt"))
DEVICE = os.environ.get("HARDHAT_MODEL_DEVICE", "cpu")
YOLOV5_REPO = os.environ.get(
    "HARDHAT_YOLOV5_REPO",
    r"D:\AI projects\YOLOv5_Custom_Object_Detection\yolov5-master"
)
YOLOV5_SOURCE = os.environ.get("HARDHAT_YOLOV5_SOURCE", "local")
# Directory for processed videos served back to the browser.
ANNOTATED_DIR = Path(__file__).parent / "annotated"
ANNOTATED_DIR.mkdir(exist_ok=True)

# --- Class names -------------------------------------------------------------
# This model has exactly one class: helmet (id 0). Do not add a no-helmet class.
DEFAULT_CLASS_NAMES = {0: "helmet"}

# --- Load the YOLOv5 model ---------------------------------------------------
model = None
CLASS_NAMES: dict[int, str] = dict(DEFAULT_CLASS_NAMES)

try:
    import torch
    import pathlib

    pathlib.PosixPath = pathlib.WindowsPath
    model = torch.hub.load(
        YOLOV5_REPO,
        "custom",
        path=MODEL_PATH,
        source=YOLOV5_SOURCE,
        device=DEVICE,
    )
    # Per-request confidence is applied in _run_inference; set a safe default.
    model.conf = 0.25
    # Inherit class names from the loaded weights when available.
    names = getattr(model, "names", None)
    if isinstance(names, dict):
        CLASS_NAMES = {int(k): str(v) for k, v in names.items()}
    elif isinstance(names, (list, tuple)):
        CLASS_NAMES = {i: str(n) for i, n in enumerate(names)}
    print(f"[HardHat Vision] Model loaded from {MODEL_PATH} on {DEVICE}. "
          f"Classes: {CLASS_NAMES}")
except Exception as exc:  # noqa: BLE001 — keep the server alive for /health
    print(f"[HardHat Vision] Failed to load model: {exc}")
    model = None


def _draw_boxes(image: np.ndarray, detections: list[dict]) -> np.ndarray:
    """Draw bounding boxes on the image and return the annotated copy."""
    annotated = image.copy()
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = f'{det["className"]} {det["confidence"] * 100:.1f}%'
        color = (0, 255, 0)  # green for helmet detections
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            annotated,
            label,
            (x1, max(y1 - 6, 12)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1,
        )
    return annotated


def _run_inference(image_bgr: np.ndarray, confidence: float):
    """Run inference on a single BGR frame. Return (detections, latency_ms)."""
    if model is None:
        return [], 0.0

    model.conf = float(confidence)
    t0 = time.perf_counter()
    results = model(image_bgr)
    preds = results.pandas().xyxy[0]
    detections = []
    for _, row in preds.iterrows():
        cid = int(row["class"])
        detections.append({
            "classId": cid,
            "className": CLASS_NAMES.get(cid, DEFAULT_CLASS_NAMES.get(cid, str(cid))),
            "confidence": float(row["confidence"]),
            "bbox": [
                int(row["xmin"]),
                int(row["ymin"]),
                int(row["xmax"]),
                int(row["ymax"]),
            ],
        })
    latency_ms = (time.perf_counter() - t0) * 1000.0
    return detections, latency_ms


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "modelLoaded": model is not None,
        "modelPath": MODEL_PATH,
        "device": DEVICE,
    })


@app.post("/detect/image")
def detect_image():
    if model is None:
        return jsonify({"detail": "Model not loaded"}), 503

    file = request.files.get("file")
    if not file:
        return jsonify({"detail": "Missing 'file'"}), 400

    confidence = float(request.form.get("confidence", 0.25))

    raw = file.read()
    arr = np.frombuffer(raw, np.uint8)
    image_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        return jsonify({"detail": "Could not decode image"}), 400

    detections, latency_ms = _run_inference(image_bgr, confidence)
    annotated = _draw_boxes(image_bgr, detections)

    ok, buf = cv2.imencode(".jpg", annotated)
    if not ok:
        return jsonify({"detail": "Could not encode annotated image"}), 500

    import base64
    annotated_data_url = "data:image/jpeg;base64," + base64.b64encode(buf).decode()

    return jsonify({
        "annotatedImage": annotated_data_url,
        "detections": detections,
        "latencyMs": round(latency_ms, 2),
    })


@app.post("/detect/video")
def detect_video():
    if model is None:
        return jsonify({"detail": "Model not loaded"}), 503

    file = request.files.get("file")
    if not file:
        return jsonify({"detail": "Missing 'file'"}), 400

    confidence = float(request.form.get("confidence", 0.25))

    in_path = ANNOTATED_DIR / f"hhv_in_{time.time_ns()}{Path(file.filename or '.mp4').suffix}"
    in_path.write_bytes(file.read())

    cap = cv2.VideoCapture(str(in_path))
    if not cap.isOpened():
        in_path.unlink(missing_ok=True)
        return jsonify({"detail": "Could not open video"}), 400

    fps_src = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)

    out_name = f"annotated_{time.time_ns()}.mp4"
    out_path = ANNOTATED_DIR / out_name
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(out_path), fourcc, fps_src, (width, height))

    detections_all: list[dict] = []
    helmet_count = 0
    latencies: list[float] = []
    frames_processed = 0
    t_start = time.perf_counter()

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        dets, lat = _run_inference(frame, confidence)
        detections_all.extend(dets)
        helmet_count += sum(1 for d in dets if d["className"] == "helmet")
        latencies.append(lat)
        out.write(_draw_boxes(frame, dets))
        frames_processed += 1

    elapsed = time.perf_counter() - t_start
    cap.release()
    out.release()
    in_path.unlink(missing_ok=True)

    mean_latency = (sum(latencies) / len(latencies)) if latencies else 0.0
    fps = (frames_processed / elapsed) if elapsed > 0 else 0.0

    annotated_url = f"{request.scheme}://{request.host}/annotated/{out_name}"

    return jsonify({
        "annotatedVideo": annotated_url,
        "detections": detections_all,
        "helmetCount": helmet_count,
        "latencyMs": round(mean_latency, 2),
        "fps": round(fps, 2),
        "framesProcessed": frames_processed,
    })


@app.get("/annotated/<path:filename>")
def serve_annotated(filename: str):
    """Serve processed videos back to the browser."""
    return send_from_directory(str(ANNOTATED_DIR), filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)