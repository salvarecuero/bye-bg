<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo-light.svg">
    <source media="(prefers-color-scheme: light)" srcset="logo-dark.svg">
    <img src="logo-dark.svg" alt="bye-bg" height="48">
  </picture>
</p>

<p align="center">
  <strong>AI-powered background removal that runs entirely in your browser.</strong><br>
  Your images never leave your device — all processing happens locally using WebGPU.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#development">Development</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
</p>

<p align="center">
  <a href="https://bye-bg.salvarecuero.dev">
    <img src="screenshot.png" alt="bye-bg in action" width="700">
  </a>
</p>

## Features

- **100% Private** — Images are processed locally. Nothing is uploaded to any server.
- **Hardware Accelerated** — Uses WebGPU for fast GPU inference, with WASM fallback.
- **Three Quality Tiers** — Fast, Quality, or Pro modes to match your device.
- **Batch Processing** — Process multiple images at once with queue management.
- **Flexible Backgrounds** — Transparent, solid color, or custom image replacement.
- **Multiple Formats** — Export as PNG (with transparency) or WebP.
- **Keyboard Shortcuts** — Power-user friendly with full keyboard navigation.
- **Works Offline** — After the initial model download, no internet required.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| Tailwind CSS | Styling |
| ONNX Runtime Web | AI inference engine |
| Web Workers | Non-blocking background processing |

## How It Works

1. **Upload** — Drop an image or click to select
2. **Process** — A Web Worker runs the AI model using ONNX Runtime
3. **Composite** — The result is blended with your chosen background
4. **Export** — Download as PNG or WebP, or copy to clipboard

The app automatically detects your hardware and selects the optimal backend:

- **WebGPU (FP16)** — Fastest, for modern GPUs with half-precision support
- **WebGPU (FP32)** — Fast, for GPUs without FP16
- **WASM** — Universal fallback, works on all modern browsers

## Quality Tiers

| Tier | Model | Best For |
|------|-------|----------|
| Fast | Quantized (8-bit) | Older devices, quick previews |
| Quality | Standard | Most images (default) |
| Pro | FP16 | Complex images, fine details like hair |

The app recommends a tier based on your device's capabilities.

## Browser Support

- **Chrome 113+** / **Edge 113+** / **Firefox 120+** — Full WebGPU support
- **Safari** / **Older browsers** — WASM fallback (slower but functional)

For optimal performance, the dev server sets COOP/COEP headers to enable SharedArrayBuffer.

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

### Project Structure

```
src/
├── App.tsx                 # Main component
├── workers/
│   └── inferenceWorker.ts  # AI inference in Web Worker
├── lib/
│   ├── capabilities.ts     # Hardware detection
│   ├── image.ts            # Image utilities
│   └── ui/                 # UI components
└── hooks/
    └── useBatchProcessor.ts # Batch processing logic
```

---

<p align="center">
  <a href="LICENSE">MIT License</a> · Built with <a href="https://github.com/imgly/background-removal-js">@imgly/background-removal</a>
</p>
