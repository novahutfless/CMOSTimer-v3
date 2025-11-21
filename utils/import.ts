
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
            scramble: scrambleStr.split(' '),
            scramblerId: '333', // Default, updated by importer logic
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
            scramble,
            scramblerId, // Use inferred scramblerId
            penalty,
            tags: ['Cubic Timer'],
            stats: { mean3: null, avg5: null, avg12: null }
        });
    }

    // We return session with embedded solves. 
    // The app logic in useAppStore processImport will normalize this.
    return {
        type: 'CubicTimer',
        sessions: [{
            id: generateId(),
            name: sessionName,
            scramblerId,
            solveIds: [], // unused in this context
            solves: solves as any, // Hack to pass solves to store
            tags: []
        } as any]
    };
};

export const parseImportData = (jsonString: string, fileName: string = ''): ParsedImport => {
    try {
        const data = JSON.parse(jsonString);
        
        // CMOSTimer
        if (data.version && data.sessions) {
            // If import is V3 (normalized), we need to denormalize for the importer preview logic OR 
            // handle normalized data directly.
            // Our importer hook handles denormalization on the fly.
            // But if it's normalized, `sessions` has `solveIds` and there is a `solves` map.
            if (data.solves) {
                // Normalized export
                const map = data.solves;
                const sessions = data.sessions.map((s: Session) => ({
                    ...s,
                    solves: s.solveIds.map(id => map[id]).filter(Boolean)
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
                sessions: data.sessions,
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
                        scramblerId,
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
