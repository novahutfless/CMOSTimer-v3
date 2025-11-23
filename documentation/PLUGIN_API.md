# CMOSTimer v3 Plugin API Reference

CMOSTimer v3 allows you to extend its functionality using JavaScript plugins. Each plugin runs in a sandboxed environment where it is provided with a global `cmos` object to interact with the application.

## The `cmos` Object

The `cmos` object is the bridge between your script and the React application.

### 1. UI Interactions

#### `cmos.toast(message: string)`
Displays a temporary toast notification at the bottom of the screen.
```javascript
cmos.toast("Hello from my plugin!");
```

#### `cmos.registerWidget(id, name, renderFn, cleanupFn?)`
Registers a custom widget that can be added to the layout via the Layout Editor.

*   **id** `string`: Unique identifier for your widget (e.g., `'my_custom_timer'`).
*   **name** `string`: Display name shown in the Layout Editor sidebar.
*   **renderFn** `(container: HTMLElement) => void`: A function called when the widget mounts. You are provided with a raw HTML `div` container to modify.
*   **cleanupFn** `() => void` (Optional): A function called when the widget unmounts (useful for clearing intervals or event listeners).

```javascript
cmos.registerWidget(
  'simple_counter',
  'Simple Counter',
  (container) => {
    container.innerHTML = '<button id="cnt">Count: 0</button>';
    let count = 0;
    container.querySelector('#cnt').onclick = (e) => {
      count++;
      e.target.innerText = 'Count: ' + count;
    };
  }
);
```

### 2. Data Access

#### `cmos.getState()`
Returns a snapshot of the entire application state. Note that this is a read-only copy at the moment of calling. To get updates, you must poll this method or hook into React lifecycles within a widget.

**Returns:** `FullStateData` object.

Key properties of `FullStateData`:
*   `currentSessionId`: string
*   `settings`: Object containing theme, timer, and UI settings.
*   `sessions`: Array of Session objects.
*   `solves`: Map (Record<string, Solve>) of all solves indexed by ID.

```javascript
const state = cmos.getState();
console.log("Current Session ID:", state.currentSessionId);
console.log("Total Solves Stored:", Object.keys(state.solves).length);
```

### 3. Actions

#### `cmos.addSolve(time: number, penalty?: string)`
Programmatically adds a solve to the current session.

*   **time** `number`: The solve time in milliseconds.
*   **penalty** `string` (Optional): One of `'NONE'`, `'PLUS_TWO'`, `'DNF'`, etc.

```javascript
// Add a 10.50s solve
cmos.addSolve(10500);

// Add a DNF
cmos.addSolve(0, 'DNF');
```

#### `cmos.updateSettings(partialSettings: object)`
Updates specific application settings.

```javascript
// Switch to 'blue' theme
cmos.updateSettings({ theme: 'blue' });

// Disable inspection
cmos.updateSettings({ inspectionEnabled: false });
```

## Enums & Constants

When interacting with the API, use these string values:

### Penalty
*   `'NONE'`
*   `'PLUS_TWO'` (+2)
*   `'DNF'`
*   `'DNS'`

### AppTheme
*   `'zinc'`
*   `'blue'`
*   `'green'`
*   `'orange'`
*   `'purple'`
*   `'rose'`

### TimePrecision
*   `0`: Seconds
*   `1`: Deciseconds (0.1)
*   `2`: Centiseconds (0.01)
*   `3`: Milliseconds (0.001)
