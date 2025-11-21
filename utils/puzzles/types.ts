

export interface PuzzleInterface<T> {
    getInitialState: (params?: any) => T;
    applyMove: (state: T, move: string, params?: any) => void;
}