# Settings Reference

This document details all configuration options available in CMOSTimer v3. 
These keys correspond to the properties in the `Settings` object, which can be accessed via `cmos.getState().settings` and modified using `cmos.updateSettings({ key: value })` in plugins.

## Timer Settings

| Internal Key | UI Name | Type / Values | Description |
| :--- | :--- | :--- | :--- |
| `inspectionEnabled` | Use Inspection | `boolean` | Enables WCA-style 15s inspection phase before solving. |
| `inspectionDirection` | Direction | `InspectionDirection` (`'UP'`, `'DOWN'`) | Whether inspection counts up to 15 or down to 0. |
| `inspectionVoice` | Inspection Voice | `InspectionVoice` (`'NONE'`, `'MALE'`, `'FEMALE'`) | Plays voice alerts ("8 seconds", "12 seconds") during inspection. |
| `autoPenalty` | Auto Penalty | `boolean` | Automatically applies +2 or DNF if inspection time is exceeded. |
| `holdToStart` | Hold to Start | `boolean` | Requires holding the spacebar (red -> green) to start the timer. |
| `startInput` | Start Input | `StartInputMethod` | Defines which keys trigger the timer. See Enums below. |
| `useStackmat` | Use Stackmat | `boolean` | Enables microphone input for connecting a physical Stackmat timer. |
| `restartDelayEnabled` | Restart Delay | `boolean` | Adds a mandatory pause after stopping before the timer can start again. |
| `restartDelayMs` | Restart Delay (ms) | `number` | Duration of the restart delay in milliseconds. |
| `timePrecision` | Timer Precision | `TimePrecision` (`0`=1s, `1`=0.1s, `2`=0.01s, `3`=0.001s) | Number of decimals shown for solve times. |
| `inspectionPrecision` | Inspection Precision | `TimePrecision` | Number of decimals shown during inspection. |
| `inspectionFlashes` | Inspection Flashes | `Object` `{ enabled8: bool, enabled12: bool, enabled15: bool }` | Flashes the screen color at specific inspection milestones. |

## Appearance & UI

| Internal Key | UI Name | Type / Values | Description |
| :--- | :--- | :--- | :--- |
| `theme` | Theme Preset | `AppTheme` (`'zinc'`, `'blue'`, `'green'`, `'orange'`, `'purple'`, `'rose'`) | Sets the global color accent of the application. |
| `backgroundColor` | Background | `string` (Hex Color) | Custom background color (overrides theme default). |
| `textColor` | Text Color | `string` (Hex Color) | Custom text color (overrides theme default). |
| `backgroundImage` | Background Image | `string` (URL) | URL for a custom background wallpaper. |
| `backgroundImageOpacity` | Opacity | `number` (0-100) | Opacity of the background overlay (lower = clearer image). |
| `hideWhileTiming` | Hide UI while timing | `boolean` | Fades out all widgets except the timer when running. |
| `hideWhileTimingText` | Hidden Text | `string` | Optional text to display instead of the running time (e.g. "Solving..."). |
| `language` | Language | `Language` (`'en'`, `'de'`) | Application language. |
| `pbVisuals` | PB Visual Style | `PBVisualType` (`'NONE'`, `'HIGHLIGHT'`, `'BADGE'`) | How Personal Bests are indicated in the time list. |
| `pbFireworks` | Single PB Fireworks | `boolean` | Enables particle effects on screen when a new Single PB is achieved. |

## Scramble Visualizer

The `scrambleImage` object controls the 2D/3D visualization of the puzzle state.

| Key | Type | Description |
| :--- | :--- | :--- |
| `baseColor` | `'black' \| 'white' \| 'stickerless'` | Plastic color of the cube. |
| `faceColors` | `Object` | Map of face keys (`U`, `R`, `F`, `D`, `L`, `B`) to Hex colors. |
| `clockColors` | `Object` | Map of Clock puzzle specific parts (pins, dials) to Hex colors. |

## Lists & Statistics

| Internal Key | UI Name | Type / Values | Description |
| :--- | :--- | :--- | :--- |
| `paginationEnabled` | Timelist Pagination | `boolean` | Splits the time list into pages instead of infinite scroll. |
| `pageSize` | Page Size | `number` | Number of solves per page if pagination is enabled. |
| `timelistStats` | Columns | `StatConfig[]` | Array defining which columns appear in the time list. |

### Widget Configs

These settings control specific widgets on the dashboard.

*   **`timeDistribution`**: `{ mode: 'ALL' | 'LAST', size: number }`
*   **`solvesOverTime`**: `{ mode: SolvesOverTimeMode, customDate: string, customCount: number }`
*   **`goalsWidget`**: `{ showCompleted: boolean }`
*   **`metronome`**: `{ bpm: number, volume: number }`

## Enums Reference

### `StartInputMethod`
*   `'SPACE'`: Spacebar only.
*   `'CTRL_CTRL'`: Both Ctrl keys must be held.
*   `'NEAR_SPACE'`: Space, Alt, and nearby keys (Z, X, C, V, B, N, M).
*   `'ANY'`: Any key triggers the timer.

### `InspectionDirection`
*   `'UP'`: Counts 0, 1, 2...
*   `'DOWN'`: Counts 15, 14, 13...

### `TimePrecision`
*   `0`: Seconds (e.g. 12)
*   `1`: Deciseconds (e.g. 12.3)
*   `2`: Centiseconds (e.g. 12.34)
*   `3`: Milliseconds (e.g. 12.345)

### `AppTheme`
*   `'zinc'`
*   `'blue'`
*   `'green'`
*   `'orange'`
*   `'purple'`
*   `'rose'`

### `StatType` (for `timelistStats`)
*   `'SINGLE'`: Single time.
*   `'MEAN'`: Arithmetic mean (MoX).
*   `'AVERAGE'`: Trimmed average (AoX).
*   `'STD_DEV'`: Standard Deviation.
*   `'SUCCESS_RATE'`: Percentage of non-DNF solves.
*   `'WEIGHTED_AVG'`: Weighted average (recent solves count more).

## Example Usage in Plugin

```javascript
// Change multiple settings at once
cmos.updateSettings({
    theme: 'green',
    timePrecision: 3, // Milliseconds
    inspectionEnabled: false,
    hideWhileTiming: true,
    hideWhileTimingText: "Go Fast!"
});
```
