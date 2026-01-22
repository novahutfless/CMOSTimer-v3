
import { FullStateData, Settings } from './models';
import { Penalty, ScramblerCategory } from './enums';

export interface PluginWidgetDefinition {
    id: string;
    name: string;
    render: (container: HTMLElement) => void;
    cleanup?: () => void;
}

export interface CustomScramblerDefinition {
    id: string;
    name: string;
    category: ScramblerCategory | string;
    visualizer: string; // PuzzleType enum or custom string
    generate: (length?: number, customConfig?: unknown) => string[];
}

export interface CustomRendererDefinition {
    visualizerType: string;
    render: (container: HTMLElement, scramble: string[], config: unknown) => void;
    cleanup?: () => void;
}

export interface CMOSApi {
    // State Access
    getState: () => FullStateData;
    
    // Actions
    addSolve: (time: number, penalty?: Penalty) => void;
    updateSettings: (settings: Partial<Settings>) => void;
    toast: (message: string) => void;
    
    // Registration
    registerWidget: (id: string, name: string, render: (el: HTMLElement) => void, cleanup?: () => void) => void;
    registerScrambler: (definition: CustomScramblerDefinition) => void;
    registerScrambleRenderer: (visualizerType: string, render: (el: HTMLElement, scramble: string[], config: unknown) => void, cleanup?: () => void) => void;

    // Lifecycle
    onCleanup: (callback: () => void) => void;

    // Interaction
    alert: (message: string) => Promise<void>;
    prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

export interface PluginScript {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
}
