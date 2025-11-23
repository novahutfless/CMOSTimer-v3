
import { CMOSApi, CustomRendererDefinition, PluginScript, PluginWidgetDefinition } from '../types';
import { registerScrambler } from '../utils/scramble';

class PluginManager {
    private static instance: PluginManager;
    private api: Omit<CMOSApi, 'onCleanup'> | null = null;
    private widgets: Map<string, PluginWidgetDefinition> = new Map();
    private renderers: Map<string, CustomRendererDefinition> = new Map();
    private scripts: PluginScript[] = [];
    private cleanups: Map<string, (() => void)[]> = new Map();
    private uiCallbacks: {
        alert: (msg: string) => Promise<void>;
        prompt: (msg: string, def?: string) => Promise<string | null>;
    } | null = null;

    private constructor() {
        console.log('[PluginManager] Instance created');
    }

    public static getInstance(): PluginManager {
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager();
        }
        return PluginManager.instance;
    }

    public initialize(api: Omit<CMOSApi, 'onCleanup'>, scripts: PluginScript[], uiCallbacks: any) {
        this.api = api;
        this.uiCallbacks = uiCallbacks;
        
        const hasChanged = this.checkChanges(scripts);
        
        if (hasChanged) {
            console.log('[PluginManager] Scripts changed, reloading...');
            this.reloadPlugins(scripts);
        }
    }

    public updateApi(api: Omit<CMOSApi, 'onCleanup'>) {
        this.api = api;
    }

    private checkChanges(newScripts: PluginScript[]): boolean {
        if (this.scripts.length !== newScripts.length) return true;
        
        // Check for any modification in content or enabled state
        return newScripts.some((s, i) => {
            const old = this.scripts[i];
            return s.id !== old.id || s.code !== old.code || s.enabled !== old.enabled;
        });
    }

    private reloadPlugins(newScripts: PluginScript[]) {
        // 1. Identify scripts that need cleanup (removed, disabled, or changed)
        const newScriptMap = new Map(newScripts.map(s => [s.id, s]));
        
        this.scripts.forEach(oldScript => {
            const newScript = newScriptMap.get(oldScript.id);
            const shouldCleanup = !newScript || !newScript.enabled || newScript.code !== oldScript.code;
            
            if (shouldCleanup) {
                this.cleanupPlugin(oldScript.id);
            }
        });

        // 2. Run new or changed plugins
        newScripts.forEach(script => {
            const oldScript = this.scripts.find(s => s.id === script.id);
            
            // Should run if:
            // - It is enabled AND
            // - (It's new OR code changed OR it was previously disabled)
            const isNewOrChanged = !oldScript || oldScript.code !== script.code;
            const wasDisabled = oldScript && !oldScript.enabled;
            
            if (script.enabled && (isNewOrChanged || wasDisabled)) {
                // Safety cleanup just in case
                this.cleanupPlugin(script.id); 
                this.runScript(script);
            }
        });

        this.scripts = [...newScripts];
    }

    private cleanupPlugin(id: string) {
        // Run registered cleanup functions
        const cleanups = this.cleanups.get(id);
        if (cleanups && cleanups.length > 0) {
            console.log(`[PluginManager] Cleaning up plugin ${id}`);
            cleanups.forEach(fn => {
                try { fn(); } catch(e) { console.error(`Error in cleanup for plugin ${id}`, e); }
            });
        }
        this.cleanups.delete(id);
        
        // Note: We don't automatically remove widgets/renderers from the maps here 
        // because they might be overwritten by the re-run. 
        // Proper cleanup should be done by the plugin using onCleanup() if it wants to unregister things properly.
    }

    private runScript(script: PluginScript) {
        if (!this.api) {
            console.error('[PluginManager] API not initialized, cannot run script', script.name);
            return;
        }
        
        console.log(`[PluginManager] Executing: ${script.name}`);
        
        try {
            const contextApi = this.createContextApi(script.id);
            // Wrap in a closure to prevent global pollution and injection
            const fn = new Function('cmos', `"use strict";\n${script.code}`);
            fn(contextApi);
        } catch (e) {
            console.error(`[PluginManager] Error executing ${script.name}:`, e);
            if (this.api) this.api.toast(`Plugin Error (${script.name}): ${e}`);
        }
    }

    private createContextApi(pluginId: string): CMOSApi {
        return {
            getState: () => this.api?.getState() as any,
            addSolve: (t, p) => this.api?.addSolve(t, p),
            updateSettings: (s) => this.api?.updateSettings(s),
            toast: (m) => this.api?.toast(m),
            
            registerWidget: (id, name, render, cleanup) => {
                console.log(`[PluginManager] Registering widget: ${name} (${id})`);
                this.widgets.set(id, { id, name, render, cleanup });
                // Auto-register cleanup for this widget? 
                // For now, we rely on the plugin to pass a cleanup to onCleanup if it wants to remove it from the UI list,
                // but the `cleanup` param here is for when the React component unmounts.
            },
            
            registerScrambler: (definition) => {
                console.log(`[PluginManager] Registering scrambler: ${definition.name}`);
                registerScrambler(definition);
            },
            
            registerScrambleRenderer: (visualizerType, render, cleanup) => {
                console.log(`[PluginManager] Registering renderer for: ${visualizerType}`);
                this.renderers.set(visualizerType, { visualizerType, render, cleanup });
            },

            onCleanup: (callback: () => void) => {
                const list = this.cleanups.get(pluginId) || [];
                list.push(callback);
                this.cleanups.set(pluginId, list);
            },

            alert: (message) => {
                if (this.uiCallbacks?.alert) return this.uiCallbacks.alert(message);
                return Promise.resolve();
            },

            prompt: (message, def) => {
                if (this.uiCallbacks?.prompt) return this.uiCallbacks.prompt(message, def);
                return Promise.resolve(null);
            }
        };
    }

    public getWidget(id: string): PluginWidgetDefinition | undefined {
        return this.widgets.get(id);
    }

    public getWidgets(): PluginWidgetDefinition[] {
        return Array.from(this.widgets.values());
    }

    public getRenderer(type: string): CustomRendererDefinition | undefined {
        return this.renderers.get(type);
    }
}

export const pluginManager = PluginManager.getInstance();
