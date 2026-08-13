const form = document.getElementById('lookup-form');
const usernameInput = document.getElementById('username');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const sheetTitleEl = document.getElementById('sheet-title');
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
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms >= 999999999) {
    return '-';
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
    return '';
  }
  const milliseconds = ts < 100000000000 ? ts * 1000 : ts;
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function formatStatValue(stat) {
  if (stat.type === 'SUCCESS_RATE') {
    if (typeof stat.value !== 'number' || !Number.isFinite(stat.value)) {
      return '-';
    }
    return `${(stat.value * 100).toFixed(2)}%`;
  }

  return formatDuration(stat.value);
}

function renderResults(data) {
  sheetTitleEl.textContent = data.title || `PBs von ${data.username}`;
  sessionListEl.innerHTML = '';

  if (!Array.isArray(data.sessions) || data.sessions.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No public PB sessions configured.';
    sessionListEl.appendChild(empty);
    resultsEl.hidden = false;
    return;
  }

  const table = document.createElement('table');
  const thead = table.createTHead();
  const heading = thead.insertRow();
  const firstStats = data.sessions[0].stats || [];
  const labels = firstStats.map((stat) => {
    if (stat.type === 'SINGLE') return 'single';
    if (stat.type === 'MEAN') return `mo${stat.size}`;
    if (stat.type === 'AVERAGE') return `ao${stat.size}`;
    return `${STAT_LABELS[stat.type] || stat.type} ${stat.size}`;
  });
  ['Event', ...labels, ...(data.showSolveCount ? ['#Solves'] : [])].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    heading.appendChild(th);
  });

  const tbody = table.createTBody();
  data.sessions.forEach((session) => {
    const row = tbody.insertRow();
    const event = document.createElement('th');
    event.scope = 'row';
    event.textContent = session.name || 'Unnamed Session';
    row.appendChild(event);

    (session.stats || []).forEach((stat) => {
      const cell = row.insertCell();
      cell.append(document.createTextNode(formatStatValue(stat)));
      if (data.showDate && stat.timestamp) {
        const date = document.createElement('small');
        date.textContent = formatDate(stat.timestamp);
        cell.append(document.createElement('br'), date);
      }
    });

    if (data.showSolveCount) {
      const count = session.stats?.[0]?.solveCount;
      row.insertCell().textContent = Number.isFinite(count) ? String(count) : '0';
    }
  });
  sessionListEl.appendChild(table);

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
    throw new Error(response.status === 404 ? 'Profile not found' : (payload.error || 'Request failed'));
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Profile not found');
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
    setStatus(error instanceof Error ? error.message : 'Profile not found', true);
  }
});

const requestedUsername = new URLSearchParams(window.location.search).get('uname');
if (requestedUsername) {
  usernameInput.value = requestedUsername;
  form.requestSubmit();
}
