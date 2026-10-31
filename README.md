# HardHat Vision — AI Safety Detection

HardHat Vision is a professional dashboard for detecting safety helmets on
construction sites using a custom-trained YOLOv5 model. It supports image and
video uploads, an adjustable confidence threshold, annotated output with
confidence scores, helmet counts, inference latency, video FPS, and downloads
of processed media.

This repository contains the **frontend** (React + Vite + TypeScript) and a
**reference Python backend** (`backend/app.py`) that you connect to your own
custom-trained YOLOv5 weights (`best.pt`).

> The frontend never fabricates detections or performance metrics. Until the
> Python backend is connected and running, detection calls fail with a clear
> "Backend offline" state. Real inference only.

---

## Project structure

```
.
├── src/                     # Frontend (React + Vite + TypeScript)
│   ├── App.tsx              # Dashboard: layout, state, orchestration
│   ├── config.ts            # Backend URL, endpoints, class-name mapping
│   ├── types.ts             # Shared types (Detection, ImageResult, VideoResult…)
│   ├── backend/
│   │   └── client.ts        # fetch wrapper that calls the Python backend
│   └── components/          # Header, ConfidenceSlider, MediaUploader, StatsPanel,
│                            # ResultsPanel, ModeTabs
├── backend/                 # Python YOLOv5 inference server (reference)
│   ├── app.py               # Flask server: /health, /detect/image, /detect/video
│   ├── requirements.txt
│   └── best.pt              #  <-- place YOUR trained weights here
└── README.md
```

---

## Frontend setup

Requirements: Node 18+.

```bash
npm install
npm run dev      # start the dev server (Vite)
npm run build    # type-check + production build
npm run typecheck
```

The frontend expects the backend at `http://localhost:8000` by default.
Override it with an environment variable (create a `.env` file in the project
root):

```
VITE_BACKEND_URL=http://localhost:8000
```

---

## Backend setup (Python + your YOLOv5 model)

> Run the backend **locally on your Windows laptop** — not inside Bolt's cloud
> environment. Your trained `best.pt` stays on your machine; Bolt only hosts the
> frontend and the backend source code.

The backend is a Flask server that loads your `best.pt` (single class,
`helmet`) and exposes the three endpoints the frontend calls. The model
loading and inference are already implemented using
`torch.hub.load('ultralytics/yolov5', 'custom', ...)`.

1. Place your trained weights at `backend/best.pt` (or set
   `HARDHAT_MODEL_PATH=/absolute/path/to/best.pt`).

2. Install dependencies (adjust torch for your CUDA version as needed):

   ```bash
   pip install -r backend/requirements.txt
   ```

3. If you keep a local YOLOv5 clone instead of pulling from GitHub, set:
   ```
   HARDHAT_YOLOV5_REPO=/path/to/your/yolov5
   HARDHAT_YOLOV5_SOURCE=local
   ```
   Otherwise the server pulls `ultralytics/yolov5` from GitHub on first run.

4. Run it:

   ```bash
   python backend/app.py
   ```

5. Start the frontend (`npm run dev`). The header status pill should flip to
   **Backend connected** once `/health` returns `modelLoaded: true`.

### Backend API contract

| Method | Path            | Body                                          | Response                                                                 |
|--------|-----------------|-----------------------------------------------|--------------------------------------------------------------------------|
| GET    | `/health`       | —                                             | `{ status, modelLoaded, modelPath, device }`                             |
| POST   | `/detect/image` | multipart: `file`, `confidence` (0.1–0.9)     | `{ annotatedImage, detections[], latencyMs }`                           |
| POST   | `/detect/video` | multipart: `file`, `confidence` (0.1–0.9)     | `{ annotatedVideo, detections[], helmetCount, latencyMs, fps, framesProcessed }` |

`Detection` shape (single class — `classId` is always 0):

```json
{
  "classId": 0,
  "className": "helmet",
  "confidence": 0.91,
  "bbox": [x1, y1, x2, y2]
}
```

`annotatedImage` is a JPEG data URL returned inline in the JSON.
`annotatedVideo` is a URL the browser can stream; the backend writes the
processed MP4 to `backend/annotated/` and serves it via `GET /annotated/<name>`.

CORS is required for cross-origin calls from the frontend. The server uses
`flask-cors` (`CORS(app)`); configure an explicit origin in production instead
of the wildcard.

---

## What still needs connecting

- [ ] Drop your `best.pt` into `backend/` (or set `HARDHAT_MODEL_PATH`).
- [ ] Install `backend/requirements.txt` and run `python backend/app.py` on
      your laptop.
- [ ] (Optional) Set `HARDHAT_MODEL_DEVICE=cuda` if you have a GPU.
- [ ] (Optional) Set `HARDHAT_YOLOV5_REPO` / `HARDHAT_YOLOV5_SOURCE=local` if
      you keep a local YOLOv5 clone instead of pulling from GitHub.

The model loading, per-frame inference, annotation drawing, video encoding,
and JSON response shaping are already implemented in `backend/app.py`. No mock
data and no `no-helmet` class — the single `helmet` class matches your model.

Everything in the frontend — upload UX, confidence slider, results panel,
stats, download buttons, processing indicators, error states, and responsive
layout — is unchanged and will populate automatically once the backend returns
real results.

---

## Notes on data

This dashboard is a stateless inference UI. Uploads go straight to your
Python backend; nothing is persisted by the frontend and no database is used.
If you later want to log detections or retain processed media, add that on the
backend side (or wire in Supabase) — the frontend intentionally stays
read-only around the inference flow.
