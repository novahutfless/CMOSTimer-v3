import { CMOSApi, FullStateData, Goal, Penalty, PluginScript, Settings, SolveMap, StatConfig } from '../../types';

type CreateHostApiInput = {
	sessions: FullStateData['sessions'];
	solves: SolveMap;
	settings: Settings;
	statsConfig: StatConfig[];
	goals: Goal[];
	plugins: PluginScript[];
	currentSessionId: string;
	addSolve: (time: number, penalty?: Penalty) => void;
	updateSettings: (settings: Partial<Settings>) => void;
	toast: (message: string) => void;
	alert: (message: string) => Promise<void>;
	prompt: (message: string, defaultValue?: string) => Promise<string | null>;
};

export const createHostApi = ({
	sessions,
	solves,
	settings,
	statsConfig,
	goals,
	plugins,
	currentSessionId,
	addSolve,
	updateSettings,
	toast,
	alert,
	prompt
}: CreateHostApiInput): CMOSApi => ({
	getState: (): FullStateData => ({
		sessions,
		solves,
		settings,
		statsConfig,
		goals,
		plugins,
		currentSessionId,
		updatedAt: Date.now()
	}),
	addSolve,
	updateSettings,
	toast,
	registerWidget: (_id, _name, _render, _cleanup): void => {},
	registerScrambler: (_definition): void => {},
	registerScrambleRenderer: (_visualizerType, _render, _cleanup): void => {},
	registerLanguage: (_definition): void => {},
	registerTranslations: (_languageCode, _translations): void => {},
	alert,
	prompt,
	onCleanup: (_callback): void => {}
});
