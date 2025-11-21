
import { Solve } from '../types';

export const isSameYear = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear();
export const isSameMonth = (d1: Date, d2: Date) => isSameYear(d1, d2) && d1.getMonth() === d2.getMonth();
export const isSameDay = (d1: Date, d2: Date) => isSameMonth(d1, d2) && d1.getDate() === d2.getDate();

export const getHeatmapData = (solves: Solve[], filter: 'all' | 'year' | 'month') => {
    const now = new Date();
    const grid = Array(7).fill(0).map(() => Array(24).fill(0));
    solves.forEach(s => {
        const d = new Date(s.timestamp);
        if (filter === 'year' && !isSameYear(d, now)) return;
        if (filter === 'month' && !isSameMonth(d, now)) return;
        let day = d.getDay() - 1;
        if (day < 0) day = 6; 
        const hour = d.getHours();
        grid[day][hour]++;
    });
    let max = 0;
    grid.forEach(row => row.forEach(val => max = Math.max(max, val)));
    return { grid, max };
};

export const getDayName = (idx: number, lang: string = 'en-US') => {
    const d = new Date();
    const currentDay = d.getDay();
    const distance = (1 + 7 - currentDay) % 7; 
    d.setDate(d.getDate() + distance + idx); 
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysDe = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return lang === 'de' ? daysDe[idx] : days[idx];
};

// Goal Helpers
export const getStartOfDay = (now: number) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

export const getStartOfWeek = (now: number) => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

export const getStartOfMonth = (now: number) => {
    const d = new Date(now);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

export const getStartOfYear = (now: number) => {
    const d = new Date(now);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};
