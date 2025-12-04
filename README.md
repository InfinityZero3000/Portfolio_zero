# 🌐 Portfolio Zero - Optimized 3D Web Portfolio

[![Performance](https://img.shields.io/badge/Performance-Optimized-brightgreen)]()
[![Security](https://img.shields.io/badge/Security-Hardened-blue)]()
[![DDoS](https://img.shields.io/badge/DDoS-Protected-red)]()

Modern, high-performance portfolio website với 3D Globe visualization, được tối ưu hóa toàn diện cho performance, security, và cross-platform compatibility.

## ✨ Features

### 🚀 Performance
- **Code Splitting**: Vendor chunks tách biệt (React, 3D, Animation, UI)
- **Lazy Loading**: Components load on-demand
- **Advanced Caching**: IndexedDB + localStorage + Service Worker
- **Adaptive Rendering**: Device capability detection
- **Optimized Textures**: Quality điều chỉnh theo device
- **Rate Limiting**: Client-side request throttling

### 🔒 Security & DDoS Protection
- **CSP (Content Security Policy)**: Chống XSS attacks
- **HSTS**: Force HTTPS connections
- **Frame Protection**: Chống clickjacking
- **Rate Limiting**: 30 API calls/minute, 100 resources/minute
- **Vercel DDoS Protection**: Network-level filtering
- **Security Headers**: Comprehensive header configuration

### 🎨 3D Globe Optimization
- **Device Detection**: GPU capability analysis
- **Texture Quality**: Low/Medium/High/Ultra based on device
- **Anisotropic Filtering**: Sharp textures at angles
- **Mobile Optimizations**: Battery-saving features
- **Smooth Rendering**: 60 FPS on high-end, 30+ FPS on mobile
- **WebGL Optimization**: Renderer settings per device

### 📱 Cross-Platform
- **Responsive Design**: Mobile-first approach
- **Touch Optimized**: Smooth interactions on mobile
- **Progressive Web App**: Offline support
- **Browser Support**: Chrome, Firefox, Safari, Edge

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **3D Graphics**: Globe.gl, Three.js
- **Animation**: Framer Motion
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Deployment**: Vercel
- **Caching**: IndexedDB, Service Worker

## 📦 Project Structure

```
Portfolio_zero/
├── components/
│   └── GlobeViz.tsx           # Optimized 3D Globe component
├── utils/
│   ├── cache-manager.ts       # Advanced caching system
│   ├── rate-limiter.ts        # Client-side rate limiting
│   ├── texture-optimizer.ts   # Globe texture optimization
│   ├── performance-monitor.ts # FPS & memory tracking
│   └── worker-pool.ts         # Web Workers support
├── public/
│   ├── _headers              # Security headers
│   └── sw.js                 # Service Worker
├── App.tsx                   # Main application
├── vite.config.ts           # Build optimization
├── vercel.json              # Deployment config
├── OPTIMIZATION_GUIDE.md    # Optimization documentation
├── SECURITY_OPTIMIZATION.md # Security documentation
└── DEPLOYMENT_CHECKLIST.md  # Deployment guide
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn

### Installation

1. **Clone repository**
```bash
git clone https://github.com/InfinityZero3000/Portfolio_zero.git
cd Portfolio_zero
```

2. **Install dependencies**
```bash
npm install
```

3. **Run development server**
```bash
npm run dev
```

4. **Open browser**
```
http://localhost:3000
```

### Build for Production

```bash
# Build optimized bundle
npm run build

# Preview production build
npm run preview

# Analyze bundle size
npm run build:analyze
```

## 📊 Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **FCP** | < 1.8s | |
| **LCP** | < 2.5s | |
| **FID** | < 100ms | |
| **CLS** | < 0.1 | |
| **TTI** | < 3.8s | |
| **FPS** | 60 | Adaptive |
| **Bundle Size** | ~470KB | Gzipped |

## 🔧 Configuration

### Environment Variables (Optional)
```bash
# .env.local
VITE_API_URL=your_api_url
VITE_CDN_URL=your_cdn_url
```

### Vite Config Highlights
```typescript
{
  build: {
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-3d': ['globe.gl', 'three'],
          'vendor-animation': ['framer-motion']
        }
      }
    }
  }
}
```

## 🌐 Deployment

### Vercel (Recommended)

#### Via CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

#### Via GitHub
1. Push to GitHub
2. Import in Vercel dashboard
3. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy

### Other Platforms
- **Netlify**: Supported
- **Cloudflare Pages**: Supported
- **AWS Amplify**: Supported

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for detailed guide.

## 📚 Documentation

- **[OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)** - Comprehensive optimization guide
- **[SECURITY_OPTIMIZATION.md](./SECURITY_OPTIMIZATION.md)** - Security implementation details
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Production deployment guide

## 🔍 Key Features Explained

### Device Capability Detection
```typescript
// Automatically detects:
- GPU performance
- Screen resolution
- Mobile vs Desktop
- WebGL support
- Memory available
```

### Adaptive Texture Loading
```typescript
// Texture quality based on device:
Low-end Mobile   → Compressed textures, no bump maps
Mid-range Mobile → Standard textures
Desktop          → High-quality textures
High-end Desktop → Ultra textures + full effects
```

### Rate Limiting
```typescript
// Protects against abuse:
API Calls:     30 requests/minute
Resources:     100 loads/minute
Auto-blocking: 5 minutes on exceed
```

## 🎯 Performance Tips

1. **Enable Service Worker** for offline support
2. **Use CDN** for static assets
3. **Monitor performance** via console logs
4. **Clear cache** periodically: `cacheManager.clear()`
5. **Check FPS** in development mode

## 🛡️ Security Features

- Content Security Policy
- XSS Protection
- Clickjacking Prevention
- HTTPS Enforcement
- Rate Limiting
- Input Sanitization

## 🐛 Troubleshooting

### Low FPS on Globe
- Check device capability in console
- Verify texture quality settings
- Monitor memory usage
- Disable atmosphere on low-end devices

### Caching Issues
```bash
# Clear all caches
localStorage.clear()
# In browser: Clear site data
```

### Build Errors
```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install
```

## 📈 Monitoring

### Built-in Performance Monitor
```typescript
import { performanceMonitor } from './utils/performance-monitor';

const summary = performanceMonitor.getSummary();
console.log('FPS:', summary.currentFPS);
console.log('Memory:', summary.currentMemory);
console.log('Recommendations:', performanceMonitor.getRecommendations());
```

### Recommended Tools
- **Vercel Analytics** - Real user monitoring
- **Lighthouse** - Performance audits
- **Chrome DevTools** - Debugging

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

## 👤 Author

**Nguyễn Hữu Thắng (InfinityZero)**
- GitHub: [@InfinityZero3000](https://github.com/InfinityZero3000)

## 🌟 Acknowledgments

- Globe.gl for 3D visualization
- Three.js for WebGL rendering
- Vercel for hosting platform
- React team for amazing framework

---

**Made with ❤️ and optimized with InfinityZero3000🚀**
