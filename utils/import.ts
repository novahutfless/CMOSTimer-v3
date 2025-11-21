
import { Session, Solve, Penalty, Settings, StatConfig } from '../types';
import { generateId } from './common';

export interface ParsedImport {
    type: 'CMOSTimer' | 'csTimer' | 'CubicTimer';
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
            tags: ['csTimer'],
            stats: { mean3: null, avg5: null, avg12: null }
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
            tags: ['Cubic Timer'],
            stats: { mean3: null, avg5: null, avg12: null }
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

export const parseImportData = (jsonString: string, fileName: string = ''): ParsedImport => {
    try {
        const data = JSON.parse(jsonString);
        
        // CMOSTimer
        if (data.version && data.sessions) {
            if (data.solves) {
                // Normalized export
                const map = data.solves;
                const sessions = data.sessions.map((s: Session) => ({
                    ...s,
                    // Ensure session scrambler ID is array
                    scramblerId: Array.isArray(s.scramblerId) ? s.scramblerId : [s.scramblerId || '333'],
                    solves: s.solveIds.map(id => {
                        const slv = map[id];
                        if (!slv) return null;
                        // Normalize solve properties
                        return {
                            ...slv,
                            scramble: Array.isArray(slv.scramble) && Array.isArray(slv.scramble[0]) ? slv.scramble : [slv.scramble], // Handle legacy
                            scramblerId: Array.isArray(slv.scramblerId) ? slv.scramblerId : [slv.scramblerId || '333']
                        };
                    }).filter(Boolean)
                }));
                return {
                    type: 'CMOSTimer',
                    sessions,
                    settings: data.settings,
                    statsConfig: data.statsConfig
                };
            }

            // Legacy embedded export
            return {
                type: 'CMOSTimer',
                sessions: data.sessions.map((s: any) => ({
                    ...s,
                    scramblerId: Array.isArray(s.scramblerId) ? s.scramblerId : [s.scramblerId || '333'],
                    solves: s.solves ? s.solves.map((slv: any) => ({
                        ...slv,
                        scramble: Array.isArray(slv.scramble) && Array.isArray(slv.scramble[0]) ? slv.scramble : [slv.scramble],
                        scramblerId: Array.isArray(slv.scramblerId) ? slv.scramblerId : [slv.scramblerId || '333']
                    })) : []
                })),
                settings: data.settings,
                statsConfig: data.statsConfig
            };
        }

        // csTimer
        if (data.properties && data.session1) {
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
        }
    } catch (e) {}

    if (jsonString.trim().startsWith('"') || jsonString.includes('";"')) {
        const parsed = parseCubicTimer(jsonString, fileName);
        if (parsed.sessions[0] && (parsed.sessions[0] as any).solves.length > 0) return parsed;
    }

    throw new Error('Unknown file format');
};
