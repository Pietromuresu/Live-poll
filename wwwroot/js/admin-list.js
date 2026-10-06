const list = document.getElementById('admin-list');
const loading = document.getElementById('admin-list-loading');
const empty = document.getElementById('admin-list-empty');
const errorState = document.getElementById('admin-list-error');

function formatItalianDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function setState(type) {
  loading.classList.toggle('hidden', type !== 'loading');
  empty.classList.toggle('hidden', type !== 'empty');
  errorState.classList.toggle('hidden', type !== 'error');
  list.classList.toggle('hidden', type !== 'ready');
}

function buildPollCard(poll) {
  const card = document.createElement('a');
  card.className = 'poll-card';
  card.href = '/admin/polls/' + encodeURIComponent(poll.slug);

  const header = document.createElement('div');
  header.className = 'poll-card-header';

  const question = document.createElement('h2');
  question.className = 'poll-question';
  question.textContent = poll.question;

  const badge = document.createElement('span');
  badge.className = 'badge' + (poll.closedAt ? ' closed' : '');
  badge.textContent = poll.closedAt ? 'Chiuso' : 'Aperto';

  header.appendChild(question);
  header.appendChild(badge);

  const meta = document.createElement('div');
  meta.className = 'poll-meta';

  const sessionItem = document.createElement('span');
  sessionItem.className = 'poll-meta-item';
  sessionItem.textContent = 'Sessione: ' + poll.sessionKey;

  const dateItem = document.createElement('span');
  dateItem.className = 'poll-meta-item';
  dateItem.textContent = 'Creato: ' + formatItalianDate(poll.createdAt);

  const countItem = document.createElement('span');
  countItem.className = 'poll-meta-item';
  countItem.textContent = 'Partecipanti: ' + (poll.participantCount ?? 0);

  meta.appendChild(sessionItem);
  meta.appendChild(dateItem);
  meta.appendChild(countItem);

  card.appendChild(header);
  card.appendChild(meta);
  return card;
}

async function loadPolls() {
  setState('loading');

  try {
    const response = await fetch('/api/polls', {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('network-error');
    }

    const polls = await response.json();

    list.innerHTML = '';

    if (!polls || polls.length === 0) {
      setState('empty');
      return;
    }

    polls.forEach((poll) => {
      list.appendChild(buildPollCard(poll));
    });

    setState('ready');
  } catch (error) {
    setState('error');
  }
}

loadPolls();
