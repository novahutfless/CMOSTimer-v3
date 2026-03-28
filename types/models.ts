import { Penalty, PuzzleType, StartInputMethod, TimePrecision, InspectionDirection, InspectionVoice, PBVisualType, AppTheme, Language, StatType, ShortcutAction, WidgetId, GoalType, GoalFrequency, GoalScope, DateFormat } from './enums';
import { PluginScript } from './plugins';

export interface SolveStats {
  mean3: number | null;
  avg5: number | null;
  avg12: number | null;
  [key: string]: number | null;
}

export interface SolvePhase {
  duration: number;
  cumulative: number;
}

export interface Solve {
  id: string;
  timestamp: number;
  time: number;
  inspectionTime: number; // -1 if disabled, otherwise ms
  phases?: SolvePhase[];
  scramble: string[][]; // Relay: Array of move arrays
  scramblerId: string[]; // Relay: Array of scrambler IDs
  penalty: Penalty;
  comment?: string;
  tags?: string[];
}

export interface InspectionFlashConfig {
  enabled8: boolean;
  enabled12: boolean;
  enabled15: boolean;
}

export interface LayoutConfig {
    presetId: string;
    widgetMapping: Record<string, WidgetId>;
}

export interface LayoutArea {
    id: string; // Unique ID for the slot (e.g., 'timer', 'logo')
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    w: number; // Percentage 0-100
    h: number; // Percentage 0-100
}

export interface LayoutPreset {
    id: string;
    name: string;
    areas: LayoutArea[];
    lockedMappings?: Record<string, WidgetId>;
}

export interface SessionSettingsOverride {
  inspectionEnabled?: boolean;
  inspectionDirection?: InspectionDirection;
  inspectionVoice?: InspectionVoice;
  autoPenalty?: boolean;
  holdToStart?: boolean;
  restartDelayEnabled?: boolean;
  restartDelayMs?: number;
  timePrecision?: TimePrecision;
  inspectionPrecision?: TimePrecision;
  hideWhileTiming?: boolean;
  numberOfPhases?: number;
  prePBs?: Record<string, number>;
  layout?: LayoutConfig;
  useStackmat?: boolean;
  virtualCube?: boolean;
}

export interface CustomScramblerConfig {
  moves: string; // comma separated string for UI, parsed for logic
  opposites: string; // comma separated pairs like "U-D, R-L"
  length: number;
}

export interface Session {
  id: string;
  name: string;
  tags?: string[];
  scramblerId: string[]; // Relay: Array of IDs
  scrambleType?: PuzzleType; // Deprecated
  customScramblerConfig?: CustomScramblerConfig;
  solveIds: string[]; // Normalized: References to solves
  sourceSessionIds?: string[]; // IDs of other sessions to duplicate solves from
  settingsOverride?: SessionSettingsOverride;
  solveTagPool?: string[]; // Available tags for this session's solves
  locked?: boolean;
}

export interface ComputedSolve extends Solve {
  stats: SolveStats;
  historicalPBs?: Record<string, boolean>;
}

export interface StatConfig {
  id: string;
  type: StatType;
  size: number;
}

export interface TimeDistributionConfig {
  mode: 'ALL' | 'LAST';
  size: number;
}

export type SolvesOverTimeMode = 'SESSION' | '1H' | '24H' | '7D' | '30D' | '1Y' | 'SINCE' | 'LAST_X';

export interface SolvesOverTimeConfig {
    mode: SolvesOverTimeMode;
    customDate: string;
    customCount: number;
}

export interface GoalsWidgetConfig {
    showCompleted: boolean;
}

export interface MetronomeConfig {
    bpm: number;
    volume: number; // 0-100
}

export interface MobileLayoutConfig {
    enabled: boolean;
    slot1: WidgetId;
    slot2: WidgetId;
}

export type KeyBinding = string;

export interface ScrambleImageConfig {
    baseColor: 'black' | 'white' | 'stickerless';
    faceColors: {
        U: string; R: string; F: string; D: string; L: string; B: string;
        face7: string; face8: string; face9: string; face10: string; face11: string; face12: string;
    };
    clockColors: {
        clockFace: string;
        clockBack: string;
        pinUp: string;
        pinDown: string;
        wheelF: string;
        wheelB: string;
        marksF: string;
        marksB: string;
    }
}

export interface Goal {
    id: string;
    type: GoalType;
    frequency: GoalFrequency;
    scope: GoalScope;
    targetValue: number; // Count, MS, or Stat Value (ms)
    sessionId?: string; // Required if scope is SESSION
    statConfig?: StatConfig; // Required if type is STAT_TARGET
    maxSolveTimeMs?: number; // Optional filter: only include solves faster than this threshold
    deadline?: number; // Timestamp, for BY_DATE
    createdAt: number;
}

export interface PBSheetConfig {
    enabled: boolean;
    title: string;
    sessionIds: string[];
    stats: StatConfig[];
    showDate: boolean;
    showSolveCount: boolean;
}

export interface Settings {
  // Timer
  inspectionEnabled: boolean;
  inspectionDirection: InspectionDirection;
  inspectionVoice: InspectionVoice;
  autoPenalty: boolean;
  holdToStart: boolean;
  startInput: StartInputMethod;
  restartDelayEnabled: boolean;
  restartDelayMs: number;
  timePrecision: TimePrecision;
  inspectionPrecision: TimePrecision;
  inspectionFlashes: InspectionFlashConfig;
  useStackmat: boolean;
  
  // UI
  hideWhileTiming: boolean;
  hideWhileTimingText: string;
  theme: AppTheme;
  backgroundColor: string;
  textColor: string;
  backgroundImage?: string;
  backgroundImageOpacity: number;
  language: Language;
  layout: LayoutConfig;
  dateFormat: DateFormat;
  
  // Visualizer
  scrambleImage: ScrambleImageConfig;
  
  // PB
  pbVisuals: PBVisualType;
  pbFireworks: boolean;

  // List
  paginationEnabled: boolean;
  pageSize: number;
  timelistStats: StatConfig[];
  
  // Stats Widgets
  timeDistribution: TimeDistributionConfig;
  solvesOverTime: SolvesOverTimeConfig;
  goalsWidget: GoalsWidgetConfig;
  metronome: MetronomeConfig;
  mobileLayout: MobileLayoutConfig;

  // Shortcuts
  shortcuts: Record<ShortcutAction, KeyBinding | null>;

  // Session Overrides
  numberOfPhases?: number;
  prePBs?: Record<string, number>;
  virtualCube?: boolean;

  // External PB Sheet
  pbSheet: PBSheetConfig;
}

export interface User {
  id: string;
  username: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isSynced: boolean;
  lastSyncTime?: number;
}

// --- Normalization & Sync Types ---

export type SolveMap = Record<string, Solve>;

export enum SyncActionType {
    UPDATE_SETTINGS = 'UPDATE_SETTINGS',
    UPDATE_STATS_CONFIG = 'UPDATE_STATS_CONFIG',
    ADD_SOLVE_ATOMIC = 'ADD_SOLVE_ATOMIC',
    UPSERT_SOLVES = 'UPSERT_SOLVES',
    DELETE_SOLVES = 'DELETE_SOLVES',
    UPDATE_SESSION = 'UPDATE_SESSION',
    DELETE_SESSION = 'DELETE_SESSION',
    UPDATE_CURRENT_SESSION = 'UPDATE_CURRENT_SESSION',
    UPDATE_GOALS = 'UPDATE_GOALS',
    UPDATE_PLUGINS = 'UPDATE_PLUGINS'
}

export interface SyncAction {
    type: SyncActionType;
    payload: unknown;
    timestamp: number;
}

export interface FullStateData {
  sessions: Session[];
  solves: SolveMap;
  settings: Settings;
  statsConfig: StatConfig[];
  goals: Goal[];
  plugins: PluginScript[];
  currentSessionId: string;
  updatedAt: number;
}
