# Plugin Examples

Here are some examples to get you started. You can copy and paste these directly into the **Settings > Plugins** code editor.

## Example 1: Hello World
Simple interaction to test the system.

```javascript
cmos.toast("Plugin System Loaded!");
console.log("Current state:", cmos.getState());
```

## Example 2: Auto-Theme Switcher
Changes the theme to 'orange' if you have more than 100 solves in the database.

```javascript
const state = cmos.getState();
const totalSolves = Object.keys(state.solves).length;

if (totalSolves > 100 && state.settings.theme !== 'orange') {
    cmos.updateSettings({ theme: 'orange' });
    cmos.toast("Achievement Unlocked: Orange Theme (100+ Solves)");
}
```

## Example 3: Real-time Solve Counter Widget
Creates a custom widget that displays the total number of solves in the current session.
**Note:** After adding this, go to **Settings > Layout > Open Layout Editor** to place the "Session Counter" widget.

```javascript
cmos.registerWidget(
  "session_counter",
  "Session Counter",
  (container) => {
    // Style the container
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.height = "100%";
    container.style.background = "rgba(0,0,0,0.3)";
    container.style.borderRadius = "8px";
    
    // Render loop
    const update = () => {
        const state = cmos.getState();
        const sessId = state.currentSessionId;
        const session = state.sessions.find(s => s.id === sessId);
        const count = session ? session.solveIds.length : 0;
        
        container.innerHTML = `
            <div style="font-size: 10px; text-transform: uppercase; color: #888;">Session Solves</div>
            <div style="font-size: 32px; font-weight: bold; color: #fff;">${count}</div>
        `;
    };

    // Initial render
    update();

    // Poll for changes every 500ms
    const interval = setInterval(update, 500);

    // Cleanup function attached to the container for the wrapper to find? 
    // The registerWidget API supports a cleanup return or callback.
    // In standard JS closures, we might need to handle cleanup carefully.
    // The React wrapper calls the cleanup function passed to registerWidget.
  },
  () => {
      // Cleanup function
      // If we used a global interval variable, clear it here.
      // However, the scope above handles the interval.
      // To make the interval accessible to cleanup, we'd need to store it.
      // For this simple API, the interval inside the closure persists until we kill it.
      // Let's improve the code pattern:
  }
);
```

### Improved Widget Pattern (With Cleanup)

```javascript
let myInterval = null;

cmos.registerWidget(
  "better_counter", 
  "Better Counter",
  (container) => {
      const render = () => {
          const state = cmos.getState();
          const count = Object.keys(state.solves).length;
          container.innerText = "Total: " + count;
          container.style.color = "white";
          container.style.fontSize = "24px";
          container.style.display = "flex";
          container.style.alignItems = "center";
          container.style.justifyContent = "center";
      };
      
      render();
      myInterval = setInterval(render, 1000);
  },
  () => {
      if (myInterval) clearInterval(myInterval);
  }
);
```

## Example 4: External Solve Input
Simulates receiving a solve time from an external source (like a Bluetooth cube library) every 5 seconds.

```javascript
// WARNING: This will spam your session with random times!
/*
const interval = setInterval(() => {
    const randomTime = 5000 + Math.random() * 10000; // 5s - 15s
    cmos.addSolve(randomTime);
    cmos.toast("Simulated Bluetooth Solve Added");
}, 5000);

// To stop it, you'd need to reload the page or disable the plugin and refresh.
*/
```
