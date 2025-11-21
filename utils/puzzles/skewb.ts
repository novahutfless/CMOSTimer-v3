
type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type SkewbState = Record<Face, string[]>;

export const getInitialStateSkewb = (): SkewbState => ({
    U: Array(5).fill('U'),
    R: Array(5).fill('R'),
    F: Array(5).fill('F'),
    D: Array(5).fill('D'),
    L: Array(5).fill('L'),
    B: Array(5).fill('B'),
});

export const applyMoveSkewb = (state: SkewbState, move: string) => {
    const base = move.charAt(0);
    const isPrime = move.includes("'");
    
    // Helper to swap entire faces
    // A -> B -> C -> A
    const cycleFaces = (fA: Face, fB: Face, fC: Face) => {
        const temp = [...state[fA]];
        state[fA] = [...state[fC]];
        state[fC] = [...state[fB]];
        state[fB] = temp;
    };
    
    // Helper to cycle 3 specific stickers
    // sA -> sB -> sC -> sA
    const cycleStickers = (
        fA: Face, iA: number, 
        fB: Face, iB: number, 
        fC: Face, iC: number
    ) => {
        const temp = state[fA][iA];
        state[fA][iA] = state[fC][iC];
        state[fC][iC] = state[fB][iB];
        state[fB][iB] = temp;
    };

    // Inverse helpers
    const cycleFacesInv = (fA: Face, fB: Face, fC: Face) => cycleFaces(fA, fC, fB);
    const cycleStickersInv = (fA: Face, iA: number, fB: Face, iB: number, fC: Face, iC: number) => cycleStickers(fA, iC, fB, iB, fC, iA); // sA<-sB<-sC

    // Helper dispatcher
    const apply = (
        faces: [Face, Face, Face], 
        stickers: [Face, number, Face, number, Face, number]
    ) => {
        if (isPrime) {
            cycleFacesInv(...faces);
            cycleStickers(stickers[0], stickers[1], stickers[4], stickers[5], stickers[2], stickers[3]);
        } else {
            cycleFaces(...faces);
            cycleStickers(...stickers);
        }
    };

    // Skewb Move Logic:
    // A standard Skewb move rotates half the puzzle (4 corners + 3 faces).
    // This effectively cycles 3 entire faces and 3 stickers from the remaining faces.
    
    // Indices: 0=Center, 1=NW, 2=NE, 3=SE, 4=SW

    if (base === 'R') {
        // Pivot D-R-B.
        // Moves faces R -> B -> D.
        // Outer stickers: U2(NE) -> L4(SW) -> F2(NE) ?
        // Logic: U-R-F corner (U2, R1, F1). R face moves to B. F face is fixed. U face is fixed.
        // The sticker U2 (SE) is adjacent to R and B.
        // Correct Cycle: U2 (SE) -> L4 (NW/SW?) -> F2 (NE).
        apply(['R', 'B', 'D'], ['U', 3, 'L', 4, 'F', 2]);
    }
    if (base === 'L') {
        // Pivot D-F-L.
        // Moves faces L -> F -> D.
        // Outer stickers: U4(SW) -> R4(NW) -> B2(NE).
        apply(['L', 'F', 'D'], ['U', 4, 'R', 4, 'B', 2]);
    }
    if (base === 'U') {
        // Pivot U-L-B.
        // Moves faces U -> L -> B.
        // Outer stickers: F1(NW) -> D4(SW) -> R1(NW).
        apply(['U', 'L', 'B'], ['F', 1, 'D', 4, 'R', 1]);
    }
    if (base === 'B') {
        // Pivot U-R-B.
        // Moves faces B -> R -> U.
        // Outer stickers: L1(NW) -> D3(SE) -> F2(NE).
        // Wait, check adjacency.
        // L1 (NW) touches U, B.
        // D3 (SE) touches B, L? No, D3 is adjacent to R, B (DRB corner).
        // Correct Cycle: L1 -> D3 -> F2.
        apply(['B', 'R', 'U'], ['L', 1, 'D', 3, 'F', 2]);
    }
};
