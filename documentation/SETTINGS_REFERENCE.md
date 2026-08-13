# Settings Reference

These keys correspond to the `Settings` object returned by `(await cmos.getState()).settings`.
Plugins can update them with `await cmos.updateSettings({ ... })`.

This file reflects the current `Settings` type in the app, not just the subset exposed prominently in the UI.

## Timer

| Key | Type / Values | Description |
| :--- | :--- | :--- |
| `inspectionEnabled` | `boolean` | Enables inspection. |
| `inspectionDirection` | `'UP' \| 'DOWN'` | Inspection count direction. |
| `inspectionVoice` | `'NONE' \| 'MALE' \| 'FEMALE'` | Inspection voice prompts. |
| `inspectionAbortAction` | `'DNF' \| 'CANCEL'` | What aborting inspection does. |
| `autoPenalty` | `boolean` | Applies +2 / DNF automatically after inspection overruns. |
| `holdToStart` | `boolean` | Requires hold-to-start behavior. |
| `startInput` | `'SPACE' \| 'CTRL_CTRL' \| 'NEAR_SPACE' \| 'ANY'` | Timer input mode. |
| `restartDelayEnabled` | `boolean` | Enables restart delay after stopping. |
| `restartDelayMs` | `number` | Restart delay duration in ms. |
| `timePrecision` | `0 \| 1 \| 2 \| 3` | Solve time precision. |
| `inspectionPrecision` | `0 \| 1 \| 2 \| 3` | Inspection time precision. |
| `inspectionFlashes` | `{ enabled8, enabled12, enabled15 }` | Inspection flash milestones. |
| `useStackmat` | `boolean` | Enables Stackmat microphone input. |

## UI

| Key | Type / Values | Description |
| :--- | :--- | :--- |
| `hideWhileTiming` | `boolean` | Hides the running time or surrounding UI depending on usage. |
| `hideWhileTimingText` | `string` | Placeholder text shown while timing when hiding time. |
| `theme` | `'zinc' \| 'blue' \| 'green' \| 'orange' \| 'purple' \| 'rose'` | Theme accent. |
| `backgroundColor` | `string` | Background color hex string. |
| `textColor` | `string` | Text color hex string. |
| `backgroundImage` | `string` | Background image URL/data URL. |
| `backgroundImageOpacity` | `number` | Overlay opacity percentage. |
| `language` | `string` | Current language code. Built-ins are `'en'`, `'de'`, `'eo'`; plugins can add more. |
| `layout` | `LayoutConfig` | Active desktop layout config. |
| `dateFormat` | `'ISO' \| 'US' \| 'EU'` | Date formatting style. |

## Scramble Visualizer

| Key | Type | Description |
| :--- | :--- | :--- |
| `scrambleImage` | `ScrambleImageConfig` | Visualizer color and appearance config. |

Important nested keys:
- `baseColor`: `'black' | 'white' | 'stickerless'`
- `faceColors`: puzzle face colors
- `clockColors`: clock-specific colors

## PB / Solve Presentation

| Key | Type / Values | Description |
| :--- | :--- | :--- |
| `pbVisuals` | `'NONE' \| 'HIGHLIGHT' \| 'BADGE'` | PB indication style. |
| `pbFireworks` | `boolean` | Fireworks on new single PB. |

## Time List

| Key | Type | Description |
| :--- | :--- | :--- |
| `paginationEnabled` | `boolean` | Enables time list pagination. |
| `pageSize` | `number` | Page size when pagination is enabled. |
| `timelistStats` | `StatConfig[]` | Time list columns. |

`StatConfig` shape:
```ts
{
  id: string;
  type: 'SINGLE' | 'MEAN' | 'AVERAGE' | 'SUCCESS_RATE' | 'STD_DEV' | 'WEIGHTED_AVG';
  size: number;
}
```

## Widget Settings

| Key | Type | Description |
| :--- | :--- | :--- |
| `timeDistribution` | `{ mode: 'ALL' \| 'LAST', size: number }` | Time distribution widget config. |
| `solvesOverTime` | `{ mode, customDate, customCount }` | Solves-over-time widget config. |
| `goalsWidget` | `{ showCompleted: boolean }` | Goals widget config. |
| `metronome` | `{ bpm: number, volume: number }` | Metronome widget config. |
| `mobileLayout` | `{ enabled: boolean, slot1: WidgetId, slot2: WidgetId }` | Mobile bottom-widget config. |

`solvesOverTime.mode` can be:
- `'SESSION'`
- `'1H'`
- `'24H'`
- `'7D'`
- `'30D'`
- `'1Y'`
- `'SINCE'`
- `'LAST_X'`

## Shortcuts

| Key | Type | Description |
| :--- | :--- | :--- |
| `shortcuts` | `Record<ShortcutAction, string \| null>` | Keyboard shortcut bindings. |

Known `ShortcutAction` values:
- `NEXT_SCRAMBLE`
- `PREV_SCRAMBLE`
- `PENALTY_PLUS_TWO`
- `PENALTY_DNF`
- `DELETE_LAST`
- `SELECT_FIRST`
- `OPEN_DETAILS`
- `MOVE_SELECTION_UP`
- `MOVE_SELECTION_DOWN`
- `EXTEND_SELECTION_UP`
- `EXTEND_SELECTION_DOWN`
- `ESCAPE`
- `OPEN_SESSION_MANAGER`
- `MANUAL_ENTRY`
- `PREV_PUZZLE`
- `NEXT_PUZZLE`
- `OPEN_COMMAND_PALETTE`

## Advanced / Session-Related Behavior

These live on the global `Settings` object but are mainly used for session-specific or advanced timer behavior.

| Key | Type | Description |
| :--- | :--- | :--- |
| `numberOfPhases` | `number` | Number of solve phases/splits. |
| `prePBs` | `Record<string, number>` | Preloaded PB baselines by stat id/key. |
| `virtualCube` | `boolean` | Enables virtual cube timer mode. |

## PB Sheet

| Key | Type | Description |
| :--- | :--- | :--- |
| `pbSheet` | `PBSheetConfig` | External PB sheet config. |

`PBSheetConfig` shape:
```ts
{
  enabled: boolean;
  title: string;
  sessionIds: string[];
  stats: StatConfig[];
  showDate: boolean;
  showSolveCount: boolean;
}
```

## Example

```javascript
await cmos.updateSettings({
  theme: 'green',
  timePrecision: 3,
  inspectionEnabled: false,
  hideWhileTiming: true,
  hideWhileTimingText: 'Go Fast!',
  language: 'eo'
});
```
