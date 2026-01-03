# Portfolio Zero

Modern portfolio website featuring 3D globe visualization with single-page scroll navigation.

## Features

- Interactive 3D globe with smooth animations
- Single-page scroll navigation with section snapping
- Adaptive rendering based on device capabilities
- Optimized performance for mobile and desktop
- Dynamic starfield background
- Bilingual support (English/Vietnamese)

## Tech Stack

- React 18 with TypeScript
- Globe.gl and Three.js for 3D graphics
- Framer Motion for animations
- Tailwind CSS for styling
- Vite for build tooling

## Installation

```bash
git clone https://github.com/InfinityZero3000/Portfolio_zero.git
cd Portfolio_zero
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
Portfolio_zero/
├── components/
│   ├── GlobeViz.tsx
│   └── StarfieldBackground.tsx
├── utils/
│   ├── scroll-utils.ts
│   ├── texture-optimizer.ts
│   └── performance-monitor.ts
├── App.tsx
└── constants.ts
```

## Sections

1. Home - 3D globe with introduction
2. Projects - Portfolio showcase
3. About - Personal information
4. Resume - Interactive PDF viewer
5. Skills - Technical capabilities
6. Education - Academic background

## Configuration

The website automatically adapts to device capabilities:
- Mobile devices: Optimized textures and reduced effects
- Desktop: Full quality rendering with all effects
- High-end: Ultra textures and maximum detail

## Performance

- Adaptive FPS (30-60 based on device)
- Lazy loading for components
- Optimized bundle size
- Smooth scroll with section snapping

## Author

Nguyen Huu Thang (InfinityZero)
- GitHub: [@InfinityZero3000](https://github.com/InfinityZero3000)

## License

MIT License
