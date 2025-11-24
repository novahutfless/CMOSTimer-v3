
import { Session, Solve, Penalty, Settings, StatConfig } from '../types';
import { generateId } from './common';

export interface ParsedImport {
    type: 'CMOSTimer' | 'csTimer' | 'CubicTimer' | 'CMOSTimer v2';
    sessions: Session[];
    settings?: Settings;
    statsConfig?: StatConfig[];
}

const mapCsTimerScrambler = (scrType: string): string => {
    if (!scrType) return '333';
    if (scrType === '333') return '333';
    if (scrType === '222so') return '222';
    if (scrType === '444wca') return '444';
    if (scrType === '555wca') return '555';
    return '333';
};

const parseCsTimerSolves = (rawSolves: any[]): Solve[] => {
    return rawSolves.map(s => {
        const [pen, timeVal] = s[0];
        let penalty = Penalty.NONE;
        if (pen === 2000) penalty = Penalty.PLUS_TWO;
        if (pen === -1) penalty = Penalty.DNF;

        const scrambleStr = s[1];
        const comment = s[2];
        const timestamp = s[3] * 1000;

        return {
            id: generateId(),
            timestamp,
            time: timeVal,
            inspectionTime: -1,
            scramble: [scrambleStr.split(' ')], // Normalizing to array of arrays
            scramblerId: ['333'], // Default, updated by importer logic
            penalty,
            comment: comment || undefined,
            tags: ['csTimer']
        };
    });
};

const parseTime = (str: string): number => {
    const parts = str.split(':');
    let seconds = 0;
    if (parts.length === 2) {
        seconds += parseInt(parts[0]) * 60;
        seconds += parseFloat(parts[1]);
    } else {
        seconds += parseFloat(parts[0]);
    }
    return Math.round(seconds * 1000);
};

const parseCubicTimer = (text: string, fileName: string): ParsedImport => {
    let sessionName = 'Imported Session';
    let scramblerId = '333';

    if (fileName) {
        const name = fileName.replace(/\.txt$/i, '');
        const parts = name.split('_');
        if (parts[0] === 'Solves') {
             const datePartIndex = parts.findIndex(p => p.match(/^20\d\d/));
             if (datePartIndex > 1) {
                 const eventNameParts = parts.slice(1, datePartIndex);
                 sessionName = eventNameParts.join(' ');
                 const lowerName = sessionName.toLowerCase();
                 if (lowerName.includes('2x2')) scramblerId = '222';
                 else if (lowerName.includes('4x4')) scramblerId = '444';
                 else if (lowerName.includes('5x5')) scramblerId = '555';
             }
        } else {
            sessionName = name;
        }
    }

    const regex = /"([^"]*)";"([\s\S]*?)";"([\s\S]*?)";"([^"]*)"/g;
    const solves: Solve[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        const timeStr = match[1];
        const scrambleStr = match[2];
        const dateStr = match[3];
        const penaltyStr = match[4];

        let penalty = Penalty.NONE;
        if (penaltyStr === 'DNF') penalty = Penalty.DNF;
        else if (penaltyStr.includes('+2')) penalty = Penalty.PLUS_TWO;

        const time = parseTime(timeStr);
        const timestamp = new Date(dateStr).getTime();
        const scramble = scrambleStr.replace(/[\r\n]+/g, ' ').trim().split(/\s+/);

        solves.push({
            id: generateId(),
            timestamp,
            time,
            inspectionTime: -1,
            scramble: [scramble], // Normalizing
            scramblerId: [scramblerId], // Use inferred scramblerId
            penalty,
            tags: ['Cubic Timer']
        });
    }

    return {
        type: 'CubicTimer',
        sessions: [{
            id: generateId(),
            name: sessionName,
            scramblerId: [scramblerId],
            solveIds: [], 
            solves: solves as any,
            tags: []
        } as any]
    };
};

// --- CMOSTimer v2 Parsing ---

const mapV2Penalty = (val: number): Penalty => {
    if (val === -1) return Penalty.DNF;
    if (val === 0) return Penalty.NONE;
    if (val === 2000) return Penalty.PLUS_TWO;
    if (val === 4000) return Penalty.PLUS_FOUR;
    if (val === 6000) return Penalty.PLUS_SIX;
    if (val === 8000) return Penalty.PLUS_EIGHT;
    if (val === 10000) return Penalty.PLUS_TEN;
    if (val === 12000) return Penalty.PLUS_TWELVE;
    if (val === 14000) return Penalty.PLUS_FOURTEEN;
    if (val === 16000) return Penalty.PLUS_SIXTEEN;
    return Penalty.NONE;
};

const mapV2Scrambler = (type: string | number): string => {
    const t = type.toString();
    if (t === '333') return '333';
    if (t === '222') return '222';
    if (t === '444') return '444';
    if (t === '555') return '555';
    if (t === '666') return '666';
    if (t === '777') return '777';
    if (t === 'clock') return 'clock';
    if (t === 'pyram') return 'pyram';
    if (t === 'minx') return 'minx';
    if (t === 'skewb') return 'skewb';
    if (t === 'sq1') return 'sq1';
    return '333';
};

const parseCMOSTimerV2 = (data: any): ParsedImport => {
    // Explicit Validation
    if (!data.sessions) throw new Error("CMOSTimer v2: Missing 'sessions' key.");
    if (!Array.isArray(data.sessions)) throw new Error("CMOSTimer v2: 'sessions' is not an array.");
    
    const sessions: Session[] = [];
    const cachedSolves = data.cachedSolves || {};

    data.sessions.forEach((s: any, idx: number) => {
        if (!s) return;
        
        const scramblerIds: string[] = [];
        // scrambler is array of definitions e.g. [["wca", {type: 222}]]
        if (Array.isArray(s.scrambler)) {
            s.scrambler.forEach((def: any) => {
                if (Array.isArray(def) && def.length > 1 && def[1]?.type) {
                    scramblerIds.push(mapV2Scrambler(def[1].type));
                }
            });
        }
        if (scramblerIds.length === 0) scramblerIds.push('333');

        const solves: Solve[] = [];
        const solveIds = s.solves || [];

        if (!Array.isArray(solveIds)) {
            console.warn(`CMOSTimer v2 Import: Session ${idx} 'solves' is not an array. Skipping solves.`);
        } else {
            solveIds.forEach((oldId: any) => {
                const raw = cachedSolves[oldId];
                if (!raw) {
                    // If cachedSolve is missing, we skip it.
                    return;
                }

                const solve: Solve = {
                    id: generateId(),
                    timestamp: raw.end || raw.start || Date.now(),
                    time: raw.zeit,
                    inspectionTime: raw.inspect ?? -1,
                    scramble: [ (raw.scramble || '').trim().split(/\s+/) ],
                    scramblerId: scramblerIds,
                    penalty: mapV2Penalty(raw.penalty),
                    tags: ['CMOSTimer v2']
                };
                solves.push(solve);
            });
        }

        sessions.push({
            id: generateId(),
            name: s.name || 'Unnamed Session',
            scramblerId: scramblerIds,
            solves: solves as any,
            solveIds: [],
            tags: []
        } as any);
    });

    return {
        type: 'CMOSTimer v2',
        sessions
    };
};

export const parseImportData = (jsonString: string, fileName: string = ''): ParsedImport => {
    let data;
    let isJson = false;

    try {
        data = JSON.parse(jsonString);
        isJson = true;
    } catch (e) {
        // Not JSON
    }

    if (isJson && data) {
        // --- Format Detection ---

        // 1. CMOSTimer v2
        // Detection: Has initCount OR (has sessions array AND cachedSolves object)
        if (data.initCount !== undefined || (data.sessions && data.cachedSolves)) {
            try {
                return parseCMOSTimerV2(data);
            } catch (e: any) {
                throw new Error(`CMOSTimer v2 Import Failed: ${e.message}`);
            }
        }

        // 2. CMOSTimer v3
        if (data.version && data.sessions) {
            try {
                // Normalized export
                const map = data.solves || {};
                const sessions = data.sessions.map((s: Session) => ({
                    ...s,
                    // Ensure session scrambler ID is array
                    scramblerId: Array.isArray(s.scramblerId) ? s.scramblerId : [s.scramblerId || '333'],
                    solves: s.solveIds.map(id => {
                        const slv = map[id];
                        if (!slv) return null;
                        // Normalize solve properties, remove stats
                        const { stats, ...cleanSolve } = slv;
                        return {
                            ...cleanSolve,
                            scramble: Array.isArray(slv.scramble) && Array.isArray(slv.scramble[0]) ? slv.scramble : [slv.scramble], // Handle legacy
                            scramblerId: Array.isArray(slv.scramblerId) ? slv.scramblerId : [slv.scramblerId || '333']
                        };
                    }).filter(Boolean)
                }));
                
                // Fallback for legacy v3 embedded (no solves map)
                if (!data.solves) {
                     const legacySessions = data.sessions.map((s: any) => ({
                        ...s,
                        scramblerId: Array.isArray(s.scramblerId) ? s.scramblerId : [s.scramblerId || '333'],
                        solves: s.solves ? s.solves.map((slv: any) => {
                            const { stats, ...clean } = slv;
                            return {
                                ...clean,
                                scramble: Array.isArray(slv.scramble) && Array.isArray(slv.scramble[0]) ? slv.scramble : [slv.scramble],
                                scramblerId: Array.isArray(slv.scramblerId) ? slv.scramblerId : [slv.scramblerId || '333']
                            };
                        }) : []
                    }));
                    return { type: 'CMOSTimer', sessions: legacySessions, settings: data.settings, statsConfig: data.statsConfig };
                }

                return {
                    type: 'CMOSTimer',
                    sessions,
                    settings: data.settings,
                    statsConfig: data.statsConfig
                };
            } catch (e: any) {
                throw new Error(`CMOSTimer v3 Import Failed: ${e.message}`);
            }
        }

        // 3. csTimer
        if (data.properties && data.session1) {
            try {
                const sessions: Session[] = [];
                let sessionData: any = {};
                try { sessionData = JSON.parse(data.properties.sessionData); } catch (e) {}

                Object.keys(data).forEach(key => {
                    if (key.startsWith('session')) {
                        const sessionIdx = key.replace('session', '');
                        const rawSolves = data[key];
                        const meta = sessionData[sessionIdx];
                        if (rawSolves.length === 0 && !meta) return;

                        const name = meta && meta.name ? meta.name.toString() : `Session ${sessionIdx}`;
                        const scrType = meta && meta.opt ? meta.opt.scrType : '333';
                        const scramblerId = mapCsTimerScrambler(scrType);
                        const solves = parseCsTimerSolves(rawSolves);

                        sessions.push({
                            id: generateId(),
                            name,
                            scramblerId: [scramblerId],
                            solves: solves as any,
                            solveIds: [],
                            tags: []
                        } as any);
                    }
                });
                return { type: 'csTimer', sessions };
            } catch (e: any) {
                throw new Error(`csTimer Import Failed: ${e.message}`);
            }
        }
    }

    // 4. Cubic Timer (Text)
    if (jsonString.trim().startsWith('"') || jsonString.includes('";"')) {
        try {
            const parsed = parseCubicTimer(jsonString, fileName);
            if (parsed.sessions[0] && (parsed.sessions[0] as any).solves.length > 0) return parsed;
        } catch (e: any) {
            throw new Error(`Cubic Timer Import Failed: ${e.message}`);
        }
    }

    if (isJson) {
        throw new Error('Unknown JSON file format. Structure not recognized as CMOSTimer (v2/v3) or csTimer.');
    }

    throw new Error('Unknown file format. Please provide a valid JSON or text export.');
};
