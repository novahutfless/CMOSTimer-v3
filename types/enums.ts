
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

export enum ScrambleType {
  THREE = '3x3',
  TWO = '2x2',
  FOUR = '4x4',
  FIVE = '5x5',
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

export enum InspectionDirection {
  UP = 'UP',
  DOWN = 'DOWN'
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
  ESCAPE = 'ESCAPE'
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
  EMPTY = 'EMPTY'
}
