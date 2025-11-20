
import { Penalty, ScrambleType, StartInputMethod, TimePrecision, InspectionDirection, PBVisualType, AppTheme, Language, StatType, ShortcutAction } from './enums';

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
  phases?: SolvePhase[];
  scramble: string;
  penalty: Penalty;
  comment?: string;
  stats?: SolveStats;
}

export interface InspectionFlashConfig {
  enabled8: boolean;
  enabled12: boolean;
  enabled15: boolean;
}

export interface SessionSettingsOverride {
  inspectionEnabled?: boolean;
  inspectionDirection?: InspectionDirection;
  holdToStart?: boolean;
  restartDelayEnabled?: boolean;
  restartDelayMs?: number;
  timePrecision?: TimePrecision;
  inspectionPrecision?: TimePrecision;
  hideWhileTiming?: boolean;
  numberOfPhases?: number;
  prePBs?: Record<string, number>;
}

export interface Session {
  id: string;
  name: string;
  scrambleType: ScrambleType;
  solves: Solve[];
  settingsOverride?: SessionSettingsOverride;
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

export type KeyBinding = string; // e.g., "Space", "Ctrl+KeyZ"

export interface Settings {
  // Timer
  inspectionEnabled: boolean;
  inspectionDirection: InspectionDirection;
  holdToStart: boolean;
  startInput: StartInputMethod;
  restartDelayEnabled: boolean;
  restartDelayMs: number;
  timePrecision: TimePrecision;
  inspectionPrecision: TimePrecision;
  inspectionFlashes: InspectionFlashConfig;
  
  // UI
  hideWhileTiming: boolean;
  hideWhileTimingText: string;
  theme: AppTheme;
  backgroundColor: string;
  textColor: string;
  language: Language;
  
  // PB
  pbVisuals: PBVisualType;
  pbFireworks: boolean;

  // List
  paginationEnabled: boolean;
  pageSize: number;
  timelistStats: StatConfig[];

  // Shortcuts
  shortcuts: Record<ShortcutAction, KeyBinding | null>;

  // Session Overrides (Effective Settings)
  numberOfPhases?: number;
  prePBs?: Record<string, number>;
}
