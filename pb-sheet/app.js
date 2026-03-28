const form = document.getElementById('lookup-form');
const usernameInput = document.getElementById('username');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const sheetTitleEl = document.getElementById('sheet-title');
const sheetUserEl = document.getElementById('sheet-user');
const sessionListEl = document.getElementById('session-list');

const STAT_LABELS = {
  SINGLE: 'Single',
  MEAN: 'Mean',
  AVERAGE: 'Average',
  SUCCESS_RATE: 'Success Rate',
  STD_DEV: 'Std Dev',
  WEIGHTED_AVG: 'Weighted Avg',
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) {
    return 'No PB';
  }

  const totalMs = Math.round(ms);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;

  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  return `${seconds}.${String(millis).padStart(3, '0')}`;
}

function formatDate(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) {
    return 'n/a';
  }

  return new Date(ts).toLocaleString();
}

function formatStatValue(stat) {
  if (stat.type === 'SUCCESS_RATE') {
    if (typeof stat.value !== 'number' || !Number.isFinite(stat.value)) {
      return 'No PB';
    }
    return `${(stat.value * 100).toFixed(2)}%`;
  }

  return formatDuration(stat.value);
}

function renderResults(data) {
  sheetTitleEl.textContent = data.title;
  sheetUserEl.textContent = `User: ${data.username}`;
  sessionListEl.innerHTML = '';

  if (!Array.isArray(data.sessions) || data.sessions.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No public PB sessions configured.';
    sessionListEl.appendChild(empty);
    resultsEl.hidden = false;
    return;
  }

  data.sessions.forEach((session) => {
    const card = document.createElement('article');
    card.className = 'session';

    const title = document.createElement('h3');
    title.textContent = session.name || 'Unnamed Session';
    card.appendChild(title);

    (session.stats || []).forEach((stat) => {
      const block = document.createElement('div');
      block.className = 'stat';

      const titleEl = document.createElement('div');
      titleEl.className = 'stat-title';
      const baseLabel = STAT_LABELS[stat.type] || stat.type;
      titleEl.textContent = stat.type === 'SINGLE' ? baseLabel : `${baseLabel} ${stat.size}`;
      block.appendChild(titleEl);

      const valueEl = document.createElement('div');
      valueEl.className = 'stat-value';
      valueEl.textContent = formatStatValue(stat);
      block.appendChild(valueEl);

      if (data.showDate && Object.prototype.hasOwnProperty.call(stat, 'timestamp')) {
        const dateEl = document.createElement('div');
        dateEl.className = 'stat-meta';
        dateEl.textContent = `Date: ${formatDate(stat.timestamp)}`;
        block.appendChild(dateEl);
      }

      if (data.showSolveCount && Object.prototype.hasOwnProperty.call(stat, 'solveCount')) {
        const countEl = document.createElement('div');
        countEl.className = 'stat-meta';
        countEl.textContent = `Solves: ${stat.solveCount}`;
        block.appendChild(countEl);
      }

      card.appendChild(block);
    });

    sessionListEl.appendChild(card);
  });

  resultsEl.hidden = false;
}

async function lookup(username) {
  const response = await fetch('api.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'User not found');
  }

  return payload.data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();

  resultsEl.hidden = true;
  sessionListEl.innerHTML = '';

  if (!username) {
    setStatus('Please enter a username.', true);
    return;
  }

  setStatus('Loading...');

  try {
    const data = await lookup(username);
    renderResults(data);
    setStatus('');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'User not found', true);
  }
});
