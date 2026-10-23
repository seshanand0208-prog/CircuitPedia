# CircuitPedia

**The world of circuits simplified.**

CircuitPedia is a free, browser-based study and simulation platform for anyone learning electronics. Open a circuit, change its values, and watch the graphs and observation tables update instantly from a real simulation engine. It needs no hardware, installation, or backend.

<!-- Add a screenshot or demo GIF here -->
<!-- ![CircuitPedia Demo](docs/demo.gif) -->

## Features

- **Circuit library:** 40 circuits across four domains: Basic Electrical and Circuit Theory, Analog Electronics, Linear ICs and Op-Amps, and Digital Logic.
- **Search and filters:** search by name, component, or topic; filter by domain and difficulty; sort the list.
- **Progress tracking:** save favorites and mark circuits as done.
- **Complete study page:** aim, theory, components, formulas, lab procedure, and viva questions with answers.
- **Live simulation:** adjust parameters and see the schematic, waveforms, and tables update instantly, with simulated results compared against theoretical values.
- **Quick Solver Desk:** calculators for resistor color bands, 555 timer, op-amp gain, RC filter cutoff, and RLC resonance.
- **Lab diagnostics:** "Spot the Circuit Bug" fault-finding cases and viva flashcards.
- **Simulator:** a full circuit editor for building and testing your own designs.
- **Ask Assistant:** built-in help for circuit questions.
- **Light and dark themes:** dark circuit-board look by default, with a toggle.

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Custom circuit simulation engine written in TypeScript

All processing runs in the browser.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Installation

```bash
git clone https://github.com/<your-username>/circuitpedia.git
cd circuitpedia
npm install
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
circuitpedia/
├── src/
│   ├── engine/        # Simulation engine (circuit solver)
│   ├── components/    # UI components
│   ├── data/          # Circuit definitions (JSON)
│   └── App.tsx
├── public/
└── package.json
```

Adjust the folder names above to match your project.

## Adding a New Circuit

Each circuit is a JSON entry that defines its title, domain, difficulty, components, editable parameters, analysis type, theory, formulas, procedure, and viva questions. To add one, create a new entry in the circuit data folder. No code changes are needed.

## Roadmap

- More circuits (communication systems, VLSI)
- Exportable lab record as PDF
- Additional components and sensors
- Shareable circuit links

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Open a pull request

