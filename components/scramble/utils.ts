
import { ScrambleImageConfig } from '../../types';

export const DEFAULT_FACE_COLORS = {
    // NxN
    U: '#FFFFFF', R: '#DC2626', F: '#16A34A', D: '#EAB308', L: '#EA580C', B: '#2563EB',
    // Megaminx extra faces default
    face7: '#888', face8: '#888', face9: '#888', face10: '#888', face11: '#888', face12: '#888'
};

export const getFaceColor = (faceId: string, config?: ScrambleImageConfig) => {
    if (!faceId) return '#333';
    if (config && config.faceColors) {
        const userColor = (config.faceColors as any)[faceId];
        if (userColor) return userColor;
    }
    // Fallback for mapped Pyraminx keys if not in config explicit
    if (faceId === 'g') return DEFAULT_FACE_COLORS.F;
    if (faceId === 'y') return DEFAULT_FACE_COLORS.D;
    if (faceId === 'b') return DEFAULT_FACE_COLORS.B;
    if (faceId === 'r') return DEFAULT_FACE_COLORS.R;

    return (DEFAULT_FACE_COLORS as any)[faceId] || '#333';
};

export interface ScrambleRendererProps<T> {
    state: T;
    config?: ScrambleImageConfig;
    className?: string;
    width?: number | string;
    height?: number | string;
}
