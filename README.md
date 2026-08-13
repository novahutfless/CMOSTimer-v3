# CMOSTimer v3

**CMOSTimer** is a modern, highly customizable, professional-grade speedcubing timer built for the web.

Designed with performance and flexibility in mind, it features a completely modular widget-based UI, hardware timer support (Stackmat), and robust statistical analysis, all powered by a modern React & TypeScript stack.

## Key Features

* **Modular Widget System**: Unlike traditional static timers, CMOSTimer allows you to completely customize your layout. Drag, drop, and resize widgets (Timer, Scramble, Graph, Stats) to fit your workflow.
* **Stackmat Support**: Native support for hardware timers via microphone input with raw signal decoding.
* **Advanced Statistics**: Real-time graphs, session averages (Ao5, Ao12, etc.), and PB tracking.
* **3D & 2D Visualizers**: High-performance scramble visualization to verify your scrambles.
* **Local-First Data**: All solves and sessions are stored locally in your browser using IndexedDB for speed and privacy.
* **Modern Tech**: Built with Vite and React for instant load times and zero lag.
* **Developer Friendly**: Written in strict TypeScript with a versioned, worker-isolated [plugin API](https://speed-cmos.com/v3/docs), declarative UI, async lifecycle, events, namespaced storage, and package import/export.
* **Multi-Platform Packaging**: Same frontend can be shipped as web, Android (Capacitor), and desktop (Tauri).

## Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm
* Android SDK (only if you want android builds)

### Installation

```bash
npm install

```

### Run
**Run the development server**
```bash
npm run dev

```

Open `http://localhost:5173` (or the port shown in your terminal) to view the app.

**Build for production**
```bash
npm run build

```

## API Configuration

Set your PHP API endpoint with Vite env vars:

```bash
VITE_API_URL=https://your-server.example/api/index.php
VITE_BASE_PATH=/v3/
```

If `VITE_API_URL` is not set, the app uses `https://speed-cmos.com/v3/api/index.php`.
If `VITE_BASE_PATH` is not set, the build uses relative asset paths (`./`) so it can be hosted from a subfolder.

## Native Builds (Android + Desktop)

The web app remains the source of truth. Native targets wrap the same frontend and sync local data to native persistent storage:

* Android: Capacitor Preferences storage
* Desktop (Windows/Linux): Tauri file-backed store (`cmos-storage.json`)

### Android (Capacitor)

1. Install dependencies: `npm install`
2. Ensure Capacitor Android major matches project: `npm install @capacitor/core@6.2.1 @capacitor/android@6.2.1`
3. Create Android project once: `npx cap add android`
4. Build and sync web assets: `npm run android:sync`
5. Open Android Studio: `npm run android:open`

### Windows EXE + Linux AppImage (Tauri)

1. Install Rust + Tauri prerequisites
2. Dev mode: `npm run tauri:dev`
3. Build installers: `npm run tauri:build`

Configured targets:
* Windows: NSIS installer (`.exe`)
* Linux: AppImage

### Unified Build-All

Run a single command to build:
* Web (`dist/`)
* Desktop (Tauri: Windows EXE + installer, Linux AppImage when supported by host toolchain)
* Android release artifacts (`.apk` / `.aab`)

```bash
npm run build:all
```

This command collects downloadable artifacts (everything except web) into one temporary folder and prints the folder path at the end.

Optional custom output folder:

```bash
npm run build:all -- --out=./tmp/build-artifacts
```

Optional Android behavior:
* Skip Android entirely: `npm run build:all -- --skip-android`
* Require Android SDK (fail if missing): `npm run build:all -- --require-android`

## Unified Versioning

All release versions can be set from one command using `package.json` as the source of truth:

```bash
npm run release:version -- 3.0.0
```

This synchronizes:
* `package.json`
* `package-lock.json`
* `src-tauri/tauri.conf.json`
* `src-tauri/Cargo.toml`
* `android/app/build.gradle` (`versionName` + computed `versionCode`)
* `android/app/src/main/res/xml/config.xml`

Android `versionCode` is derived from `major.minor.patch` as:
* `major * 10000 + minor * 100 + patch`

## Icon Workflow

Icons are managed from one source folder:
* `icons/`

Generated icon assets are synced into target-specific locations via:

```bash
npm run icons:sync
```

This updates:
* `public/` (web favicon/PWA assets)
* `src-tauri/icons/` (desktop bundle icons)
* `android/app/src/main/res/mipmap-*/` (Android launcher icons)

Notes:
* `public/` is generated and is gitignored.
* Do not edit generated files directly; update files in `icons/` and re-run `icons:sync`.

## Technology Stack

* **Core**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
* **Build Tool**: [Vite](https://vitejs.dev/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Visualization**: Three.js (for 3D cube rendering)

## Contributing

We welcome contributions! Whether it's fixing bugs, improving documentation, or creating new widgets.

Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for details.

## License

This project is licensed under the GPL License - see the **[LICENSE.md](LICENSE.md)** file for details.

## Acknowledgments

* Inspired by [csTimer](https://cstimer.net/) for setting the standard in web timers.
* Thanks to the speedcubing community for feedback and testing.
