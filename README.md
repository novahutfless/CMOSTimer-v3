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
* **Developer Friendly**: Written in strict TypeScript with a plugin-ready architecture.

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/TODO/CMOSTimer-v3.git
cd CMOSTimer-v3

```

2. **Install dependencies**
```bash
npm install

```

3. **Run the development server**
```bash
npm run dev

```

Open `http://localhost:5173` (or the port shown in your terminal) to view the app.
4. **Build for production**
```bash
npm run build

```

## Technology Stack

* **Core**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
* **Build Tool**: [Vite](https://vitejs.dev/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Visualization**: Three.js (for 3D cube rendering)

## Contributing

We welcome contributions! Whether it's fixing bugs, improving documentation, or creating new widgets.

Please read **[CONTRIBUTING.md](https://www.google.com/search?q=CONTRIBUTING.md)** for details.

## License

This project is licensed under the GPL License - see the **[LICENSE.md](LICENSE.md)** file for details.

## Acknowledgments

* Inspired by [csTimer](https://cstimer.net/) for setting the standard in web timers.
* Thanks to the speedcubing community for feedback and testing.