export const rand = (n: number): number => Math.floor(Math.random() * n);
export const pick = <T>(arr: T[]): T => arr[rand(arr.length)];
