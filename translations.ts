
import { Language } from './types';

type TranslationKey = 
  | 'settings.title'
  | 'general'
  | 'timer'
  | 'appearance'
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
  | 'input.space'
  | 'input.ctrl'
  | 'input.near'
  | 'input.any'
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
  // Details Modal
  | 'details.title'
  | 'details.date'
  | 'details.scramble'
  | 'details.time'
  | 'details.penalty'
  | 'details.phases'
  | 'details.copy'
  // Data Management
  | 'data.manage'
  | 'data.export'
  | 'data.import'
  | 'data.copied'
  | 'import.title'
  | 'import.preview'
  | 'import.select'
  | 'import.asNew'
  | 'import.merge'
  | 'import.success'
  | 'import.settings'
  | 'import.format.cmos'
  | 'import.format.cs'
  | 'btn.confirmImport'
  // Shortcuts
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
  | 'btn.continue';

const dictionary: Record<Language, Record<string, string>> = {
  [Language.EN]: {
    'settings.title': 'Settings',
    'general': 'General',
    'timer': 'Timer',
    'appearance': 'Appearance',
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
    'input.space': 'Spacebar',
    'input.ctrl': 'Ctrl + Ctrl',
    'input.near': 'Near Space',
    'input.any': 'Any Key',
    
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

    'details.title': 'Solve Details',
    'details.date': 'Date',
    'details.scramble': 'Scramble',
    'details.time': 'Time',
    'details.penalty': 'Penalty',
    'details.phases': 'Phases',
    'details.copy': 'Copy Export',

    'data.manage': 'Data Management',
    'data.export': 'Export to File',
    'data.import': 'Import from File',
    'data.copied': 'Copied to clipboard!',
    'import.title': 'Import Data',
    'import.preview': 'Sessions Found',
    'import.select': 'Action',
    'import.asNew': 'Import as New',
    'import.merge': 'Merge into:',
    'import.success': 'Import Successful!',
    'import.settings': 'Settings & Config',
    'import.format.cmos': 'Format: CMOSTimer',
    'import.format.cs': 'Format: csTimer',
    'btn.confirmImport': 'Confirm Import',

    'shortcut.NEXT_SCRAMBLE': 'Next Scramble',
    'shortcut.PREV_SCRAMBLE': 'Previous Scramble',
    'shortcut.PENALTY_PLUS_TWO': 'Toggle +2',
    'shortcut.PENALTY_DNF': 'Toggle DNF',
    'shortcut.DELETE_LAST': 'Delete Selected/Last',
    'shortcut.SELECT_FIRST': 'Select First',
    'shortcut.OPEN_DETAILS': 'Open Details',
    'shortcut.ESCAPE': 'Escape (Abort/DNF)',
    'shortcut.MOVE_SELECTION_UP': 'Move Selection Up',
    'shortcut.MOVE_SELECTION_DOWN': 'Move Selection Down',
    'shortcut.EXTEND_SELECTION_UP': 'Extend Selection Up',
    'shortcut.EXTEND_SELECTION_DOWN': 'Extend Selection Down',
    'shortcut.OPEN_SESSION_MANAGER': 'Open Session Manager',
    'shortcut.MANUAL_ENTRY': 'Manual Time Entry',
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
    'btn.continue': 'I understand, Overwrite'
  },
  [Language.DE]: {
    'settings.title': 'Einstellungen',
    'general': 'Allgemein',
    'timer': 'Timer',
    'appearance': 'Aussehen',
    'lists': 'Lists',
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
    'stat.weighted': 'Gewichteter D.',
    'color.bg': 'Hintergrund',
    'color.text': 'Textfarbe',
    'lang.select': 'Sprache',
    'input.space': 'Leertaste',
    'input.ctrl': 'Strg + Strg',
    'input.near': 'Nahe Leertaste',
    'input.any': 'Jede Taste',

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

    'details.title': 'Solve Details',
    'details.date': 'Datum',
    'details.scramble': 'Scramble',
    'details.time': 'Zeit',
    'details.penalty': 'Strafe',
    'details.phases': 'Phases',
    'details.copy': 'Exportieren',

    'data.manage': 'Datenverwaltung',
    'data.export': 'Exportieren',
    'data.import': 'Importieren',
    'data.copied': 'In Zwischenablage kopiert!',
    'import.title': 'Daten Import',
    'import.preview': 'Gefundene Sessions',
    'import.select': 'Aktion',
    'import.asNew': 'Als neu importieren',
    'import.merge': 'Zusammenführen mit:',
    'import.success': 'Import erfolgreich!',
    'import.settings': 'Einstellungen & Konfig',
    'import.format.cmos': 'Format: CMOSTimer',
    'import.format.cs': 'Format: csTimer',
    'btn.confirmImport': 'Import Bestätigen',

    'shortcut.NEXT_SCRAMBLE': 'Nächster Scramble',
    'shortcut.PREV_SCRAMBLE': 'Vorheriger Scramble',
    'shortcut.PENALTY_PLUS_TWO': '+2 Umschalten',
    'shortcut.PENALTY_DNF': 'DNF Umschalten',
    'shortcut.DELETE_LAST': 'Auswahl/Letzten Löschen',
    'shortcut.SELECT_FIRST': 'Ersten Auswählen',
    'shortcut.OPEN_DETAILS': 'Details Öffnen',
    'shortcut.ESCAPE': 'Abbruch (ESC)',
    'shortcut.MOVE_SELECTION_UP': 'Auswahl Hoch',
    'shortcut.MOVE_SELECTION_DOWN': 'Auswahl Runter',
    'shortcut.EXTEND_SELECTION_UP': 'Auswahl Erweitern Hoch',
    'shortcut.EXTEND_SELECTION_DOWN': 'Auswahl Erweitern Runter',
    'shortcut.OPEN_SESSION_MANAGER': 'Session Manager Öffnen',
    'shortcut.MANUAL_ENTRY': 'Manuelle Zeiteingabe',
    'shortcut.conflict': 'Warnung: Taste bereits belegt.',

    'profile.title': 'Cloud Synchronisation',
    'profile.login': 'Einloggen',
    'profile.register': 'Registrieren',
    'profile.logout': 'Ausloggen',
    'profile.username': 'Benutzername',
    'profile.email': 'Email',
    'profile.password': 'Passwort',
    'profile.syncing': 'Synch...',
    'profile.synced': 'Synchronisiert',
    'profile.unsaved': 'Ungesicherte Änderungen',
    'profile.error': 'Fehler',
    'profile.conflict': 'Überschreibungs-Warnung',
    'profile.conflictDesc': 'Lokale Daten gefunden. Ein Login ÜBERSCHREIBT diese mit Serverdaten. Zum Behalten bitte Registrieren wählen.',
    'profile.validation.username': 'Benutzername muss 5-64 Zeichen lang sein.',
    'profile.validation.password': 'Passwort muss 8-1000 Zeichen lang sein.',
    'profile.validation.email': 'Bitte eine gültige Email eingeben.',
    'btn.continue': 'Verstanden, Überschreiben'
  }
};

export const t = (key: string, lang: Language): string => {
  return dictionary[lang]?.[key] || key;
};