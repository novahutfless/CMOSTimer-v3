
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
  | 'stats.global'
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
  | 'shortcut.conflict';

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
    'stats.global': 'Global Statistics',
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
    'shortcut.conflict': 'Warning: This key is already bound to another action or is a system key.'
  },
  [Language.DE]: {
    'settings.title': 'Einstellungen',
    'general': 'Allgemein',
    'timer': 'Timer',
    'appearance': 'Aussehen',
    'lists': 'Listen',
    'stats': 'Statistiken',
    'shortcuts': 'Tastenkürzel',
    'ui.hideWhileTiming': 'UI während Timer ausblenden',
    'ui.hideText': 'Versteckter Text',
    'ui.pagination': 'Zeitenliste Pagination',
    'ui.pageSize': 'Seitengröße',
    'timer.inspection': 'Inspektion nutzen',
    'timer.direction': 'Richtung',
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
    'stats.global': 'Globale Statistiken',
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
    'shortcut.conflict': 'Warnung: Taste bereits belegt.'
  }
};

export const t = (key: string, lang: Language): string => {
  return dictionary[lang]?.[key] || key;
};
