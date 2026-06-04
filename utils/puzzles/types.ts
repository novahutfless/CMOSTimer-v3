export interface PuzzleInterface<T> {
    getInitialState: (params?: unknown) => T;
    applyMove: (state: T, move: string, params?: unknown) => void;
}
