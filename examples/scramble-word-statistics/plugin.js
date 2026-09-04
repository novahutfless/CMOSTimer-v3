// CMOSTimer Plugin API 2.3.0
// Counts exact, case-sensitive words in whitespace-free scramble sequences.

const WORDS_STORAGE_KEY = 'words';
const SESSION_STORAGE_KEY = 'sessionId';
const WIDGET_ID = 'scramble-word-statistics';
const DEFAULT_WORDS = ['BLUB', 'UwU', 'FUR'];

const normalizeWords = (value) => {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(values
    .filter((word) => typeof word === 'string')
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word.slice(0, 500))
    .slice(0, 20))];
};

const countOverlapping = (text, word) => {
  let count = 0;
  for (let index = 0; index <= text.length - word.length; index += 1) {
    if (text.slice(index, index + word.length) === word) count += 1;
  }
  return count;
};

const savedWords = await cmos.storage.get(WORDS_STORAGE_KEY, DEFAULT_WORDS);
let words = normalizeWords(savedWords);
if (words.length === 0) words = [...DEFAULT_WORDS];

const savedSessionId = await cmos.storage.get(SESSION_STORAGE_KEY, null);
let selectedSessionId = typeof savedSessionId === 'string' ? savedSessionId : null;
let busy = false;

const getScrambleText = (solve) => {
  if (!Array.isArray(solve?.scramble)) return '';
  return solve.scramble.flat().join('').replace(/\s+/g, '');
};

const getStats = (solves) => {
  const totalSolves = solves.length;
  const scrambleTexts = solves.map(getScrambleText);
  return words.map((word) => {
    const matchingSolves = scrambleTexts.filter((text) => text.includes(word)).length;
    const percentage = totalSolves === 0 ? 0 : (matchingSolves / totalSolves) * 100;
    return {
      word,
      occurrences: scrambleTexts.reduce((total, text) => total + countOverlapping(text, word), 0),
      matchingSolves,
      percentage
    };
  });
};

const render = async () => {
  const state = await cmos.getState();
  const pinnedSession = selectedSessionId
    ? state.sessions.find((session) => session.id === selectedSessionId)
    : undefined;
  const session = pinnedSession || state.sessions.find((item) => item.id === state.currentSessionId);
  const activePinned = Boolean(pinnedSession);
  const solves = session
    ? session.solveIds.map((id) => state.solves[id]).filter(Boolean)
    : [];
  const stats = getStats(solves);

  const statNodes = stats.flatMap((stat) => [
    { type: 'text', text: `${stat.word}: ${stat.occurrences} occurrences | ${stat.matchingSolves}/${solves.length} solves (${stat.percentage.toFixed(1)}%)`, tone: stat.matchingSolves > 0 ? 'accent' : 'muted' },
    { type: 'progress', value: stat.percentage, max: 100, label: stat.word, tone: stat.matchingSolves > 0 ? 'accent' : 'muted' }
  ]);

  return {
    type: 'container',
    direction: 'column',
    align: 'stretch',
    gap: 'small',
    children: [
      { type: 'text', text: `Session: ${session?.name || 'No session available'}`, size: 'large', tone: 'accent' },
      { type: 'text', text: `Solves: ${solves.length}`, tone: 'muted' },
      ...statNodes,
      { type: 'text', text: 'Words (comma-separated)', tone: 'muted' },
      { type: 'input', value: words.join(', '), placeholder: 'BLUB, UwU, FUR', action: 'words-changed', disabled: busy },
      { type: 'text', text: 'Session', tone: 'muted' },
      {
        type: 'select',
        value: activePinned ? selectedSessionId : '',
        action: 'session-changed',
        disabled: busy,
        options: [
          { value: '', label: 'Current session' },
          ...state.sessions.map((item) => ({ value: item.id, label: item.name }))
        ]
      }
    ]
  };
};

cmos.registerWidget(WIDGET_ID, 'Scramble Word Statistics', render, async (action, payload) => {
  if (action === 'words-changed') {
    const nextWords = normalizeWords(payload);
    if (nextWords.length === 0) {
      await cmos.toast('Enter at least one word.');
      return;
    }
    words = nextWords;
    await cmos.storage.set(WORDS_STORAGE_KEY, words);
    await cmos.refreshWidget(WIDGET_ID);
    return;
  }

  if (action === 'session-changed') {
    const sessionId = typeof payload === 'string' ? payload : '';
    if (!sessionId) {
      selectedSessionId = null;
      await cmos.storage.remove(SESSION_STORAGE_KEY);
    } else {
      const state = await cmos.getState();
      if (!state.sessions.some((session) => session.id === sessionId)) return;
      selectedSessionId = sessionId;
      await cmos.storage.set(SESSION_STORAGE_KEY, sessionId);
    }
    await cmos.refreshWidget(WIDGET_ID);
  }
});

const refresh = () => {
  if (!busy) void cmos.refreshWidget(WIDGET_ID);
};
cmos.on('sessionChanged', refresh);
cmos.on('sessionUpdated', refresh);
cmos.on('sessionDeleted', refresh);
cmos.on('solveAdded', refresh);
cmos.on('solveUpdated', refresh);
cmos.on('solveDeleted', refresh);
cmos.on('sessionsChanged', refresh);
cmos.on('solvesChanged', refresh);
