// CMOSTimer Plugin API 2.3.0
// Configure a comma-separated list, then create or delete sessions by name.

const STORAGE_KEY = 'sessionNames';
const WIDGET_ID = 'bulk-session-manager';

const parseSessionNames = (value) => {
  if (typeof value !== 'string') return [];
  return [...new Set(value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean))];
};

const savedNames = await cmos.storage.get(STORAGE_KEY, '');
let configuredNames = typeof savedNames === 'string' ? savedNames : '';
let busy = false;

const getNames = () => parseSessionNames(configuredNames);

const render = () => {
  const names = getNames();
  return {
    type: 'container',
    direction: 'column',
    align: 'stretch',
    gap: 'medium',
    children: [
      { type: 'text', text: 'Session names (comma-separated)', tone: 'muted' },
      { type: 'input', value: configuredNames, placeholder: 'Morning, Evening, OH', action: 'names-changed', disabled: busy },
      { type: 'text', text: names.length > 0 ? `${names.length} distinct name(s) configured.` : 'No session names configured.', tone: names.length > 0 ? 'accent' : 'muted' },
      {
        type: 'container',
        direction: 'row',
        gap: 'small',
        children: [
          { type: 'button', text: 'Create sessions', action: 'create', tone: 'success', disabled: busy || names.length === 0 },
          { type: 'button', text: 'Delete matching', action: 'delete', tone: 'danger', disabled: busy || names.length === 0 }
        ]
      }
    ]
  };
};

const withBusyState = async (operation) => {
  if (busy) return;
  busy = true;
  await cmos.refreshWidget(WIDGET_ID);
  try {
    await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await cmos.toast(`Bulk session operation failed: ${message.slice(0, 1800)}`);
  } finally {
    busy = false;
    await cmos.refreshWidget(WIDGET_ID);
  }
};

cmos.registerWidget(WIDGET_ID, 'Bulk Session Manager', render, async (action, payload) => {
  if (action === 'names-changed') {
    const names = parseSessionNames(payload);
    configuredNames = names.join(', ');
    await cmos.storage.set(STORAGE_KEY, configuredNames);
    await cmos.refreshWidget(WIDGET_ID);
    return;
  }

  if (action === 'create') {
    await withBusyState(async () => {
      const names = getNames();
      if (names.length === 0) return;

      const state = await cmos.getState();
      const currentSession = state.sessions.find((session) => session.id === state.currentSessionId);
      const scramblerId = currentSession?.scramblerId?.length ? currentSession.scramblerId : ['333'];
      const customScramblerConfig = currentSession?.customScramblerConfig;
      const inputs = names.map((name) => ({
        name,
        scramblerId,
        ...(customScramblerConfig === undefined ? {} : { customScramblerConfig })
      }));

      await cmos.createSessions(inputs, { selection: 'none' });
      await cmos.toast(`Created ${names.length} session(s).`);
    });
    return;
  }

  if (action === 'delete') {
    await withBusyState(async () => {
      const names = getNames();
      if (names.length === 0) return;

      const state = await cmos.getState();
      const matchingSessions = state.sessions.filter((session) => names.includes(session.name));
      const deletableCount = Math.min(matchingSessions.length, Math.max(0, state.sessions.length - 1));
      await cmos.deleteSessions(matchingSessions.slice(0, deletableCount).map((session) => session.id));

      if (matchingSessions.length === 0) {
        await cmos.toast('No sessions matched those names.');
      } else if (deletableCount < matchingSessions.length) {
        await cmos.toast(`Deleted ${deletableCount} session(s); one session must remain.`);
      } else {
        await cmos.toast(`Deleted ${deletableCount} session(s).`);
      }
    });
  }
});
