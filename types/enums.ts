

export enum Penalty {
  NONE = 'NONE',
  PLUS_TWO = 'PLUS_TWO', // +2 seconds
  PLUS_FOUR = 'PLUS_FOUR',
  PLUS_SIX = 'PLUS_SIX',
  PLUS_EIGHT = 'PLUS_EIGHT',
  PLUS_TEN = 'PLUS_TEN',
  PLUS_TWELVE = 'PLUS_TWELVE',
  PLUS_FOURTEEN = 'PLUS_FOURTEEN',
  PLUS_SIXTEEN = 'PLUS_SIXTEEN',
  DNF = 'DNF', // Did Not Finish
  DNS = 'DNS' // Did Not Start
}

export enum PuzzleType {
  THREE = '3x3',
  TWO = '2x2',
  FOUR = '4x4',
  FIVE = '5x5',
  SIX = '6x6',
  SEVEN = '7x7',
  PYRAMINX = 'Pyraminx',
  SKEWB = 'Skewb',
  CLOCK = 'Clock',
  // Cuboids
  TWO_BY_TWO_BY_THREE = '2x2x3',
  TWO_BY_TWO_BY_FOUR = '2x2x4',
  TWO_BY_TWO_BY_FIVE = '2x2x5',
  TWO_BY_TWO_BY_SIX = '2x2x6',
  TWO_BY_TWO_BY_SEVEN = '2x2x7',
  
  THREE_BY_THREE_BY_TWO = '3x3x2',
  THREE_BY_THREE_BY_FOUR = '3x3x4',
  THREE_BY_THREE_BY_FIVE = '3x3x5',
  THREE_BY_THREE_BY_SIX = '3x3x6',
  THREE_BY_THREE_BY_SEVEN = '3x3x7',
  THREE_BY_THREE_BY_EIGHT = '3x3x8',

  FOUR_BY_FOUR_BY_TWO = '4x4x2',
  FOUR_BY_FOUR_BY_THREE = '4x4x3',
  FOUR_BY_FOUR_BY_FIVE = '4x4x5',
  FOUR_BY_FOUR_BY_SIX = '4x4x6',

  FIVE_BY_FIVE_BY_FOUR = '5x5x4',

  // Visualizer placeholders
  NO_VISUAL = 'NO_VISUAL'
}

export enum ScramblerCategory {
  WCA = 'WCA',
  NXN = 'NxNxN',
  SUBSETS = 'Subsets',
  CUBOIDS = 'Cuboids',
  OTHER = 'Other',
  CUSTOM = 'Custom'
}

export enum StartInputMethod {
  SPACE = 'SPACE',
  CTRL_CTRL = 'CTRL_CTRL', // Both Ctrl keys
  NEAR_SPACE = 'NEAR_SPACE', // Space, Alt, ZXC...
  ANY = 'ANY'
}

export enum TimerState {
  IDLE = 'IDLE',
  INSPECTION = 'INSPECTION',
  HOLDING = 'HOLDING', // Spacebar down, waiting for green
  READY = 'READY', // Green light, ready to release
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED', // Briefly after stop before going IDLE
  LOCKED = 'LOCKED', // Prevention delay
  MANUAL_ENTRY = 'MANUAL_ENTRY'
}

export enum InspectionDirection {
  UP = 'UP',
  DOWN = 'DOWN'
}

export enum InspectionVoice {
  NONE = 'NONE',
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum StatType {
  SINGLE = 'SINGLE',
  MEAN = 'MEAN',
  AVERAGE = 'AVERAGE',
  SUCCESS_RATE = 'SUCCESS_RATE',
  STD_DEV = 'STD_DEV',
  WEIGHTED_AVG = 'WEIGHTED_AVG'
}

export enum TimePrecision {
  SECONDS = 0,
  DECI = 1,
  CENTI = 2,
  MILLI = 3
}

export enum DateFormat {
  ISO = 'ISO', // YYYY-MM-DD
  US = 'US',   // MM/DD/YYYY
  EU = 'EU'    // DD/MM/YYYY
}

export enum PBVisualType {
  NONE = 'NONE',
  HIGHLIGHT = 'HIGHLIGHT',
  BADGE = 'BADGE'
}

export enum AppTheme {
  ZINC = 'zinc',
  BLUE = 'blue',
  GREEN = 'green',
  ORANGE = 'orange',
  PURPLE = 'purple',
  ROSE = 'rose'
}

export enum Language {
  EN = 'en',
  DE = 'de'
}

export enum ShortcutAction {
  NEXT_SCRAMBLE = 'NEXT_SCRAMBLE',
  PREV_SCRAMBLE = 'PREV_SCRAMBLE',
  PENALTY_PLUS_TWO = 'PENALTY_PLUS_TWO',
  PENALTY_DNF = 'PENALTY_DNF',
  DELETE_LAST = 'DELETE_LAST',
  SELECT_FIRST = 'SELECT_FIRST',
  OPEN_DETAILS = 'OPEN_DETAILS',
  MOVE_SELECTION_UP = 'MOVE_SELECTION_UP',
  MOVE_SELECTION_DOWN = 'MOVE_SELECTION_DOWN',
  EXTEND_SELECTION_UP = 'EXTEND_SELECTION_UP',
  EXTEND_SELECTION_DOWN = 'EXTEND_SELECTION_DOWN',
  ESCAPE = 'ESCAPE',
  OPEN_SESSION_MANAGER = 'OPEN_SESSION_MANAGER',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  PREV_PUZZLE = 'PREV_PUZZLE',
  NEXT_PUZZLE = 'NEXT_PUZZLE',
  OPEN_COMMAND_PALETTE = 'OPEN_COMMAND_PALETTE'
}

export enum WidgetId {
  TIMER = 'TIMER',
  SCRAMBLE = 'SCRAMBLE',
  SCRAMBLE_IMAGE = 'SCRAMBLE_IMAGE',
  STATS = 'STATS',
  TIMELIST = 'TIMELIST',
  SESSION = 'SESSION',
  LOGO = 'LOGO',
  TOOLS = 'TOOLS',
  TIME_DISTRIBUTION = 'TIME_DISTRIBUTION',
  GOALS = 'GOALS',
  SOLVES_OVER_TIME = 'SOLVES_OVER_TIME',
  METRONOME = 'METRONOME',
  TAG_ASSIGNER = 'TAG_ASSIGNER',
  EMPTY = 'EMPTY'
}

// --- Goal Enums ---

export enum GoalType {
  SOLVE_COUNT = 'SOLVE_COUNT',
  TIME_SPENT = 'TIME_SPENT',
  STAT_TARGET = 'STAT_TARGET'
}

export enum GoalFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  BY_DATE = 'BY_DATE',
  INFINITE = 'INFINITE' // For Stat Target usually
}

export enum GoalScope {
  GLOBAL = 'GLOBAL',
  SESSION = 'SESSION'
}