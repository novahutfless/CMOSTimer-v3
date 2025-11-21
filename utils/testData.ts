
import { Session, Solve, Penalty } from '../types';
import { generateId } from './common';
import { calculateSolveStats } from './math';
import { generateScramble } from './scramble';

export const generateTestSessions = (): any[] => {
    const now = Date.now();
    const createSolves = (count: number, minTime: number, maxTime: number): Solve[] => {
        const solves: Solve[] = [];
        let timeCursor = now - (count * 60000);
        
        for(let i = 0; i < count; i++) {
            timeCursor += Math.random() * 60000;
            const rawTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
            
            const solve: Solve = {
                id: generateId() + i,
                timestamp: timeCursor,
                time: rawTime,
                inspectionTime: -1,
                scramble: generateScramble('333'),
                scramblerId: ['333'],
                penalty: Penalty.NONE,
                stats: { mean3: null, avg5: null, avg12: null }
            };
            
            solve.stats = calculateSolveStats(solve, solves);
            solves.push(solve);
        }
        return solves;
    };

    return [
        { 
            id: 'default', 
            name: 'Default Session', 
            scramblerId: '333',
            solves: createSolves(20, 1000, 60000) 
        },
        {
            id: 'benchmark',
            name: 'Big Session (5k)',
            scramblerId: '333',
            solves: createSolves(5000, 1000, 600000)
        }
    ];
};
