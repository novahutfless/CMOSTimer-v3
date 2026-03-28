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
  | 'settings.dateFormat'
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
  | 'timer.stackmatOn'
  | 'timer.stackmatOff'
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
  | 'common.unknown';

const dictionary: Record<Language, Record<TranslationKey, string>> = {
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
		'settings.dateFormat': 'Date Format',
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
		'timer.stackmatOn': 'Stackmat Connected',
		'timer.stackmatOff': 'Signal Lost',

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
		'common.unknown': 'Unknown',
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
		'settings.dateFormat': 'Datumsformat',
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
		'timer.stackmatOn': 'Stackmat Verbunden',
		'timer.stackmatOff': 'Signal Verloren',

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
		'common.unknown': 'Unbekannt',
	}
};

export const t = (key: string, lang: Language = Language.EN): string => {
	const dict = dictionary[lang] || dictionary[Language.EN];
	return dict[key] || dictionary[Language.EN][key] || key;
};
