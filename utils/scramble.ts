
import { ScrambleType, ScramblerCategory } from '../types';

export interface ScramblerDefinition {
  id: string;
  name: string;
  category: ScramblerCategory;
  visualizer: ScrambleType;
  generate: (length?: number, customConfig?: any) => string[];
}

// --- Helper Functions ---
const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(arr: T[]): T => arr[rand(arr.length)];

// General NxN Generator
const generateNxN = (size: number, length: number): string[] => {
  const moves: string[] = [];
  const axisMap = ['x', 'y', 'z'];
  const faceMap = [['R', 'L'], ['U', 'D'], ['F', 'B']];
  const suffixes = ['', "'", '2'];
  
  // For 4x4+, wide moves
  const isBig = size > 3;

  let lastAxis = -1;
  let secondLastAxis = -1;

  for (let i = 0; i < length; i++) {
    let axis;
    do {
      axis = rand(3);
    } while (axis === lastAxis || axis === secondLastAxis); // Simplistic axis exclusion

    if (axis !== lastAxis) {
        secondLastAxis = -1;
    } else {
        secondLastAxis = lastAxis;
    }
    lastAxis = axis;

    const faceIdx = rand(2);
    const face = faceMap[axis][faceIdx];
    const suffix = pick(suffixes);
    
    // Big cube logic (simplified: occasionally add 'w')
    // 6x6/7x7 logic usually involves 3Rw etc, simplified here to Rw
    let move = face;
    if (isBig) {
        // For 6x6/7x7, we might want 3Uw etc, but basic wide moves suffice for simple scrambler
        const wide = Math.random();
        if (size >= 6) {
            if (wide > 0.8) move = '3' + move + 'w';
            else if (wide > 0.6) move += 'w';
        } else {
            if (wide > 0.7) move += 'w';
        }
    }
    
    moves.push(move + suffix);
  }
  return moves;
};

const generatePyraminx = (): string[] => {
    const moves = [];
    const core = ['U', 'L', 'R', 'B'];
    const tips = ['u', 'l', 'r', 'b'];
    const suffixes = ['', "'"];
    
    let last = -1;
    for(let i=0; i<11; i++) {
        let idx;
        do { idx = rand(4); } while (idx === last);
        last = idx;
        moves.push(core[idx] + pick(suffixes));
    }
    
    tips.forEach(t => {
        if (Math.random() > 0.5) {
            moves.push(t + pick(suffixes));
        }
    });
    return moves;
};

const generateSkewb = (): string[] => {
    const moves = [];
    const faces = ['R', 'L', 'U', 'B']; // Fixed Corner notation
    const suffixes = ['', "'"];
    let last = -1;
    
    for(let i=0; i<10; i++) {
        let idx;
        do { idx = rand(4); } while (idx === last);
        last = idx;
        moves.push(faces[idx] + pick(suffixes));
    }
    return moves;
};

const generateClock = (variant: 'wca' | 'no0' | 'pre2025' = 'wca'): string[] => {
    const moves: string[] = [];
    
    // Helper to generate a turn move like UR4+
    const addMove = (type: string) => {
        const turn = rand(12) - 5; // -5 to 6
        const suffix = turn >= 0 ? `${turn}+` : `${Math.abs(turn)}-`;
        
        // Handle no0 variant
        if (turn === 0 && variant === 'no0') return;
        
        moves.push(`${type}${suffix}`);
    };

    // Sequence 1: Side A
    const seq1 = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"];
    seq1.forEach(m => addMove(m));

    moves.push("y2");

    // Sequence 2: Side B
    const seq2 = ["U", "R", "D", "L", "ALL"];
    seq2.forEach(m => addMove(m));

    // Pre-2025 Pins (random subset)
    if (variant === 'pre2025') {
        const pins = ["UR", "DR", "DL", "UL"];
        pins.forEach(p => {
            if (Math.random() > 0.5) moves.push(p);
        });
    }
    
    return moves;
};

const generateCustom = (config?: { moves: string, opposites: string, length: number }): string[] => {
    // Provide default config if undefined to prevent crashes
    const cfg = config || { moves: "U D R L F B", opposites: "U-D R-L F-B", length: 20 };
    
    const pool = cfg.moves.split(/[\s,]+/).filter(x => x);
    if (pool.length === 0) return [];

    const opposites = new Map<string, string>();
    if (cfg.opposites) {
        cfg.opposites.split(/[\s,]+/).forEach(pair => {
            const [a, b] = pair.split('-');
            if (a && b) {
                opposites.set(a, b);
                opposites.set(b, a);
            }
        });
    }

    const result: string[] = [];
    let lastMove = "";
    let secondLastMove = "";

    for (let i = 0; i < cfg.length; i++) {
        let move;
        let attempts = 0;
        do {
            move = pick(pool);
            attempts++;
        } while (
            (move === lastMove || (opposites.get(move) === lastMove && move === secondLastMove)) 
            && attempts < 20
        );

        result.push(move);
        secondLastMove = lastMove;
        lastMove = move;
    }
    return result;
};

// --- Scrambler Registry ---
export const SCRAMBLERS: ScramblerDefinition[] = [
    // WCA
    { id: '333', name: '3x3x3', category: ScramblerCategory.WCA, visualizer: ScrambleType.THREE, generate: () => generateNxN(3, 20) },
    { id: '222', name: '2x2x2', category: ScramblerCategory.WCA, visualizer: ScrambleType.TWO, generate: () => generateNxN(2, 9) },
    { id: '444', name: '4x4x4', category: ScramblerCategory.WCA, visualizer: ScrambleType.FOUR, generate: () => generateNxN(4, 40) },
    { id: '555', name: '5x5x5', category: ScramblerCategory.WCA, visualizer: ScrambleType.FIVE, generate: () => generateNxN(5, 60) },
    { id: '666', name: '6x6x6', category: ScramblerCategory.WCA, visualizer: ScrambleType.SIX, generate: () => generateNxN(6, 80) },
    { id: '777', name: '7x7x7', category: ScramblerCategory.WCA, visualizer: ScrambleType.SEVEN, generate: () => generateNxN(7, 100) },
    { id: 'pyram', name: 'Pyraminx', category: ScramblerCategory.WCA, visualizer: ScrambleType.PYRAMINX, generate: () => generatePyraminx() },
    { id: 'skewb', name: 'Skewb', category: ScramblerCategory.WCA, visualizer: ScrambleType.SKEWB, generate: () => generateSkewb() },
    
    // Clock Variants
    { id: 'clock', name: 'Clock', category: ScramblerCategory.WCA, visualizer: ScrambleType.CLOCK, generate: () => generateClock('wca') },
    { id: 'clock_no0', name: 'Clock (No 0)', category: ScramblerCategory.WCA, visualizer: ScrambleType.CLOCK, generate: () => generateClock('no0') },
    { id: 'clock_pre2025', name: 'Clock (Pre-2025)', category: ScramblerCategory.WCA, visualizer: ScrambleType.CLOCK, generate: () => generateClock('pre2025') },

    // Subsets
    { 
        id: '2gen_ru', 
        name: '<R, U>', 
        category: ScramblerCategory.SUBSETS, 
        visualizer: ScrambleType.THREE, 
        generate: () => generateCustom({ moves: "R R' R2 U U' U2", opposites: "R-U", length: 25 }) 
    },
    { 
        id: '2gen_lu', 
        name: '<L, U>', 
        category: ScramblerCategory.SUBSETS, 
        visualizer: ScrambleType.THREE, 
        generate: () => generateCustom({ moves: "L L' L2 U U' U2", opposites: "L-U", length: 25 }) 
    },
    { 
        id: '3gen_ruf', 
        name: '<R, U, F>', 
        category: ScramblerCategory.SUBSETS, 
        visualizer: ScrambleType.THREE, 
        generate: () => generateCustom({ moves: "R R' R2 U U' U2 F F' F2", opposites: "", length: 30 }) 
    },
    { 
        id: 'edges_only', 
        name: 'Edges Only (180)', 
        category: ScramblerCategory.SUBSETS, 
        visualizer: ScrambleType.THREE, 
        generate: () => generateCustom({ moves: "R2 L2 U2 D2 F2 B2", opposites: "R2-L2 U2-D2 F2-B2", length: 20 }) 
    },
    // Custom
    { 
        id: 'custom', 
        name: 'User Defined', 
        category: ScramblerCategory.CUSTOM, 
        visualizer: ScrambleType.THREE, // Default to 3x3 vis
        generate: (_len, config) => generateCustom(config)
    }
];

export const getScrambler = (id: string): ScramblerDefinition => {
    return SCRAMBLERS.find(s => s.id === id) || SCRAMBLERS[0];
};

export const generateScramble = (scramblerId: string, customConfig?: any): string[] => {
    const scrambler = getScrambler(scramblerId);
    if (scrambler.id === 'custom' && customConfig) {
        return scrambler.generate(0, customConfig);
    }
    return scrambler.generate();
};

export const getScramblersByCategory = () => {
    const grouped: Record<string, ScramblerDefinition[]> = {};
    Object.values(ScramblerCategory).forEach(c => grouped[c] = []);
    SCRAMBLERS.forEach(s => {
        if (grouped[s.category]) grouped[s.category].push(s);
    });
    return grouped;
};
