# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BYE-BG is a privacy-first, client-side web application for AI-powered background removal. All image processing happens locally in the browser using ONNX Runtime Web with WebGPU/WASM backends. Images never leave the user's device.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # TypeScript check + production build
npm run lint      # ESLint on .ts/.tsx files
npm run format    # Prettier formatting
npm run preview   # Preview production build
```

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- ONNX Runtime Web for AI inference (via @imgly/background-removal)
- Web Workers for non-blocking inference

## Architecture

### Key Files

- `src/App.tsx` - Main component managing state, worker lifecycle, and UI coordination
- `src/workers/inferenceWorker.ts` - Web Worker running AI model inference and image compositing
- `src/lib/capabilities.ts` - Hardware detection (WebGPU, FP16, device memory)
- `src/lib/image.ts` - Image utilities (decode, downscale, composite, export)
- `src/lib/ui/` - UI components (Dropzone, CompareSlider, SettingsPanel, ProgressBar)

### Worker Communication

Main thread and worker use a request-response pattern with unique IDs:
- Main sends `{ id, type: 'process', payload: {...} }`
- Worker responds with `{ id, type: 'progress'|'result'|'error', payload }`

### Quality Tiers

- **Fast**: `isnet_quint8` model (quantized, for weak devices)
- **Quality**: `isnet` or `isnet_fp16` (default, balanced)
- **Pro**: `isnet_fp16` (highest quality, for high-end devices)

### Image Pipeline

1. File uploaded → converted to Uint8Array
2. Sent to worker for model inference
3. Result composited with selected background
4. Exported as PNG (transparent) or WebP

## Configuration

### COOP/COEP Headers

Vite dev server sets Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers to enable SharedArrayBuffer for optimal WASM performance. The app works without these but runs slower.

### Tailwind Theme

Custom colors (panel, accent, success, warning, error) and shadows (panel, glow) defined in `tailwind.config.ts`.
