
// Pyraminx Logic
// Faces: F (Green), L (Blue), R (Red), D (Yellow)
// Layout:
// F is Point Up. Indices: 0(Tip), 1(L-e), 2(C), 3(R-e), 4(L-c), 5(C), 6(D-e), 7(C), 8(R-c)
// L, R, D are Point Down. Indices: 0(Tip), 1(R-e), 2(C), 3(L-e), 4(R-c), 5(C), 6(Top-e), 7(C), 8(L-c)
// Note: Point Down indices are rotated 180.
// Index map for Point Down (Row 0=Top Wide, Row 2=Tip Bottom):
// Row 0: 8 7 6 5 4
// Row 1: 3 2 1
// Row 2: 0

export type PyraState = Record<string, string[]>;

export const getInitialStatePyra = (): PyraState => ({
    F: Array(9).fill('F'), // Green
    L: Array(9).fill('L'), // Blue
    R: Array(9).fill('R'), // Red
    D: Array(9).fill('D')  // Yellow
});

export const applyMovePyra = (state: PyraState, move: string) => {
    const base = move.charAt(0);
    const isPrime = move.includes("'");
    
    const cycle = (a: any, b: any, c: any) => { 
        const temp = a.val; a.val = c.val; c.val = b.val; b.val = temp;
    };
    const cycleInv = (a: any, b: any, c: any) => { 
        const temp = a.val; a.val = b.val; b.val = c.val; c.val = temp;
    };
    const rot = (p1: any, p2: any, p3: any) => isPrime ? cycleInv(p1,p2,p3) : cycle(p1,p2,p3);
    
    const ref = (face: string, idx: number) => ({
        get val() { return state[face][idx]; },
        set val(v) { state[face][idx] = v; }
    });

    // Moves defined by Corner rotation (Clockwise)

    // U Move (Top Corner): F(Up), L(Down), R(Down)
    if (base === 'U' || base === 'u') {
        rot(ref('F',0), ref('L',8), ref('R',4)); // Tips
        if (base === 'U') {
            rot(ref('F',2), ref('L',7), ref('R',5)); // Centers
            rot(ref('F',3), ref('L',6), ref('R',1)); // Edges 1
            rot(ref('F',1), ref('L',3), ref('R',6)); // Edges 2 (Wait, check derivation)
            // Correction from thought process:
            // Cycle 1: F3 -> L3 -> R6 -> F3 ? No, previous derivation: F3->L6->R1->F3 ?
            // Let's re-apply consistent derivation:
            // F->L->R->F
            // F Right Edge (3) -> L Right Edge (Rel to U) which is L-R boundary (6)? No.
            // Let's use the pairs.
            // Pair (F3, R1) -> Pair (L3, F1) -> Pair (R6, L6) -> Pair (F3, R1)
            // No, that was mixing cycles.
            // Let's trust standard algo mapping:
            // U = L->R->F? No F->L->R.
            
            // Re-derivation simplified:
            // U corner pieces:
            // F1/L3, F3/R1, L6/R6 (Edges)
            // F2, L7, R5 (Centers)
            // Cycle F->L->R:
            // F3(R-edge) -> L6(Top-edge) -> R1(L-edge) -> F3
            // F1(L-edge) -> L3(R-edge) -> R6(Top-edge) -> F1
            
            // Using indices from code comments:
            // F3 -> L6 -> R1
            rot(ref('F',3), ref('L',6), ref('R',1));
            // F1 -> L3 -> R6
            rot(ref('F',1), ref('L',3), ref('R',6));
        }
    }

    // L Move (Left Corner): F, D, L
    // Cycle F -> D -> L -> F
    if (base === 'L' || base === 'l') {
        rot(ref('F',4), ref('D',4), ref('L',0)); // Tips
        if (base === 'L') {
            rot(ref('F',5), ref('D',5), ref('L',2)); // Centers
            // Edges
            // F6 -> D1 -> L3
            rot(ref('F',6), ref('D',1), ref('L',3));
            // F1 -> D6 -> L1 (Note: F1 and L3 are shared in U, but here L3 moves to F6 position?)
            // No, L3 is on L-F boundary. F1 is on F-L boundary.
            // Pair (F1, L3).
            // F6/D6 is F-D. D1/L1 is D-L.
            // Cycle: F-D -> D-L -> L-F.
            // Pair (F6, D6) -> Pair (D1, L1) -> Pair (L3, F1)
            // F6 -> D1 -> L3 -> F6
            // D6 -> L1 -> F1 -> D6
            rot(ref('D',6), ref('L',1), ref('F',1));
        }
    }

    // R Move (Right Corner): F, R, D
    // Cycle F -> R -> D -> F
    if (base === 'R' || base === 'r') {
        rot(ref('F',8), ref('R',0), ref('D',8)); // Tips
        if (base === 'R') {
            rot(ref('F',7), ref('R',2), ref('D',7)); // Centers
            // Edges
            // F-R (F3, R1) -> R-D (R3, D3) -> D-F (D6, F6)
            // F3 -> R3 -> D6
            rot(ref('F',3), ref('R',3), ref('D',6));
            // R1 -> D3 -> F6
            rot(ref('R',1), ref('D',3), ref('F',6));
        }
    }

    // B Move (Back Corner): L, R, D
    // Cycle L -> R -> D -> L
    if (base === 'B' || base === 'b') {
        rot(ref('L',4), ref('R',8), ref('D',0)); // Tips (L TopL, R TopR, D Bot)
        if (base === 'B') {
            rot(ref('L',5), ref('R',7), ref('D',2)); // Centers
            // Edges
            // L-R (L6, R6) -> R-D (R3, D3) -> D-L (D1, L1)
            // L6 -> R3 -> D1
            rot(ref('L',6), ref('R',3), ref('D',1));
            // R6 -> D3 -> L1
            rot(ref('R',6), ref('D',3), ref('L',1));
        }
    }
};
