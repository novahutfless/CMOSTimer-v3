import { Language } from './types';

type TranslationKey = 
  | 'settings.title'
  | 'general'
  | 'timer'
  | 'appearance'
  | 'layout'
  | 'plugins'
  | 'lists'
  | 'stats'
  | 'shortcuts'
  | 'ui.hideWhileTiming'
  | 'ui.hideText'
  | 'ui.pagination'
  | 'ui.pageSize'
  | 'timer.inspection'
  | 'timer.direction'
  | 'timer.voice'
  | 'timer.autoPenalty'
  | 'timer.abortAction'
  | 'timer.abortAction.dnf'
  | 'timer.abortAction.cancel'
  | 'timer.useStackmat'
  | 'voice.none'
  | 'voice.male'
  | 'voice.female'
  | 'timer.holdToStart'
  | 'timer.startInput'
  | 'timer.restartDelay'
  | 'timer.precision'
  | 'timer.inspectionPrec'
  | 'timer.flashes'
  | 'theme.title'
  | 'theme.customColors'
  | 'appearance.backgroundImage'
  | 'appearance.imageUrl'
  | 'appearance.opacity'
  | 'appearance.scrambleImage'
  | 'appearance.baseStyle'
  | 'appearance.base.black'
  | 'appearance.base.white'
  | 'appearance.base.stickerless'
  | 'appearance.faceColors'
  | 'appearance.clockColors'
  | 'appearance.personalBests'
  | 'pb.visuals'
  | 'pb.fireworks'
  | 'list.columns'
  | 'list.filter.time'
  | 'list.filter.tag'
  | 'stats.global'
  | 'stats.dist.title'
  | 'stats.dist.mode'
  | 'stats.dist.all'
  | 'stats.dist.last'
  | 'btn.save'
  | 'btn.cancel'
  | 'btn.newSession'
  | 'btn.details'
  | 'btn.delete'
  | 'session.manage'
  | 'session.type'
  | 'session.override'
  | 'session.phases'
  | 'session.prepbs'
  | 'stat.single'
  | 'stat.mean'
  | 'stat.avg'
  | 'stat.stdDev'
  | 'stat.success'
  | 'stat.weighted'
  | 'color.bg'
  | 'color.text'
  | 'lang.select'
  | 'lang.english'
  | 'lang.german'
  | 'lang.esperanto'
  | 'settings.dateFormat'
  | 'settings.uiBehavior'
  | 'settings.mobileLayout'
  | 'settings.mobileBottomWidgets'
  | 'settings.desktopLayout'
  | 'settings.desktopLayoutDesc'
  | 'settings.openLayoutEditor'
  | 'date.fmt.iso'
  | 'date.fmt.us'
  | 'date.fmt.eu'
  | 'input.space'
  | 'input.ctrl'
  | 'input.near'
  | 'input.any'
  // Timer UI
  | 'timer.start'
  | 'timer.inspect'
  | 'timer.wait'
  | 'timer.phase'
  | 'timer.inspectionState'
  | 'timer.abortInspection'
  | 'timer.stackmatOn'
  | 'timer.stackmatOff'
  | 'timer.solvingPlaceholder'
  // Stats Modal
  | 'stats.modal.title'
  | 'stats.tab.global'
  | 'stats.tab.session'
  | 'stats.totalSolves'
  | 'stats.totalTime'
  | 'stats.totalInspection'
  | 'stats.avgTime'
  | 'stats.heatmap.title'
  | 'stats.heatmap.all'
  | 'stats.heatmap.year'
  | 'stats.heatmap.month'
  | 'stats.daily.title'
  | 'stats.subx.title'
  | 'stats.subx.label'
  | 'stats.pb.title'
  | 'stats.chart.times'
  | 'stats.chart.inspection'
  | 'stats.chart.penalty'
  | 'stats.chart.distribution'
  | 'stats.selectSession'
  | 'stats.improvement'
  | 'stats.noSessions'
  | 'stats.noSolvesMonth'
  | 'stats.totalSessions'
  | 'stats.solves'
  | 'stats.sessionNotFound'
  | 'stats.detailed.title'
  | 'stats.detailed.daily'
  | 'stats.detailed.weekly'
  | 'stats.detailed.monthly'
  | 'stats.detailed.yearly'
  | 'stats.detailed.day'
  | 'stats.detailed.week'
  | 'stats.detailed.month'
  | 'stats.detailed.year'
  | 'stats.detailed.best'
  | 'stats.detailed.avg'
  | 'stats.detailed.count'
  | 'stats.detailed.totalTime'
  | 'stats.detailed.breakdown'
  | 'stats.detailed.allSessions'
  | 'stats.detailed.noData'
  | 'stats.freq.title'
  | 'stats.freq.day'
  | 'stats.freq.week'
  | 'stats.freq.month'
  | 'stats.freq.year'
  // Details Modal
  | 'details.title'
  | 'details.date'
  | 'details.scramble'
  | 'details.time'
  | 'details.penalty'
  | 'details.phases'
  | 'details.copy'
  | 'details.comment'
  | 'details.addComment'
  | 'details.noComment'
  | 'details.base'
  | 'details.readOnly'
  | 'details.locked'
  | 'details.tags'
  | 'details.phaseNumber'
  | 'details.phaseSplit'
  | 'details.phaseTotal'
  // Data Management
  | 'data.manage'
  | 'data.export'
  | 'data.import'
  | 'data.copied'
  | 'data.copied.short'
  | 'import.title'
  | 'import.preview'
  | 'import.select'
  | 'import.asNew'
  | 'import.merge'
  | 'import.success'
  | 'import.settings'
  | 'import.format.cmos'
  | 'import.format.cs'
  | 'import.supportInfo'
  | 'btn.confirmImport'
  // Shortcuts
  | 'shortcut.title'
  | 'shortcut.instruction'
  | 'shortcut.none'
  | 'shortcut.clear'
  | 'shortcut.NEXT_SCRAMBLE'
  | 'shortcut.PREV_SCRAMBLE'
  | 'shortcut.PENALTY_PLUS_TWO'
  | 'shortcut.PENALTY_DNF'
  | 'shortcut.DELETE_LAST'
  | 'shortcut.SELECT_FIRST'
  | 'shortcut.OPEN_DETAILS'
  | 'shortcut.ESCAPE'
  | 'shortcut.MOVE_SELECTION_UP'
  | 'shortcut.MOVE_SELECTION_DOWN'
  | 'shortcut.EXTEND_SELECTION_UP'
  | 'shortcut.EXTEND_SELECTION_DOWN'
  | 'shortcut.OPEN_SESSION_MANAGER'
  | 'shortcut.MANUAL_ENTRY'
  | 'shortcut.PREV_PUZZLE'
  | 'shortcut.NEXT_PUZZLE'
  | 'shortcut.OPEN_COMMAND_PALETTE'
  | 'shortcut.conflict'
  // Profile
  | 'profile.title'
  | 'profile.login'
  | 'profile.register'
  | 'profile.logout'
  | 'profile.username'
  | 'profile.email'
  | 'profile.password'
  | 'profile.syncing'
  | 'profile.synced'
  | 'profile.unsaved'
  | 'profile.error'
  | 'profile.conflict'
  | 'profile.conflictDesc'
  | 'profile.validation.username'
  | 'profile.validation.password'
  | 'profile.validation.email'
  | 'profile.lastSync'
  | 'btn.continue'
  // PB Sheet
  | 'settings.pbsheet'
  | 'pbsheet.enabled'
  | 'pbsheet.title'
  | 'pbsheet.sessions'
  | 'pbsheet.stats'
  | 'pbsheet.options'
  | 'pbsheet.showDate'
  | 'pbsheet.showCount'
  | 'pbsheet.addSession'
  | 'pbsheet.addStat'
  | 'pbsheet.noMatch'
  // Tag Widget
  | 'tag.title'
  | 'tag.new'
  | 'tag.noneConfig'
  | 'tag.presets'
  | 'tag.noneSet'
  | 'tag.configure'
  // Plugins
  | 'plugin.new'
  | 'plugin.namePlaceholder'
  | 'plugin.api'
  | 'plugin.warning'
  | 'plugin.edit'
  | 'plugin.empty'
  | 'plugin.add'
  | 'plugin.deleteConfirm'
  // Layout
  | 'layout.title'
  | 'layout.preset'
  | 'layout.widgets'
  | 'layout.info'
  | 'layout.emptySlot'
  | 'layout.remove'
  | 'layout.mirror'
  | 'layout.mirrorDesc'
  | 'layout.save'
  // List
  | 'list.empty'
  | 'list.move'
  | 'list.duplicate'
  | 'list.deleteEverywhere'
  | 'list.deleteEverywhereConfirm'
  // Move Dialog
  | 'move.titleMove'
  | 'move.titleDup'
  | 'move.noSessions'
  | 'move.labelMove'
  | 'move.labelDup'
  | 'move.actionMove'
  | 'move.actionDup'
  // Session Manager
  | 'session.search'
  | 'session.new'
  | 'session.create'
  | 'session.cancel'
  | 'session.namePlaceholder'
  | 'session.addTag'
  | 'session.notFound'
  // Session Settings
  | 'session.locked'
  | 'session.lockedDesc'
  | 'session.timerBehavior'
  | 'session.advanced'
  | 'session.virtualCube'
  | 'session.enabled'
  | 'session.disabled'
  | 'session.global'
  | 'session.linked'
  | 'session.linkedDesc'
  | 'session.searchLink'
  | 'session.results'
  | 'session.selectAll'
  | 'session.clear'
  | 'session.linkBtn'
  | 'session.layoutOverride'
  | 'session.resetGlobal'
  | 'session.editLayout'
  | 'session.overrideLayout'
  // Scrambler Select
  | 'scrambler.title'
  | 'scrambler.custom.info'
  | 'scrambler.add'
  | 'scrambler.moves'
  | 'scrambler.opposites'
  | 'scrambler.length'
  | 'scrambler.selected'
  | 'scrambler.sequence'
  | 'scrambler.empty'
  | 'scrambler.confirm'
  // About
  | 'about.title'
  | 'about.p1'
  | 'about.p2'
  | 'about.features'
  | 'about.feat1'
  | 'about.feat2'
  | 'about.feat3'
  | 'about.feat4'
  | 'about.feat5'
  | 'about.footer'
  | 'rewind.pbsSurpassed'
  | 'activity.title'
  | 'activity.mode.session'
  | 'activity.mode.lastHour'
  | 'activity.mode.last24h'
  | 'activity.mode.last7d'
  | 'activity.mode.last30d'
  | 'activity.mode.lastYear'
  | 'activity.mode.since'
  | 'activity.mode.lastX'
  | 'activity.noData'
  | 'goals.title'
  | 'goals.hideCompleted'
  | 'goals.showCompleted'
  | 'goals.none'
  | 'goals.allCompleted'
  | 'goals.createOne'
  | 'goals.newGoal'
  | 'goals.editGoal'
  | 'goals.type'
  | 'goals.type.solveCount'
  | 'goals.type.timeSpent'
  | 'goals.type.statTarget'
  | 'goals.type.statTargetShort'
  | 'goals.frequency'
  | 'goals.frequency.daily'
  | 'goals.frequency.weekly'
  | 'goals.frequency.monthly'
  | 'goals.frequency.yearly'
  | 'goals.frequency.byDate'
  | 'goals.frequency.infinite'
  | 'goals.scope'
  | 'goals.scope.global'
  | 'goals.scope.session'
  | 'goals.selectSession'
  | 'goals.targetCount'
  | 'goals.targetDuration'
  | 'goals.targetTimeSec'
  | 'goals.deadline'
  | 'goals.filter.enable'
  | 'goals.filter.belowSec'
  | 'goals.filter.below'
  | 'timeDist.noData'
  | 'timeDist.switchInspection'
  | 'timeDist.switchSolve'
  | 'timeDist.solve'
  | 'timeDist.inspection'
  | 'timeDist.count'
  | 'metronome.tempo'
  | 'metronome.volume'
  | 'scrambleImage.copyTitle'
  | 'scrambleImage.copied'
  | 'scrambleImage.copyFailed'
  | 'command.placeholder'
  | 'command.help.language'
  | 'command.help.comment'
  | 'command.help.tags'
  | 'command.help.rewind'
  | 'command.help.settings'
  | 'command.help.unknown'
  | 'common.none'
  | 'common.processing'
  | 'common.unknown';

type TranslationRecord = Record<string, string>;

type RegisteredLanguage = {
	code: string;
	name: string;
	localizedNames?: Record<string, string>;
};

const builtinLanguages: RegisteredLanguage[] = [
	{ code: Language.EN, name: 'English', localizedNames: { [Language.EN]: 'English', [Language.DE]: 'Englisch', [Language.EO]: 'Angla' } },
	{ code: Language.DE, name: 'Deutsch', localizedNames: { [Language.EN]: 'German', [Language.DE]: 'Deutsch', [Language.EO]: 'Germana' } },
	{ code: Language.EO, name: 'Esperanto', localizedNames: { [Language.EN]: 'Esperanto', [Language.DE]: 'Esperanto', [Language.EO]: 'Esperanto' } }
];

const pluginLanguagesByOwner = new Map<string, Map<string, RegisteredLanguage>>();
const pluginTranslationsByOwner = new Map<string, Map<string, TranslationRecord>>();

const getRegisteredPluginLanguages = (): Map<string, RegisteredLanguage> => {
	const resolved = new Map<string, RegisteredLanguage>();
	for (const definitions of pluginLanguagesByOwner.values()) {
		for (const [code, definition] of definitions.entries()) resolved.set(code, definition);
	}
	return resolved;
};

const getPluginTranslationsForLanguage = (languageCode: string): TranslationRecord => {
	const merged: TranslationRecord = {};
	for (const definitions of pluginTranslationsByOwner.values()) {
		const languageTranslations = definitions.get(languageCode);
		if (languageTranslations) Object.assign(merged, languageTranslations);
	}
	return merged;
};

const dictionary: Record<string, TranslationRecord> = {
	[Language.EN]: {
		'settings.title': 'Settings',
		'general': 'General',
		'timer': 'Timer',
		'appearance': 'Appearance',
		'layout': 'Layout',
		'plugins': 'Plugins',
		'lists': 'Lists',
		'stats': 'Stats',
		'shortcuts': 'Shortcuts',
		'ui.hideWhileTiming': 'Hide UI while timing',
		'ui.hideText': 'Hidden Text (Optional)',
		'ui.pagination': 'Timelist Pagination',
		'ui.pageSize': 'Page Size',
		'timer.inspection': 'Use Inspection',
		'timer.direction': 'Direction',
		'timer.voice': 'Inspection Voice',
		'timer.autoPenalty': 'Auto Penalty (+2 / DNF)',
		'timer.abortAction': 'Abort Inspection',
		'timer.abortAction.dnf': 'Record DNF',
		'timer.abortAction.cancel': 'Cancel Only',
		'timer.useStackmat': 'Use Stackmat (Microphone)',
		'voice.none': 'None',
		'voice.male': 'Male',
		'voice.female': 'Female',
		'timer.holdToStart': 'Hold to Start',
		'timer.startInput': 'Start Input',
		'timer.restartDelay': 'Restart Delay',
		'timer.precision': 'Timer Precision',
		'timer.inspectionPrec': 'Inspection Precision',
		'timer.flashes': 'Inspection Flashes',
		'theme.title': 'Theme Preset',
		'theme.customColors': 'Custom Colors',
		'appearance.backgroundImage': 'Background Image',
		'appearance.imageUrl': 'Image URL',
		'appearance.opacity': 'Opacity',
		'appearance.scrambleImage': 'Scramble Image',
		'appearance.baseStyle': 'Base Style',
		'appearance.base.black': 'Black (Normal)',
		'appearance.base.white': 'White (Inverse)',
		'appearance.base.stickerless': 'Stickerless',
		'appearance.faceColors': 'Face Colors',
		'appearance.clockColors': 'Clock Colors',
		'appearance.personalBests': 'Personal Bests',
		'pb.visuals': 'PB Visual Style',
		'pb.fireworks': 'Single PB Fireworks',
		'list.columns': 'Time List Columns',
		'list.filter.time': 'Filter times (e.g. >10&<12, DNF)',
		'list.filter.tag': 'Filter tags...',
		'stats.global': 'Global Statistics',
		'stats.dist.title': 'Time Distribution Graph',
		'stats.dist.mode': 'Graph Range',
		'stats.dist.all': 'All Session Solves',
		'stats.dist.last': 'Last X Solves',
		'btn.save': 'Save Changes',
		'btn.cancel': 'Cancel',
		'btn.newSession': 'New Session',
		'btn.details': 'Details',
		'btn.delete': 'Delete',
		'session.manage': 'Manage Sessions',
		'session.type': 'Type',
		'session.override': 'Session Settings',
		'session.phases': 'Solve Phases',
		'session.prepbs': 'Pre-PBs (Current PBs)',
		'stat.single': 'Single',
		'stat.mean': 'Mean',
		'stat.avg': 'Average',
		'stat.stdDev': 'Std Dev',
		'stat.success': 'Success %',
		'stat.weighted': 'Weighted Avg',
		'color.bg': 'Background',
		'color.text': 'Text Color',
		'lang.select': 'Language',
		'lang.english': 'English',
		'lang.german': 'German',
		'lang.esperanto': 'Esperanto',
		'settings.dateFormat': 'Date Format',
		'settings.uiBehavior': 'UI & Behavior',
		'settings.mobileLayout': 'Mobile Layout',
		'settings.mobileBottomWidgets': 'Show widgets under timer',
		'settings.desktopLayout': 'Desktop Layout',
		'settings.desktopLayoutDesc': 'Configure the arrangement of UI elements for desktop screens.',
		'settings.openLayoutEditor': 'Open Layout Editor',
		'date.fmt.iso': 'ISO (YYYY-MM-DD)',
		'date.fmt.us': 'US (MM/DD/YYYY)',
		'date.fmt.eu': 'EU (DD/MM/YYYY)',
		'input.space': 'Spacebar',
		'input.ctrl': 'Ctrl + Ctrl',
		'input.near': 'Near Space',
		'input.any': 'Any Key',
    
		'timer.start': 'Press to Start',
		'timer.inspect': 'Press to Inspect',
		'timer.wait': 'Wait...',
		'timer.phase': 'Phase',
		'timer.inspectionState': 'Inspection',
		'timer.abortInspection': 'Abort Inspection',
		'timer.stackmatOn': 'Stackmat Connected',
		'timer.stackmatOff': 'Signal Lost',
		'timer.solvingPlaceholder': 'Solving...',

		'stats.modal.title': 'Statistics Dashboard',
		'stats.tab.global': 'Global',
		'stats.tab.session': 'Session',
		'stats.totalSolves': 'Total Solves',
		'stats.totalTime': 'Total Time Solving',
		'stats.totalInspection': 'Total Inspection',
		'stats.avgTime': 'Average Solve',
		'stats.heatmap.title': 'Solves by Time of Day',
		'stats.heatmap.all': 'All Time',
		'stats.heatmap.year': 'This Year',
		'stats.heatmap.month': 'This Month',
		'stats.daily.title': 'Daily Summary',
		'stats.subx.title': 'Sub-X Counter',
		'stats.subx.label': 'Threshold (sec)',
		'stats.pb.title': 'PB History',
		'stats.chart.times': 'Solve Times',
		'stats.chart.inspection': 'Inspection Times',
		'stats.chart.penalty': 'Penalty Distribution',
		'stats.chart.distribution': 'Time Distribution',
		'stats.selectSession': 'Select Session',
		'stats.improvement': 'Improvement',
		'stats.noSessions': 'No sessions found',
		'stats.noSolvesMonth': 'No solves this month',
		'stats.totalSessions': 'Total Sessions',
		'stats.solves': 'solves',
		'stats.sessionNotFound': 'Session not found.',
		'stats.detailed.title': 'Detailed History',
		'stats.detailed.daily': 'Daily',
		'stats.detailed.weekly': 'Weekly',
		'stats.detailed.monthly': 'Monthly',
		'stats.detailed.yearly': 'Yearly',
		'stats.detailed.day': 'Day',
		'stats.detailed.week': 'Week',
		'stats.detailed.month': 'Month',
		'stats.detailed.year': 'Year',
		'stats.detailed.best': 'Best',
		'stats.detailed.avg': 'Avg',
		'stats.detailed.count': 'Solves',
		'stats.detailed.totalTime': 'Total Time',
		'stats.detailed.breakdown': 'Session Breakdown',
		'stats.detailed.allSessions': 'All Sessions',
		'stats.detailed.noData': 'No data for this range.',
		'stats.freq.title': 'Solves Over Time',
		'stats.freq.day': 'Day',
		'stats.freq.week': 'Week',
		'stats.freq.month': 'Month',
		'stats.freq.year': 'Year',

		'details.title': 'Solve Details',
		'details.date': 'Date',
		'details.scramble': 'Scramble',
		'details.time': 'Time',
		'details.penalty': 'Penalty',
		'details.phases': 'Phases',
		'details.copy': 'Copy Export',
		'details.comment': 'Comment',
		'details.addComment': 'Add a comment...',
		'details.noComment': 'No comment.',
		'details.base': 'Base',
		'details.readOnly': 'Read Only',
		'details.locked': 'Locked',
		'details.tags': 'Tags',
		'details.phaseNumber': '#',
		'details.phaseSplit': 'Split',
		'details.phaseTotal': 'Total',

		'data.manage': 'Data Management',
		'data.export': 'Export to File',
		'data.import': 'Import from File',
		'data.copied': 'Copied to clipboard!',
		'data.copied.short': 'Copied',
		'import.title': 'Import Data',
		'import.preview': 'Sessions Found',
		'import.select': 'Action',
		'import.asNew': 'Import as New',
		'import.merge': 'Merge into:',
		'import.success': 'Import Successful!',
		'import.settings': 'Settings & Config',
		'import.format.cmos': 'Format: CMOSTimer',
		'import.format.cs': 'Format: csTimer',
		'import.supportInfo': 'Supports CMOSTimer (.json), csTimer (.txt), NanoTimer (.csv), and Cubic Timer (.txt).',
		'btn.confirmImport': 'Confirm Import',

		'shortcut.title': 'Keyboard Shortcuts',
		'shortcut.instruction': 'Click on a box and press the desired key combination to bind.',
		'shortcut.none': 'None',
		'shortcut.clear': 'Clear',
		'shortcut.NEXT_SCRAMBLE': 'Next Scramble',
		'shortcut.PREV_SCRAMBLE': 'Previous Scramble',
		'shortcut.PENALTY_PLUS_TWO': 'Toggle +2',
		'shortcut.PENALTY_DNF': 'Toggle DNF',
		'shortcut.DELETE_LAST': 'Delete Selected/Last',
		'shortcut.SELECT_FIRST': 'Select First',
		'shortcut.OPEN_DETAILS': 'Open Details',
		'shortcut.ESCAPE': 'Escape (Abort/DNF/Close Modal)',
		'shortcut.MOVE_SELECTION_UP': 'Move Selection Up',
		'shortcut.MOVE_SELECTION_DOWN': 'Move Selection Down',
		'shortcut.EXTEND_SELECTION_UP': 'Extend Selection Up',
		'shortcut.EXTEND_SELECTION_DOWN': 'Extend Selection Down',
		'shortcut.OPEN_SESSION_MANAGER': 'Open Session Manager',
		'shortcut.MANUAL_ENTRY': 'Manual Time Entry',
		'shortcut.PREV_PUZZLE': 'Previous Puzzle (Relay)',
		'shortcut.NEXT_PUZZLE': 'Next Puzzle (Relay)',
		'shortcut.OPEN_COMMAND_PALETTE': 'Open Command Palette',
		'shortcut.conflict': 'Warning: This key is already bound to another action or is a system key.',

		'profile.title': 'Cloud Synchronization',
		'profile.login': 'Log In',
		'profile.register': 'Register',
		'profile.logout': 'Log Out',
		'profile.username': 'Username',
		'profile.email': 'Email',
		'profile.password': 'Password',
		'profile.syncing': 'Syncing...',
		'profile.synced': 'Synced',
		'profile.unsaved': 'Unsaved Changes',
		'profile.error': 'Error',
		'profile.conflict': 'Overwrite Warning',
		'profile.conflictDesc': 'You have local solves that are not saved to an account. Logging in will OVERWRITE your local data with the data from the server. To keep these solves, please Register instead.',
		'profile.validation.username': 'Username must be 5-64 characters.',
		'profile.validation.password': 'Password must be 8-1000 characters.',
		'profile.validation.email': 'Please enter a valid email address.',
		'profile.lastSync': 'Last:',
		'btn.continue': 'I understand, Overwrite',

		'settings.pbsheet': 'PB Sheet',
		'pbsheet.enabled': 'Enable External PB Sheet',
		'pbsheet.title': 'Sheet Title',
		'pbsheet.sessions': 'Displayed Sessions',
		'pbsheet.stats': 'Displayed Statistics',
		'pbsheet.options': 'Display Options',
		'pbsheet.showDate': 'Include Date of PB',
		'pbsheet.showCount': 'Include Total Solve Count',
		'pbsheet.addSession': 'Add Session to Sheet',
		'pbsheet.addStat': 'Add Statistic',
		'pbsheet.noMatch': 'No matching sessions',

		'tag.title': 'Solve Tags',
		'tag.new': 'New Tag...',
		'tag.noneConfig': 'No tags configured.',
		'tag.presets': 'Add Presets',
		'tag.noneSet': 'No tags set.',
		'tag.configure': 'Configure',

		'plugin.new': 'New Plugin',
		'plugin.namePlaceholder': 'Plugin Name',
		'plugin.api': 'Available API:',
		'plugin.warning': 'Warning: Plugins can execute arbitrary code. Only add scripts from trusted sources. Malicious scripts can delete your data or compromise your account.',
		'plugin.edit': 'Edit',
		'plugin.empty': 'No plugins installed.',
		'plugin.add': 'Add New Plugin',
		'plugin.deleteConfirm': 'Delete this plugin?',

		'layout.title': 'Layout Editor',
		'layout.preset': 'Preset Layout',
		'layout.widgets': 'Available Widgets',
		'layout.info': 'Fixed widgets cannot be moved in this preset.',
		'layout.emptySlot': 'Empty Slot',
		'layout.remove': 'Remove',
		'layout.mirror': 'Mirror Layout',
		'layout.mirrorDesc': 'Flip all desktop areas left-to-right (time list moves to the left).',
		'layout.save': 'Save Layout',

		'list.empty': 'No solves match filter',
		'list.move': 'Move',
		'list.duplicate': 'Duplicate...',
		'list.deleteEverywhere': 'Delete Everywhere',
		'list.deleteEverywhereConfirm': 'Are you sure you want to delete this data from ALL sessions?',

		'move.titleMove': 'Move Solves',
		'move.titleDup': 'Duplicate Solves',
		'move.noSessions': 'No available sessions.',
		'move.labelMove': 'Move',
		'move.labelDup': 'Copy',
		'move.actionMove': 'Move Solves',
		'move.actionDup': 'Duplicate',

		'session.search': 'Search sessions...',
		'session.new': 'New Session',
		'session.create': 'Create',
		'session.cancel': 'Cancel',
		'session.namePlaceholder': 'Session Name...',
		'session.addTag': 'Add tag...',
		'session.notFound': 'No sessions found.',

		'session.locked': 'Session Locked',
		'session.lockedDesc': 'Prevent modification of solves',
		'session.timerBehavior': 'Timer Behavior',
		'session.advanced': 'Advanced',
		'session.virtualCube': 'Virtual Cube',
		'session.enabled': 'Enabled',
		'session.disabled': 'Disabled',
		'session.global': 'Global',
		'session.linked': 'Linked Sessions',
		'session.linkedDesc': 'Solves added to linked sessions will automatically appear in this session.',
		'session.searchLink': 'Search sessions to link...',
		'session.results': 'results',
		'session.selectAll': 'Select All',
		'session.clear': 'Clear',
		'session.linkBtn': 'Link',
		'session.layoutOverride': 'Layout Override',
		'session.resetGlobal': 'Reset to Global',
		'session.editLayout': 'Edit Session Layout',
		'session.overrideLayout': 'Override Global Layout',

		'scrambler.title': 'Select Scrambler / Build Relay',
		'scrambler.custom.info': 'Define your own scrambling logic.',
		'scrambler.add': 'Add to Relay',
		'scrambler.moves': 'Allowed Moves (Space separated)',
		'scrambler.opposites': 'Opposite Groups (e.g. "U-D R-L")',
		'scrambler.length': 'Scramble Length',
		'scrambler.selected': 'Selected Scramblers',
		'scrambler.sequence': 'Reihenfolge für Session (Relay)',
		'scrambler.empty': 'Liste ist leer. Wähle ein Puzzle.',
		'scrambler.confirm': 'Bestätigen',

		'about.title': 'About CMOSTimer v3',
		'about.p1': 'Welcome to CMOSTimer v3, a modern, feature-rich speedcubing timer designed for enthusiasts and professionals alike.',
		'about.p2': 'Built with performance and aesthetics in mind, it offers advanced statistics, session management, and real-time visualization of your solving progress.',
		'about.features': 'Key Features',
		'about.feat1': 'Precise timing with inspection support',
		'about.feat2': 'Multi-phase solve tracking',
		'about.feat3': 'Comprehensive statistical analysis',
		'about.feat4': 'Customizable themes and layouts',
		'about.feat5': 'Scramble visualization for all WCA events',
		'about.footer': 'Developed with React & TypeScript',
		'rewind.pbsSurpassed': 'Personal Bests surpassed',
		'activity.title': 'Activity',
		'activity.mode.session': 'Session',
		'activity.mode.lastHour': 'Last Hour',
		'activity.mode.last24h': 'Last 24H',
		'activity.mode.last7d': 'Last 7 Days',
		'activity.mode.last30d': 'Last 30 Days',
		'activity.mode.lastYear': 'Last Year',
		'activity.mode.since': 'Since...',
		'activity.mode.lastX': 'Last X...',
		'activity.noData': 'No activity',
		'goals.title': 'Goals',
		'goals.hideCompleted': 'Hide Completed',
		'goals.showCompleted': 'Show Completed',
		'goals.none': 'No goals set.',
		'goals.allCompleted': 'All goals completed!',
		'goals.createOne': 'Create one',
		'goals.newGoal': 'New Goal',
		'goals.editGoal': 'Edit Goal',
		'goals.type': 'Type',
		'goals.type.solveCount': 'Number of Solves',
		'goals.type.timeSpent': 'Time Spent Cubing',
		'goals.type.statTarget': 'Stat Target (e.g. Sub-X)',
		'goals.type.statTargetShort': 'Sub-',
		'goals.frequency': 'Frequency',
		'goals.frequency.daily': 'Daily',
		'goals.frequency.weekly': 'Weekly',
		'goals.frequency.monthly': 'Monthly',
		'goals.frequency.yearly': 'Yearly',
		'goals.frequency.byDate': 'By Date',
		'goals.frequency.infinite': 'All Time',
		'goals.scope': 'Scope',
		'goals.scope.global': 'Global',
		'goals.scope.session': 'Session',
		'goals.selectSession': 'Select Session',
		'goals.targetCount': 'Target Count',
		'goals.targetDuration': 'Target Duration (Minutes)',
		'goals.targetTimeSec': 'Target Time (Seconds)',
		'goals.deadline': 'Deadline',
		'goals.filter.enable': 'Only count solves below a time threshold',
		'goals.filter.belowSec': 'Only count solves below (seconds)',
		'goals.filter.below': 'Below',
		'timeDist.noData': 'No Data',
		'timeDist.switchInspection': 'Switch to inspection distribution',
		'timeDist.switchSolve': 'Switch to solve time distribution',
		'timeDist.solve': 'Solve',
		'timeDist.inspection': 'Inspection',
		'timeDist.count': 'Count',
		'metronome.tempo': 'Tempo',
		'metronome.volume': 'Volume',
		'scrambleImage.copyTitle': 'Click to copy scramble image',
		'scrambleImage.copied': 'Copied',
		'scrambleImage.copyFailed': 'Copy failed',
		'command.placeholder': '> Type command (lang, c, tag, rewind, settings)...',
		'command.help.language': 'Set language:',
		'command.help.comment': 'Set comment:',
		'command.help.tags': 'Set tags:',
		'command.help.rewind': 'Show Year in Review',
		'command.help.settings': 'Open Settings',
		'command.help.unknown': 'Unknown command',
		'common.none': 'None',
		'common.processing': 'Processing...',
		'common.unknown': 'Unknown',
	},
	[Language.EO]: {
		'settings.title': 'Agordoj',
		'general': 'Ĝenerala',
		'timer': 'Tempigilo',
		'appearance': 'Aspekto',
		'layout': 'Aranĝo',
		'plugins': 'Kromaĵoj',
		'lists': 'Listoj',
		'stats': 'Statistikoj',
		'shortcuts': 'Fulmoklavoj',
		'ui.hideWhileTiming': 'Kaŝi interfacon dum tempomezurado',
		'ui.hideText': 'Kaŝita teksto (nedeviga)',
		'ui.pagination': 'Paĝumado de tempolisto',
		'ui.pageSize': 'Paĝa grando',
		'timer.inspection': 'Uzi inspektadon',
		'timer.direction': 'Direkto',
		'timer.voice': 'Voĉo por inspektado',
		'timer.autoPenalty': 'Aŭtomata puno (+2 / DNF)',
		'timer.abortAction': 'Ĉesigi inspektadon',
		'timer.abortAction.dnf': 'Registri DNF',
		'timer.abortAction.cancel': 'Nur nuligi',
		'timer.useStackmat': 'Uzi Stackmat-on (mikrofono)',
		'voice.none': 'Neniu',
		'voice.male': 'Vira',
		'voice.female': 'Ina',
		'timer.holdToStart': 'Teni por komenci',
		'timer.startInput': 'Komenca enigo',
		'timer.restartDelay': 'Prokrasto por rekomenco',
		'timer.precision': 'Precizeco de tempigilo',
		'timer.inspectionPrec': 'Precizeco de inspektado',
		'timer.flashes': 'Fulmoj de inspektado',
		'theme.title': 'Etosa antaŭagordo',
		'theme.customColors': 'Propraj koloroj',
		'appearance.backgroundImage': 'Fona bildo',
		'appearance.imageUrl': 'Bilda URL',
		'appearance.opacity': 'Travidebleco',
		'appearance.scrambleImage': 'Miksa bildo',
		'appearance.baseStyle': 'Baza stilo',
		'appearance.base.black': 'Nigra (normala)',
		'appearance.base.white': 'Blanka (inversa)',
		'appearance.base.stickerless': 'Sen-glumarka',
		'appearance.faceColors': 'Koloroj de flankoj',
		'appearance.clockColors': 'Koloroj de Clock',
		'appearance.personalBests': 'Personaj rekordoj',
		'pb.visuals': 'Vida stilo de PR',
		'pb.fireworks': 'Artfajraĵoj por unuopa PR',
		'list.columns': 'Kolumnoj de tempolisto',
		'list.filter.time': 'Filtri tempojn (ekz. >10&<12, DNF)',
		'list.filter.tag': 'Filtri etikedojn...',
		'stats.global': 'Tutmondaj statistikoj',
		'stats.dist.title': 'Grafiko de tempodistribuo',
		'stats.dist.mode': 'Amplekso de grafiko',
		'stats.dist.all': 'Ĉiuj solvoj de sesio',
		'stats.dist.last': 'Lastaj X solvoj',
		'btn.save': 'Konservi ŝanĝojn',
		'btn.cancel': 'Nuligi',
		'btn.newSession': 'Nova sesio',
		'btn.details': 'Detaloj',
		'btn.delete': 'Forigi',
		'session.manage': 'Administri sesiojn',
		'session.type': 'Tipo',
		'session.override': 'Agordoj de sesio',
		'session.phases': 'Fazoj de solvo',
		'session.prepbs': 'Antaŭaj PR-oj (nunaj PR-oj)',
		'stat.single': 'Unuopa',
		'stat.mean': 'Mezumo',
		'stat.avg': 'Averaĝo',
		'stat.stdDev': 'Norma devio',
		'stat.success': 'Sukceso %',
		'stat.weighted': 'Pezigita averaĝo',
		'color.bg': 'Fono',
		'color.text': 'Teksta koloro',
		'lang.select': 'Lingvo',
		'lang.english': 'Angla',
		'lang.german': 'Germana',
		'lang.esperanto': 'Esperanto',
		'settings.dateFormat': 'Dat-formato',
		'settings.uiBehavior': 'Interfaco kaj konduto',
		'settings.mobileLayout': 'Poŝtelefona aranĝo',
		'settings.mobileBottomWidgets': 'Montri fenestraĵojn sub la tempigilo',
		'settings.desktopLayout': 'Labortabla aranĝo',
		'settings.desktopLayoutDesc': 'Agordu la ordigon de la UI-elementoj por labortablaj ekranoj.',
		'settings.openLayoutEditor': 'Malfermi aranĝredaktilon',
		'date.fmt.iso': 'ISO (JJJJ-MM-TT)',
		'date.fmt.us': 'US (MM/TT/JJJJ)',
		'date.fmt.eu': 'EU (TT/MM/JJJJ)',
		'input.space': 'Spacoklavo',
		'input.ctrl': 'Ctrl + Ctrl',
		'input.near': 'Proksime de Spaco',
		'input.any': 'Ajna klavo',

		'timer.start': 'Premu por komenci',
		'timer.inspect': 'Premu por inspekti',
		'timer.wait': 'Atendu...',
		'timer.phase': 'Fazo',
		'timer.inspectionState': 'Inspektado',
		'timer.abortInspection': 'Ĉesigi inspektadon',
		'timer.stackmatOn': 'Stackmat konektita',
		'timer.stackmatOff': 'Signalo perdita',
		'timer.solvingPlaceholder': 'Solvante...',

		'stats.modal.title': 'Statistika panelo',
		'stats.tab.global': 'Tutmonda',
		'stats.tab.session': 'Sesio',
		'stats.totalSolves': 'Sumo de solvoj',
		'stats.totalTime': 'Tuta tempo solvanta',
		'stats.totalInspection': 'Tuta inspektado',
		'stats.avgTime': 'Averaĝa solvo',
		'stats.heatmap.title': 'Solvoj laŭ tempo de tago',
		'stats.heatmap.all': 'Ĉiam',
		'stats.heatmap.year': 'Ĉi-jare',
		'stats.heatmap.month': 'Ĉi-monate',
		'stats.daily.title': 'Ĉiutaga resumo',
		'stats.subx.title': 'Sub-X nombrilo',
		'stats.subx.label': 'Sojlo (sek)',
		'stats.pb.title': 'Historio de PR-oj',
		'stats.chart.times': 'Tempoj de solvoj',
		'stats.chart.inspection': 'Tempoj de inspektado',
		'stats.chart.penalty': 'Distribuo de punoj',
		'stats.chart.distribution': 'Tempodistribuo',
		'stats.selectSession': 'Elekti sesion',
		'stats.improvement': 'Pliboniĝo',
		'stats.noSessions': 'Neniuj sesioj trovitaj',
		'stats.noSolvesMonth': 'Neniuj solvoj ĉi-monate',
		'stats.totalSessions': 'Sumo de sesioj',
		'stats.solves': 'solvoj',
		'stats.sessionNotFound': 'Sesio ne trovita.',
		'stats.detailed.title': 'Detala historio',
		'stats.detailed.daily': 'Ĉiutage',
		'stats.detailed.weekly': 'Ĉiusemajne',
		'stats.detailed.monthly': 'Ĉiumonate',
		'stats.detailed.yearly': 'Ĉiujare',
		'stats.detailed.day': 'Tago',
		'stats.detailed.week': 'Semajno',
		'stats.detailed.month': 'Monato',
		'stats.detailed.year': 'Jaro',
		'stats.detailed.best': 'Plej bona',
		'stats.detailed.avg': 'Averaĝo',
		'stats.detailed.count': 'Solvoj',
		'stats.detailed.totalTime': 'Tuta tempo',
		'stats.detailed.breakdown': 'Disigo laŭ sesio',
		'stats.detailed.allSessions': 'Ĉiuj sesioj',
		'stats.detailed.noData': 'Neniuj datumoj por ĉi tiu intervalo.',
		'stats.freq.title': 'Solvoj laŭ tempo',
		'stats.freq.day': 'Tago',
		'stats.freq.week': 'Semajno',
		'stats.freq.month': 'Monato',
		'stats.freq.year': 'Jaro',

		'details.title': 'Detaloj de solvo',
		'details.date': 'Dato',
		'details.scramble': 'Mikso',
		'details.time': 'Tempo',
		'details.penalty': 'Puno',
		'details.phases': 'Fazoj',
		'details.copy': 'Kopii eksporton',
		'details.comment': 'Komento',
		'details.addComment': 'Aldoni komenton...',
		'details.noComment': 'Neniu komento.',
		'details.base': 'Bazo',
		'details.readOnly': 'Nurlega',
		'details.locked': 'Ŝlosita',
		'details.tags': 'Etikedoj',
		'details.phaseNumber': '#',
		'details.phaseSplit': 'Parta tempo',
		'details.phaseTotal': 'Sumo',

		'data.manage': 'Administrado de datumoj',
		'data.export': 'Eksporti al dosiero',
		'data.import': 'Importi el dosiero',
		'data.copied': 'Kopiite al tondujo!',
		'data.copied.short': 'Kopiite',
		'import.title': 'Importi datumojn',
		'import.preview': 'Trovitaj sesioj',
		'import.select': 'Ago',
		'import.asNew': 'Importi kiel novan',
		'import.merge': 'Kunfandi en:',
		'import.success': 'Importo sukcesis!',
		'import.settings': 'Agordoj kaj konfiguro',
		'import.format.cmos': 'Formato: CMOSTimer',
		'import.format.cs': 'Formato: csTimer',
		'import.supportInfo': 'Subtenas CMOSTimer (.json), csTimer (.txt), NanoTimer (.csv) kaj Cubic Timer (.txt).',
		'btn.confirmImport': 'Konfirmi importon',

		'shortcut.title': 'Fulmoklavoj',
		'shortcut.instruction': 'Alklaku kampon kaj premu la deziratan klavkombinon por ligi ĝin.',
		'shortcut.none': 'Neniu',
		'shortcut.clear': 'Forigi',
		'shortcut.NEXT_SCRAMBLE': 'Sekva mikso',
		'shortcut.PREV_SCRAMBLE': 'Antaŭa mikso',
		'shortcut.PENALTY_PLUS_TWO': 'Ŝalti +2',
		'shortcut.PENALTY_DNF': 'Ŝalti DNF',
		'shortcut.DELETE_LAST': 'Forigi elektitan/lastan',
		'shortcut.SELECT_FIRST': 'Elekti unuan',
		'shortcut.OPEN_DETAILS': 'Malfermi detalojn',
		'shortcut.ESCAPE': 'Escape (ĉesigi/DNF/fermi modalon)',
		'shortcut.MOVE_SELECTION_UP': 'Movi elekton supren',
		'shortcut.MOVE_SELECTION_DOWN': 'Movi elekton malsupren',
		'shortcut.EXTEND_SELECTION_UP': 'Etendi elekton supren',
		'shortcut.EXTEND_SELECTION_DOWN': 'Etendi elekton malsupren',
		'shortcut.OPEN_SESSION_MANAGER': 'Malfermi sesiadministrilon',
		'shortcut.MANUAL_ENTRY': 'Mana enigo de tempo',
		'shortcut.PREV_PUZZLE': 'Antaŭa puzlo (relajso)',
		'shortcut.NEXT_PUZZLE': 'Sekva puzlo (relajso)',
		'shortcut.OPEN_COMMAND_PALETTE': 'Malfermi komandpaletron',
		'shortcut.conflict': 'Averto: ĉi tiu klavo jam estas ligita al alia ago aŭ estas sistema klavo.',

		'profile.title': 'Nuba sinkronigo',
		'profile.login': 'Ensaluti',
		'profile.register': 'Registriĝi',
		'profile.logout': 'Elsaluti',
		'profile.username': 'Uzantnomo',
		'profile.email': 'Retpoŝto',
		'profile.password': 'Pasvorto',
		'profile.syncing': 'Sinkronigante...',
		'profile.synced': 'Sinkronigita',
		'profile.unsaved': 'Nekonservitaj ŝanĝoj',
		'profile.error': 'Eraro',
		'profile.conflict': 'Averto pri anstataŭigo',
		'profile.conflictDesc': 'Vi havas lokajn solvojn kiuj ne estas konservitaj en konto. Ensaluto ANSTATAŬIGOS viajn lokajn datumojn per la datumoj de la servilo. Por konservi tiujn solvojn, bonvolu registriĝi anstataŭe.',
		'profile.validation.username': 'Uzantnomo devas havi 5-64 signojn.',
		'profile.validation.password': 'Pasvorto devas havi 8-1000 signojn.',
		'profile.validation.email': 'Bonvolu enigi validan retpoŝtadreson.',
		'profile.lastSync': 'Laste:',
		'btn.continue': 'Mi komprenas, anstataŭigi',

		'settings.pbsheet': 'PB-folio',
		'pbsheet.enabled': 'Ebligi eksteran PB-folion',
		'pbsheet.title': 'Titolo de folio',
		'pbsheet.sessions': 'Montrataj sesioj',
		'pbsheet.stats': 'Montrataj statistikoj',
		'pbsheet.options': 'Montraj opcioj',
		'pbsheet.showDate': 'Montri daton de PR',
		'pbsheet.showCount': 'Montri totalan nombron de solvoj',
		'pbsheet.addSession': 'Aldoni sesion al folio',
		'pbsheet.addStat': 'Aldoni statistikon',
		'pbsheet.noMatch': 'Neniuj kongruaj sesioj',

		'tag.title': 'Etikedoj de solvoj',
		'tag.new': 'Nova etikedo...',
		'tag.noneConfig': 'Neniuj etikedoj agorditaj.',
		'tag.presets': 'Aldoni antaŭagordojn',
		'tag.noneSet': 'Neniuj etikedoj fiksitaj.',
		'tag.configure': 'Agordi',

		'plugin.new': 'Nova kromaĵo',
		'plugin.namePlaceholder': 'Nomo de kromaĵo',
		'plugin.api': 'Havebla API:',
		'plugin.warning': 'Averto: kromaĵoj povas ruli arbitran kodon. Aldonu nur skriptojn el fidindaj fontoj. Malicaj skriptoj povas forigi viajn datumojn aŭ endanĝerigi vian konton.',
		'plugin.edit': 'Redakti',
		'plugin.empty': 'Neniuj kromaĵoj instalitaj.',
		'plugin.add': 'Aldoni novan kromaĵon',
		'plugin.deleteConfirm': 'Ĉu forigi ĉi tiun kromaĵon?',

		'layout.title': 'Aranĝredaktilo',
		'layout.preset': 'Antaŭagordita aranĝo',
		'layout.widgets': 'Haveblaj fenestraĵoj',
		'layout.info': 'Fiksaj fenestraĵoj ne povas esti movataj en ĉi tiu antaŭagordo.',
		'layout.emptySlot': 'Malplena loko',
		'layout.remove': 'Forigi',
		'layout.mirror': 'Speguli aranĝon',
		'layout.mirrorDesc': 'Renversi ĉiujn labortablajn areojn de maldekstre dekstren (tempolisto moviĝas maldekstren).',
		'layout.save': 'Konservi aranĝon',

		'list.empty': 'Neniuj solvoj kongruas kun la filtrilo',
		'list.move': 'Movi',
		'list.duplicate': 'Duobligi...',
		'list.deleteEverywhere': 'Forigi ĉie',
		'list.deleteEverywhereConfirm': 'Ĉu vi certas ke vi volas forigi ĉi tiujn datumojn el ĈIUJ sesioj?',

		'move.titleMove': 'Movi solvojn',
		'move.titleDup': 'Duobligi solvojn',
		'move.noSessions': 'Neniuj disponeblaj sesioj.',
		'move.labelMove': 'Movi',
		'move.labelDup': 'Kopii',
		'move.actionMove': 'Movi solvojn',
		'move.actionDup': 'Duobligi',

		'session.search': 'Serĉi sesiojn...',
		'session.new': 'Nova sesio',
		'session.create': 'Krei',
		'session.cancel': 'Nuligi',
		'session.namePlaceholder': 'Nomo de sesio...',
		'session.addTag': 'Aldoni etikedon...',
		'session.notFound': 'Neniuj sesioj trovitaj.',

		'session.locked': 'Sesio ŝlosita',
		'session.lockedDesc': 'Malebligi modifon de solvoj',
		'session.timerBehavior': 'Konduto de tempigilo',
		'session.advanced': 'Altnivela',
		'session.virtualCube': 'Virtuala kubo',
		'session.enabled': 'Ebligita',
		'session.disabled': 'Malebligita',
		'session.global': 'Tutmonda',
		'session.linked': 'Ligitaj sesioj',
		'session.linkedDesc': 'Solvoj aldonitaj al ligitaj sesioj aŭtomate aperos en ĉi tiu sesio.',
		'session.searchLink': 'Serĉi sesiojn por ligi...',
		'session.results': 'rezultoj',
		'session.selectAll': 'Elekti ĉiujn',
		'session.clear': 'Viŝi',
		'session.linkBtn': 'Ligi',
		'session.layoutOverride': 'Anstataŭigi aranĝon',
		'session.resetGlobal': 'Restarigi al tutmonda',
		'session.editLayout': 'Redakti sesian aranĝon',
		'session.overrideLayout': 'Anstataŭigi tutmondan aranĝon',

		'scrambler.title': 'Elekti miksilon / konstrui relajson',
		'scrambler.custom.info': 'Difinu propran miksan logikon.',
		'scrambler.add': 'Aldoni al relajso',
		'scrambler.moves': 'Permesitaj movoj (disigitaj per spaco)',
		'scrambler.opposites': 'Kontraŭaj grupoj (ekz. "U-D R-L")',
		'scrambler.length': 'Longeco de mikso',
		'scrambler.selected': 'Elektitaj miksiloj',
		'scrambler.sequence': 'Sinsekvo por sesio (relajso)',
		'scrambler.empty': 'La listo estas malplena. Elektu puzlon.',
		'scrambler.confirm': 'Konfirmi',

		'about.title': 'Pri CMOSTimer v3',
		'about.p1': 'Bonvenon al CMOSTimer v3, moderna kaj funkcioplena tempigilo por rapidekubado desegnita por entuziasmuloj kaj profesiuloj.',
		'about.p2': 'Konstruita kun rendimento kaj estetiko en menso, ĝi ofertas altnivelajn statistikojn, sesiadministradon kaj realtempan bildigon de via solvprogreso.',
		'about.features': 'Ĉefaj trajtoj',
		'about.feat1': 'Preciza mezurado kun subteno por inspektado',
		'about.feat2': 'Spurado de multfazaj solvoj',
		'about.feat3': 'Kompleta statistika analizo',
		'about.feat4': 'Agordeblaj etosoj kaj aranĝoj',
		'about.feat5': 'Bildigo de miksoj por ĉiuj WCA-eventoj',
		'about.footer': 'Evoluigita per React kaj TypeScript',
		'rewind.pbsSurpassed': 'Superitaj personaj rekordoj',
		'activity.title': 'Aktiveco',
		'activity.mode.session': 'Sesio',
		'activity.mode.lastHour': 'Lasta horo',
		'activity.mode.last24h': 'Lastaj 24h',
		'activity.mode.last7d': 'Lastaj 7 tagoj',
		'activity.mode.last30d': 'Lastaj 30 tagoj',
		'activity.mode.lastYear': 'Lasta jaro',
		'activity.mode.since': 'Ekde...',
		'activity.mode.lastX': 'Lastaj X...',
		'activity.noData': 'Neniu aktiveco',
		'goals.title': 'Celoj',
		'goals.hideCompleted': 'Kaŝi plenumitajn',
		'goals.showCompleted': 'Montri plenumitajn',
		'goals.none': 'Neniuj celoj fiksitaj.',
		'goals.allCompleted': 'Ĉiuj celoj plenumitaj!',
		'goals.createOne': 'Krei unu',
		'goals.newGoal': 'Nova celo',
		'goals.editGoal': 'Redakti celon',
		'goals.type': 'Tipo',
		'goals.type.solveCount': 'Nombro de solvoj',
		'goals.type.timeSpent': 'Tempo pasigita kubante',
		'goals.type.statTarget': 'Statistika celo (ekz. Sub-X)',
		'goals.type.statTargetShort': 'Sub-',
		'goals.frequency': 'Ofteco',
		'goals.frequency.daily': 'Ĉiutage',
		'goals.frequency.weekly': 'Ĉiusemajne',
		'goals.frequency.monthly': 'Ĉiumonate',
		'goals.frequency.yearly': 'Ĉiujare',
		'goals.frequency.byDate': 'Laŭ dato',
		'goals.frequency.infinite': 'Ĉiam',
		'goals.scope': 'Amplekso',
		'goals.scope.global': 'Tutmonda',
		'goals.scope.session': 'Sesio',
		'goals.selectSession': 'Elekti sesion',
		'goals.targetCount': 'Celnombro',
		'goals.targetDuration': 'Celdaŭro (minutoj)',
		'goals.targetTimeSec': 'Celtempo (sekundoj)',
		'goals.deadline': 'Limdato',
		'goals.filter.enable': 'Kalkuli nur solvojn sub tempolimo',
		'goals.filter.belowSec': 'Kalkuli nur solvojn sub (sekundoj)',
		'goals.filter.below': 'Sub',
		'timeDist.noData': 'Neniuj datumoj',
		'timeDist.switchInspection': 'Ŝanĝi al distribuo de inspektado',
		'timeDist.switchSolve': 'Ŝanĝi al distribuo de solvtempo',
		'timeDist.solve': 'Solvo',
		'timeDist.inspection': 'Inspektado',
		'timeDist.count': 'Nombro',
		'metronome.tempo': 'Takto',
		'metronome.volume': 'Laŭteco',
		'scrambleImage.copyTitle': 'Alklaku por kopii miksan bildon',
		'scrambleImage.copied': 'Kopiite',
		'scrambleImage.copyFailed': 'Kopiado malsukcesis',
		'command.placeholder': '> Tajpu komandon (lang, c, tag, rewind, settings)...',
		'command.help.language': 'Agordi lingvon:',
		'command.help.comment': 'Agordi komenton:',
		'command.help.tags': 'Agordi etikedojn:',
		'command.help.rewind': 'Montri Jaron en Retrospektivo',
		'command.help.settings': 'Malfermi agordojn',
		'command.help.unknown': 'Nekonata komando',
		'common.none': 'Neniu',
		'common.processing': 'Prilaborante...',
		'common.unknown': 'Nekonata',
	},
	[Language.DE]: {
		'settings.title': 'Einstellungen',
		'general': 'Allgemein',
		'timer': 'Timer',
		'appearance': 'Aussehen',
		'layout': 'Layout',
		'plugins': 'Plugins',
		'lists': 'Listen',
		'stats': 'Statistiken',
		'shortcuts': 'Tastenkürzel',
		'ui.hideWhileTiming': 'UI während Timer ausblenden',
		'ui.hideText': 'Versteckter Text',
		'ui.pagination': 'Zeitenliste Pagination',
		'ui.pageSize': 'Seitengröße',
		'timer.inspection': 'Inspektion nutzen',
		'timer.direction': 'Richtung',
		'timer.voice': 'Inspektion Stimme',
		'timer.autoPenalty': 'Auto Strafe (+2 / DNF)',
		'timer.abortAction': 'Inspektion abbrechen',
		'timer.abortAction.dnf': 'DNF eintragen',
		'timer.abortAction.cancel': 'Nur abbrechen',
		'timer.useStackmat': 'Stackmat Benutzen (Mikro)',
		'voice.none': 'Keine',
		'voice.male': 'Männlich',
		'voice.female': 'Weiblich',
		'timer.holdToStart': 'Halten zum Starten',
		'timer.startInput': 'Start Taste',
		'timer.restartDelay': 'Neustart-Verzögerung',
		'timer.precision': 'Timer Genauigkeit',
		'timer.inspectionPrec': 'Inspektion Genauigkeit',
		'timer.flashes': 'Inspektion Aufblitzen',
		'theme.title': 'Design Vorlage',
		'theme.customColors': 'Benutzerdefinierte Farben',
		'appearance.backgroundImage': 'Hintergrundbild',
		'appearance.imageUrl': 'Bild-URL',
		'appearance.opacity': 'Deckkraft',
		'appearance.scrambleImage': 'Scramble-Bild',
		'appearance.baseStyle': 'Basisstil',
		'appearance.base.black': 'Schwarz (Normal)',
		'appearance.base.white': 'Weiss (Invertiert)',
		'appearance.base.stickerless': 'Stickerless',
		'appearance.faceColors': 'Seitenfarben',
		'appearance.clockColors': 'Clock-Farben',
		'appearance.personalBests': 'Persönliche Bestzeiten',
		'pb.visuals': 'PB Darstellung',
		'pb.fireworks': 'Feuerwerk bei Single PB',
		'list.columns': 'Spalten der Zeitenliste',
		'list.filter.time': 'Zeitfilter (z.B. >10&<12, DNF)',
		'list.filter.tag': 'Tag Filter...',
		'stats.global': 'Globale Statistiken',
		'stats.dist.title': 'Zeitverteilungsgraph',
		'stats.dist.mode': 'Bereich',
		'stats.dist.all': 'Alle Session Solves',
		'stats.dist.last': 'Letzte X Solves',
		'btn.save': 'Speichern',
		'btn.cancel': 'Abbrechen',
		'btn.newSession': 'Neue Session',
		'btn.details': 'Details',
		'btn.delete': 'Löschen',
		'session.manage': 'Sessions verwalten',
		'session.type': 'Typ',
		'session.override': 'Session Einstellungen',
		'session.phases': 'Phasen',
		'session.prepbs': 'Pre-PBs',
		'stat.single': 'Einzelzeit',
		'stat.mean': 'Mittelwert (Mean)',
		'stat.avg': 'Durchschnitt (Avg)',
		'stat.stdDev': 'Std. Abweichung',
		'stat.success': 'Erfolgsrate',
		'stat.weighted': 'Gewichteter Durchschnitt',
		'color.bg': 'Hintergrund',
		'color.text': 'Textfarbe',
		'lang.select': 'Sprache',
		'lang.english': 'Englisch',
		'lang.german': 'Deutsch',
		'lang.esperanto': 'Esperanto',
		'settings.dateFormat': 'Datumsformat',
		'settings.uiBehavior': 'UI & Verhalten',
		'settings.mobileLayout': 'Mobiles Layout',
		'settings.mobileBottomWidgets': 'Widgets unter Timer anzeigen',
		'settings.desktopLayout': 'Desktop-Layout',
		'settings.desktopLayoutDesc': 'Anordnung der UI-Elemente fuer Desktop-Bildschirme konfigurieren.',
		'settings.openLayoutEditor': 'Layout-Editor öffnen',
		'date.fmt.iso': 'ISO (YYYY-MM-DD)',
		'date.fmt.us': 'US (MM/DD/YYYY)',
		'date.fmt.eu': 'EU (DD/MM/YYYY)',
		'input.space': 'Leertaste',
		'input.ctrl': 'Strg + Strg',
		'input.near': 'Nahe Leertaste',
		'input.any': 'Jede Taste',

		'timer.start': 'Drücken zum Starten',
		'timer.inspect': 'Drücken für Inspektion',
		'timer.wait': 'Warten...',
		'timer.phase': 'Phase',
		'timer.inspectionState': 'Inspektion',
		'timer.abortInspection': 'Inspektion abbrechen',
		'timer.stackmatOn': 'Stackmat Verbunden',
		'timer.stackmatOff': 'Signal Verloren',
		'timer.solvingPlaceholder': 'Löse...',

		'stats.modal.title': 'Statistik Dashboard',
		'stats.tab.global': 'Global',
		'stats.tab.session': 'Session',
		'stats.totalSolves': 'Solves Gesamt',
		'stats.totalTime': 'Zeit Gesamt',
		'stats.totalInspection': 'Inspektion Gesamt',
		'stats.avgTime': 'Ø Zeit',
		'stats.heatmap.title': 'Aktivität nach Uhrzeit',
		'stats.heatmap.all': 'Gesamt',
		'stats.heatmap.year': 'Dieses Jahr',
		'stats.heatmap.month': 'Diesen Monat',
		'stats.daily.title': 'Tageszusammenfassung',
		'stats.subx.title': 'Sub-X Zähler',
		'stats.subx.label': 'Grenzwert (Sek)',
		'stats.pb.title': 'PB Verlauf',
		'stats.chart.times': 'Lösungszeiten',
		'stats.chart.inspection': 'Inspektionszeiten',
		'stats.chart.penalty': 'Strafenverteilung',
		'stats.chart.distribution': 'Zeitverteilung',
		'stats.selectSession': 'Session wählen',
		'stats.improvement': 'Verbesserung',
		'stats.noSessions': 'Keine Sessions gefunden',
		'stats.noSolvesMonth': 'Keine Solves diesen Monat',
		'stats.totalSessions': 'Sessions Gesamt',
		'stats.solves': 'Solves',
		'stats.sessionNotFound': 'Session nicht gefunden.',
		'stats.detailed.title': 'Detaillierter Verlauf',
		'stats.detailed.daily': 'Täglich',
		'stats.detailed.weekly': 'Wöchentlich',
		'stats.detailed.monthly': 'Monatlich',
		'stats.detailed.yearly': 'Jährlich',
		'stats.detailed.day': 'Tag',
		'stats.detailed.week': 'Woche',
		'stats.detailed.month': 'Monat',
		'stats.detailed.year': 'Jahr',
		'stats.detailed.best': 'Best',
		'stats.detailed.avg': 'Ø',
		'stats.detailed.count': 'Anzahl',
		'stats.detailed.totalTime': 'Gesamtzeit',
		'stats.detailed.breakdown': 'Session Aufteilung',
		'stats.detailed.allSessions': 'Alle Sessions',
		'stats.detailed.noData': 'Keine Daten fuer diesen Bereich.',
		'stats.freq.title': 'Solves im Zeitverlauf',
		'stats.freq.day': 'Tag',
		'stats.freq.week': 'Woche',
		'stats.freq.month': 'Monat',
		'stats.freq.year': 'Jahr',

		'details.title': 'Solve Details',
		'details.date': 'Datum',
		'details.scramble': 'Scramble',
		'details.time': 'Zeit',
		'details.penalty': 'Strafe',
		'details.phases': 'Phases',
		'details.copy': 'Exportieren',
		'details.comment': 'Kommentar',
		'details.addComment': 'Kommentar hinzufügen...',
		'details.noComment': 'Kein Kommentar.',
		'details.base': 'Basis',
		'details.readOnly': 'Schreibgeschützt',
		'details.locked': 'Gesperrt',
		'details.tags': 'Tags',
		'details.phaseNumber': '#',
		'details.phaseSplit': 'Split',
		'details.phaseTotal': 'Gesamt',

		'data.manage': 'Datenverwaltung',
		'data.export': 'Exportieren',
		'data.import': 'Importieren',
		'data.copied': 'In Zwischenablage kopiert!',
		'data.copied.short': 'Kopiert',
		'import.title': 'Daten Import',
		'import.preview': 'Gefundene Sessions',
		'import.select': 'Aktion',
		'import.asNew': 'Als neu importieren',
		'import.merge': 'Zusammenführen mit:',
		'import.success': 'Import erfolgreich!',
		'import.settings': 'Einstellungen & Konfig',
		'import.format.cmos': 'Format: CMOSTimer',
		'import.format.cs': 'Format: csTimer',
		'import.supportInfo': 'Unterstützt CMOSTimer (.json), csTimer (.txt), NanoTimer (.csv) und Cubic Timer (.txt).',
		'btn.confirmImport': 'Import bestätigen',

		'shortcut.title': 'Tastenkürzel',
		'shortcut.instruction': 'Klicken Sie auf ein Feld und drücken Sie die gewünschte Tastenkombination.',
		'shortcut.none': 'Keine',
		'shortcut.clear': 'Löschen',
		'shortcut.NEXT_SCRAMBLE': 'Nächster Scramble',
		'shortcut.PREV_SCRAMBLE': 'Vorheriger Scramble',
		'shortcut.PENALTY_PLUS_TWO': 'Toggle +2',
		'shortcut.PENALTY_DNF': 'Toggle DNF',
		'shortcut.DELETE_LAST': 'Lösche Letzten/Auswahl',
		'shortcut.SELECT_FIRST': 'Wähle Ersten',
		'shortcut.OPEN_DETAILS': 'Öffne Details',
		'shortcut.ESCAPE': 'Escape (Abbruch/DNF/Modal schliessen)',
		'shortcut.MOVE_SELECTION_UP': 'Auswahl hoch',
		'shortcut.MOVE_SELECTION_DOWN': 'Auswahl runter',
		'shortcut.EXTEND_SELECTION_UP': 'Auswahl erw. hoch',
		'shortcut.EXTEND_SELECTION_DOWN': 'Auswahl erw. runter',
		'shortcut.OPEN_SESSION_MANAGER': 'Session Manager öffnen',
		'shortcut.MANUAL_ENTRY': 'Manuelle Zeiteingabe',
		'shortcut.PREV_PUZZLE': 'Vorheriges Puzzle (Relay)',
		'shortcut.NEXT_PUZZLE': 'Nächstes Puzzle (Relay)',
		'shortcut.OPEN_COMMAND_PALETTE': 'Befehlszeile öffnen',
		'shortcut.conflict': 'Warnung: Diese Taste ist bereits belegt oder eine Systemtaste.',

		'profile.title': 'Cloud Synchronization',
		'profile.login': 'Einloggen',
		'profile.register': 'Registrieren',
		'profile.logout': 'Ausloggen',
		'profile.username': 'Benutzername',
		'profile.email': '-Mail',
		'profile.password': 'Passwort',
		'profile.syncing': 'Synchronisieren...',
		'profile.synced': 'Synchronisiert',
		'profile.unsaved': 'Ungespeicherte Änderungen',
		'profile.error': 'Fehler',
		'profile.conflict': 'Überschreiben Warnung',
		'profile.conflictDesc': 'Sie haben lokale Solves, die nicht auf ein Konto gespeichert wurden. Einloggen wird Ihre lokalen Daten mit den Daten vom Server überschreiben. Um diese Solves zu behalten, registrieren Sie sich stattdessen.',
		'profile.validation.username': 'Benutzername muss 5-64 Zeichen lang sein.',
		'profile.validation.password': 'Passwort muss 8-1000 Zeichen lang sein.',
		'profile.validation.email': 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
		'profile.lastSync': 'Zuletzt:',
		'btn.continue': 'Ich verstehe, Überschreiben',

		'settings.pbsheet': 'PB Sheet',
		'pbsheet.enabled': 'Externes PB Sheet aktivieren',
		'pbsheet.title': 'Sheet Titel',
		'pbsheet.sessions': 'Angezeigte Sessions',
		'pbsheet.stats': 'Angezeigte Statistiken',
		'pbsheet.options': 'Anzeigeoptionen',
		'pbsheet.showDate': 'PB Datum anzeigen',
		'pbsheet.showCount': 'Gesamtzahl Solves anzeigen',
		'pbsheet.addSession': 'Session hinzufügen',
		'pbsheet.addStat': 'Statistik hinzufügen',
		'pbsheet.noMatch': 'Keine passenden Sessions',

		'tag.title': 'Solve Tags',
		'tag.new': 'Neuer Tag...',
		'tag.noneConfig': 'Keine Tags konfiguriert.',
		'tag.presets': 'Presets hinzufügen',
		'tag.noneSet': 'Keine Tags gesetzt.',
		'tag.configure': 'Konfigurieren',

		'plugin.new': 'Neues Plugin',
		'plugin.namePlaceholder': 'Plugin-Name',
		'plugin.api': 'Verfügbare API:',
		'plugin.warning': 'Warnung: Plugins können beliebigen Code ausführen. Fügen Sie nur Skripte aus vertrauenswürdigen Quellen hinzu.',
		'plugin.edit': 'Bearbeiten',
		'plugin.empty': 'Keine Plugins installiert.',
		'plugin.add': 'Neues Plugin hinzufügen',
		'plugin.deleteConfirm': 'Dieses Plugin löschen?',

		'layout.title': 'Layouteditor',
		'layout.preset': 'Layoutvorlage',
		'layout.widgets': 'Verfügbare Widgets',
		'layout.info': 'Feste Widgets können in dieser Vorlage nicht verschoben werden.',
		'layout.emptySlot': 'Leerer Slot',
		'layout.remove': 'Entfernen',
		'layout.mirror': 'Layout spiegeln',
		'layout.mirrorDesc': 'Alle Desktop-Bereiche horizontal spiegeln (Zeitenliste links).',
		'layout.save': 'Layout speichern',

		'list.empty': 'Keine Solves entsprechen dem Filter',
		'list.move': 'Verschieben',
		'list.duplicate': 'Duplizieren...',
		'list.deleteEverywhere': 'Überall löschen',
		'list.deleteEverywhereConfirm': 'Sind Sie sicher? Daten werden aus ALLEN Sessions gelöscht!',

		'move.titleMove': 'Solves verschieben',
		'move.titleDup': 'Solves duplizieren',
		'move.noSessions': 'Keine Sessions verfügbar.',
		'move.labelMove': 'Verschiebe',
		'move.labelDup': 'Kopiere',
		'move.actionMove': 'Verschieben',
		'move.actionDup': 'Duplizieren',

		'session.search': 'Sessions suchen...',
		'session.new': 'Neue Session',
		'session.create': 'Erstellen',
		'session.cancel': 'Abbrechen',
		'session.namePlaceholder': 'Session Name...',
		'session.addTag': 'Tag hinzufügen...',
		'session.notFound': 'Keine Sessions gefunden.',

		'session.locked': 'Session gesperrt',
		'session.lockedDesc': 'Verhindert Änderung von Solves',
		'session.timerBehavior': 'Timer Verhalten',
		'session.advanced': 'Erweitert',
		'session.virtualCube': 'Virtueller Cube',
		'session.enabled': 'Aktiviert',
		'session.disabled': 'Deaktiviert',
		'session.global': 'Global',
		'session.linked': 'Verknüpfte Sessions',
		'session.linkedDesc': 'Solves aus verknüpften Sessions erscheinen automatisch hier.',
		'session.searchLink': 'Sessions suchen...',
		'session.results': 'Ergebnisse',
		'session.selectAll': 'Alle auswählen',
		'session.clear': 'Leeren',
		'session.linkBtn': 'Verknüpfen',
		'session.layoutOverride': 'Layout überschreiben',
		'session.resetGlobal': 'Zurücksetzen',
		'session.editLayout': 'Layout bearbeiten',
		'session.overrideLayout': 'Layout überschreiben',

		'scrambler.title': 'Scrambler auswählen / Relay bauen',
		'scrambler.custom.info': 'Eigene Scramble-Logik definieren.',
		'scrambler.add': 'Zum Relay hinzufügen',
		'scrambler.moves': 'Erlaubte Züge (Leerzeichen getrennt)',
		'scrambler.opposites': 'Gegengruppen (z.B. "U-D R-L")',
		'scrambler.length': 'Scramble Länge',
		'scrambler.selected': 'Ausgewählte Scrambler',
		'scrambler.sequence': 'Reihenfolge für Session (Relay)',
		'scrambler.empty': 'Liste ist leer. Wähle ein Puzzle.',
		'scrambler.confirm': 'Bestätigen',

		'about.title': 'Über CMOSTimer v3',
		'about.p1': 'Willkommen beim CMOSTimer v3, einem modernen, funktionsreichen Speedcubing-Timer für Enthusiasten und Profis.',
		'about.p2': 'Entwickelt für Leistung und Ästhetik, bietet er erweiterte Statistiken, Session-Management und Echtzeit-Visualisierung Ihres Fortschritts.',
		'about.features': 'Hauptfunktionen',
		'about.feat1': 'Präzises Timing mit Inspektions-Support',
		'about.feat2': 'Multi-Phasen Solve-Tracking',
		'about.feat3': 'Umfassende statistische Analyse',
		'about.feat4': 'Anpassbare Themes und Layouts',
		'about.feat5': 'Scramble-Visualisierung für alle WCA-Events',
		'about.footer': 'Entwickelt mit React & TypeScript',
		'rewind.pbsSurpassed': 'Persönliche Bestzeiten übertroffen',
		'activity.title': 'Aktivität',
		'activity.mode.session': 'Session',
		'activity.mode.lastHour': 'Letzte Stunde',
		'activity.mode.last24h': 'Letzte 24h',
		'activity.mode.last7d': 'Letzte 7 Tage',
		'activity.mode.last30d': 'Letzte 30 Tage',
		'activity.mode.lastYear': 'Letztes Jahr',
		'activity.mode.since': 'Seit...',
		'activity.mode.lastX': 'Letzte X...',
		'activity.noData': 'Keine Aktivität',
		'goals.title': 'Ziele',
		'goals.hideCompleted': 'Erledigte ausblenden',
		'goals.showCompleted': 'Erledigte anzeigen',
		'goals.none': 'Keine Ziele gesetzt.',
		'goals.allCompleted': 'Alle Ziele erreicht!',
		'goals.createOne': 'Eines erstellen',
		'goals.newGoal': 'Neues Ziel',
		'goals.editGoal': 'Ziel bearbeiten',
		'goals.type': 'Typ',
		'goals.type.solveCount': 'Anzahl Solves',
		'goals.type.timeSpent': 'Zeit mit Cuben',
		'goals.type.statTarget': 'Statistikziel (z.B. Sub-X)',
		'goals.type.statTargetShort': 'Sub-',
		'goals.frequency': 'Zeitraum',
		'goals.frequency.daily': 'Täglich',
		'goals.frequency.weekly': 'Wöchentlich',
		'goals.frequency.monthly': 'Monatlich',
		'goals.frequency.yearly': 'Jährlich',
		'goals.frequency.byDate': 'Bis Datum',
		'goals.frequency.infinite': 'Gesamt',
		'goals.scope': 'Bereich',
		'goals.scope.global': 'Global',
		'goals.scope.session': 'Session',
		'goals.selectSession': 'Session wählen',
		'goals.targetCount': 'Zielanzahl',
		'goals.targetDuration': 'Zieldauer (Minuten)',
		'goals.targetTimeSec': 'Zielzeit (Sekunden)',
		'goals.deadline': 'Frist',
		'goals.filter.enable': 'Nur Solves unter einer Zeitgrenze zählen',
		'goals.filter.belowSec': 'Nur Solves unter (Sekunden)',
		'goals.filter.below': 'Unter',
		'timeDist.noData': 'Keine Daten',
		'timeDist.switchInspection': 'Zu Inspektionsverteilung wechseln',
		'timeDist.switchSolve': 'Zu Solve-Verteilung wechseln',
		'timeDist.solve': 'Solve',
		'timeDist.inspection': 'Inspektion',
		'timeDist.count': 'Anzahl',
		'metronome.tempo': 'Tempo',
		'metronome.volume': 'Lautstärke',
		'scrambleImage.copyTitle': 'Klicken, um Scramble-Bild zu kopieren',
		'scrambleImage.copied': 'Kopiert',
		'scrambleImage.copyFailed': 'Kopieren fehlgeschlagen',
		'command.placeholder': '> Befehl eingeben (lang, c, tag, rewind, settings)...',
		'command.help.language': 'Sprache setzen:',
		'command.help.comment': 'Kommentar setzen:',
		'command.help.tags': 'Tags setzen:',
		'command.help.rewind': 'Jahresrückblick anzeigen',
		'command.help.settings': 'Einstellungen öffnen',
		'command.help.unknown': 'Unbekannter Befehl',
		'common.none': 'Keine',
		'common.processing': 'Verarbeite...',
		'common.unknown': 'Unbekannt',
	}
};

export const isKnownLanguage = (code: string): boolean =>
	builtinLanguages.some(lang => lang.code === code) || getRegisteredPluginLanguages().has(code);

export const getAvailableLanguages = (uiLanguage: Language = Language.EN): { code: string; label: string }[] => {
	const pluginEntries = Array.from(getRegisteredPluginLanguages().values())
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(lang => ({
			code: lang.code,
			label: lang.localizedNames?.[uiLanguage] || lang.localizedNames?.[lang.code] || lang.name || lang.code
		}));

	return [
		...builtinLanguages.map(lang => ({
			code: lang.code,
			label: lang.localizedNames?.[uiLanguage] || lang.name
		})),
		...pluginEntries
	];
};

export const registerPluginLanguage = (
	ownerId: string,
	definition: { code: string; name: string; localizedNames?: Record<string, string>; translations?: Record<string, string> }
): void => {
	const ownedLanguages = pluginLanguagesByOwner.get(ownerId) || new Map<string, RegisteredLanguage>();
	ownedLanguages.set(definition.code, {
		code: definition.code,
		name: definition.name,
		localizedNames: definition.localizedNames
	});
	pluginLanguagesByOwner.set(ownerId, ownedLanguages);

	if (definition.translations) registerPluginTranslations(ownerId, definition.code, definition.translations);
};

export const registerPluginTranslations = (ownerId: string, languageCode: string, translations: Record<string, string>): void => {
	const ownedTranslations = pluginTranslationsByOwner.get(ownerId) || new Map<string, TranslationRecord>();
	const current = ownedTranslations.get(languageCode) || {};
	ownedTranslations.set(languageCode, { ...current, ...translations });
	pluginTranslationsByOwner.set(ownerId, ownedTranslations);
};

export const unregisterPluginLocalizations = (ownerId: string): void => {
	pluginLanguagesByOwner.delete(ownerId);
	pluginTranslationsByOwner.delete(ownerId);
};

export const t = (key: string, lang: Language = Language.EN): string => {
	const pluginDict = getPluginTranslationsForLanguage(lang);
	if (pluginDict?.[key]) return pluginDict[key];

	const dict = dictionary[lang] || dictionary[Language.EN];
	return dict[key] || dictionary[Language.EN][key] || key;
};
