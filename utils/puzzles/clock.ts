
export type ClockState = { dials: number[], pins: boolean[] };

// Dials: 0-8 Front, 9-17 Back
// Pins: [UL, UR, DR, DL] (true = UP)

export const getInitialStateClock = (): ClockState => ({
    dials: Array(18).fill(0), 
    pins: [false, false, false, false] 
});

export const applyMoveClock = (state: ClockState, move: string) => {
    if (move === 'y2') {
        // Swap Front and Back dials physically
        const front = state.dials.slice(0, 9);
        const back = state.dials.slice(9, 18);
        state.dials = [...back, ...front];
        
        // Swap Pins: Left <-> Right
        // Front UL (0) becomes UR. UR (1) becomes UL.
        const [ul, ur, dr, dl] = state.pins;
        state.pins = [ur, ul, dl, dr];
        return;
    }

    // Explicit Pin moves (Pre-2025 or interaction)
    if (['UR', 'DR', 'DL', 'UL'].includes(move)) {
        const idx = ['UL', 'UR', 'DR', 'DL'].indexOf(move);
        if (idx !== -1) state.pins[idx] = !state.pins[idx]; // Toggle logic usually, or set Up? Scramble implies Set Up.
        // But usually scrambles list active pins. We'll assume explicit pin instruction sets it UP.
        if (idx !== -1) state.pins[idx] = true;
        return;
    }

    const match = move.match(/([A-Z]+)(\d+)([+-])/);
    if (match) {
        const type = match[1];
        const amount = parseInt(match[2]);
        const dir = match[3] === '+' ? 1 : -1;
        const delta = amount * dir;

        // 1. Determine Active Pins for this move type
        // The move string defines the pin configuration
        const pins = [false, false, false, false]; // UL, UR, DR, DL
        if (type === 'ALL') { pins.fill(true); }
        else {
            if (type.includes('UR')) pins[1] = true;
            if (type.includes('DR')) pins[2] = true;
            if (type.includes('DL')) pins[3] = true;
            if (type.includes('UL')) pins[0] = true;
            
            // Single/Double letter logic if not specific pin combo (e.g. U, R)
            if (type === 'U') { pins[0] = true; pins[1] = true; }
            if (type === 'D') { pins[3] = true; pins[2] = true; }
            if (type === 'L') { pins[0] = true; pins[3] = true; }
            if (type === 'R') { pins[1] = true; pins[2] = true; }
        }
        
        // Update state pins to match the move (visualizers usually show state after move)
        state.pins = [...pins];

        // 2. Apply Rotation to Front
        // Dials: 
        // 0 1 2
        // 3 4 5
        // 6 7 8
        // Corner dials (0,2,6,8) move if their pin is UP.
        // Edge dials (1,3,5,7) move if adjacent corner pin is UP.
        // Center (4) moves if ANY pin is UP.

        const isAffected = (i: number, activePins: boolean[]) => {
            if (i === 0) return activePins[0]; // UL
            if (i === 2) return activePins[1]; // UR
            if (i === 8) return activePins[2]; // DR
            if (i === 6) return activePins[3]; // DL
            if (i === 1) return activePins[0] || activePins[1]; // U
            if (i === 5) return activePins[1] || activePins[2]; // R
            if (i === 7) return activePins[3] || activePins[2]; // D
            if (i === 3) return activePins[0] || activePins[3]; // L
            if (i === 4) return activePins.some(p => p); // Center
            return false;
        };

        // Apply to Front (0-8)
        for (let i = 0; i < 9; i++) {
            if (isAffected(i, pins)) {
                state.dials[i] = (state.dials[i] + delta + 120) % 12; // +120 to ensure positive mod
            }
        }

        // 3. Apply to Back (9-17)
        // Mechanical link: Front UL pin UP -> Disconnected from Back.
        // Front UL pin DOWN -> Connected to Back.
        // So Back dials move if the corresponding Front pin is DOWN (false).
        // Note: Rotation direction is inverted on back (looking from back).
        // Mapping: 
        // Front 0 (UL) backs Back 11 (UR relative to back) ? 
        // Let's align indices. 
        // Back Face Layout (Indices 9-17):
        // 9  10 11
        // 12 13 14
        // 15 16 17
        // Physical mapping:
        // Front UL (Pin 0) is physically Back UR (Index 11).
        // Front UR (Pin 1) is physically Back UL (Index 9).
        // Front DL (Pin 3) is physically Back DR (Index 17).
        // Front DR (Pin 2) is physically Back DL (Index 15).

        const backPins = [
            !pins[1], // Back UL (9) corresponds to Front UR
            !pins[0], // Back UR (11) corresponds to Front UL
            !pins[3], // Back DR (17) corresponds to Front DL
            !pins[2]  // Back DL (15) corresponds to Front DR
        ];

        // Apply to Back indices using the same affected logic, but mapped to 9-17
        for (let i = 0; i < 9; i++) {
            if (isAffected(i, backPins)) {
                state.dials[i + 9] = (state.dials[i + 9] - delta + 120) % 12;
            }
        }
    }
};
