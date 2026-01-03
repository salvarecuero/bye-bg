# BYE-BG

Client-side background remover built with React, Vite, and ONNX Runtime Web.
All processing stays on-device; only model files are fetched.

## How it works

- Drag-drop or browse an image; the worker runs `@imgly/background-removal`
  (ONNX, WASM/WebGPU under the hood) to create a cutout.
- Main thread handles UI and downloads only; images never leave the browser.
- WebGPU is preferred when available; otherwise WASM.
- Edge refinement toggle hints the worker to apply the higher-quality path
  exposed by the bundled models.

## Privacy

- Images are never uploaded or sent to any server.
- Model artifacts are cached by the browser after the first fetch.

## Dev

```sh
npm install
npm run dev
```

## COOP/COEP

`vite.config.ts` sets COOP/COEP headers for optimal WASM/thread support. Remove
them if hosting where cross-origin isolation is not possible; the app still
runs (slower).

