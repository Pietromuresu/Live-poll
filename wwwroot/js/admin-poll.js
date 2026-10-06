const pollPage = document.getElementById('poll-page');
const pollLoading = document.getElementById('poll-loading');
const pollNotFound = document.getElementById('poll-not-found');
const pollLoadError = document.getElementById('poll-load-error');
const pollContent = document.getElementById('poll-content');
const pollQuestion = document.getElementById('poll-question');
const pollStatusBadge = document.getElementById('poll-status-badge');
const sessionKey = document.getElementById('session-key');
const copySessionKeyButton = document.getElementById('copy-session-key');
const participantInstructions = document.getElementById('participant-instructions');
const participantCount = document.getElementById('participant-count');
const voteCount = document.getElementById('vote-count');
const resultsList = document.getElementById('results-list');
const connectionWarning = document.getElementById('connection-warning');
const closePollButton = document.getElementById('close-poll');
const pollFinalized = document.getElementById('poll-finalized');
const closeError = document.getElementById('close-error');
const encodedSlug = encodeURIComponent(pollPage.dataset.slug);
let pollingActive = false;
let pollingTimeout;
let lastStatus;

function showPageState(state) {
  pollLoading.classList.toggle('hidden', state !== 'loading');
  pollNotFound.classList.toggle('hidden', state !== 'not-found');
  pollLoadError.classList.toggle('hidden', state !== 'error');
  pollContent.classList.toggle('hidden', state !== 'ready');
}

function stopPolling() {
  pollingActive = false;
  clearTimeout(pollingTimeout);
}

function updateStatus(status) {
  lastStatus = status;
  if (participantCount.textContent !== String(status.participantCount)) {
    participantCount.textContent = String(status.participantCount);
  }
  if (voteCount.textContent !== String(status.voteCount)) {
    voteCount.textContent = String(status.voteCount);
  }
  window.PollResults.render(resultsList, status.results, status.voteCount);
  const badgeText = status.isClosed ? 'Chiuso' : 'Aperto';
  if (pollStatusBadge.textContent !== badgeText) {
    pollStatusBadge.textContent = badgeText;
  }
  if (pollStatusBadge.classList.contains('closed') !== status.isClosed) {
    pollStatusBadge.classList.toggle('closed', status.isClosed);
  }
  if (closePollButton.classList.contains('hidden') !== status.isClosed) {
    closePollButton.classList.toggle('hidden', status.isClosed);
  }
  if (pollFinalized.classList.contains('hidden') === status.isClosed) {
    pollFinalized.classList.toggle('hidden', !status.isClosed);
  }

  if (status.isClosed) {
    stopPolling();
  }
}

function renderPoll(poll, status) {
  pollQuestion.textContent = poll.question;
  sessionKey.textContent = poll.sessionKey;
  participantInstructions.textContent = `Vai su ${window.location.origin} e inserisci il codice`;
  updateStatus({ ...status, isClosed: poll.isClosed || status.isClosed });
}

function showPollNotFound() {
  stopPolling();
  showPageState('not-found');
}

function scheduleStatusPoll() {
  if (pollingActive) {
    pollingTimeout = setTimeout(pollStatus, 2000);
  }
}

async function pollStatus() {
  if (!pollingActive) {
    return;
  }

  try {
    const response = await fetch(`/api/polls/${encodedSlug}/status`, {
      headers: { Accept: 'application/json' }
    });
    if (!pollingActive) {
      return;
    }
    if (response.status === 404) {
      showPollNotFound();
      return;
    }

    if (!response.ok) {
      throw new Error('status-request-failed');
    }

    const status = await response.json();
    if (!pollingActive) {
      return;
    }
    connectionWarning.classList.add('hidden');
    updateStatus(status);
    scheduleStatusPoll();
  } catch {
    if (pollingActive) {
      connectionWarning.classList.remove('hidden');
      scheduleStatusPoll();
    }
  }
}

function startPolling() {
  if (!pollingActive && !lastStatus?.isClosed) {
    pollingActive = true;
    scheduleStatusPoll();
  }
}

async function refreshFinalStatus() {
  try {
    const response = await fetch(`/api/polls/${encodedSlug}/status`, {
      headers: { Accept: 'application/json' }
    });
    if (response.status === 404) {
      showPollNotFound();
      return;
    }
    if (response.ok) {
      const status = await response.json();
      updateStatus({ ...status, isClosed: true });
    }
  } catch {
  }
}

async function loadPoll() {
  showPageState('loading');

  try {
    const [pollResponse, statusResponse] = await Promise.all([
      fetch(`/api/polls/${encodedSlug}`, { headers: { Accept: 'application/json' } }),
      fetch(`/api/polls/${encodedSlug}/status`, { headers: { Accept: 'application/json' } })
    ]);

    if (pollResponse.status === 404 || statusResponse.status === 404) {
      showPageState('not-found');
      return;
    }

    if (!pollResponse.ok || !statusResponse.ok) {
      showPageState('error');
      return;
    }

    const [poll, status] = await Promise.all([
      pollResponse.json(),
      statusResponse.json()
    ]);
    renderPoll(poll, status);
    showPageState('ready');
    if (!lastStatus.isClosed) {
      startPolling();
    }
  } catch {
    showPageState('error');
  }
}

let copyFeedbackTimeout;
copySessionKeyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(sessionKey.textContent);
    copySessionKeyButton.textContent = 'Copiata!';
    clearTimeout(copyFeedbackTimeout);
    copyFeedbackTimeout = setTimeout(() => {
      copySessionKeyButton.textContent = 'Copia';
    }, 2000);
  } catch {
    copySessionKeyButton.textContent = 'Copia';
  }
});

closePollButton.addEventListener('click', async () => {
  if (!window.confirm('Chiudere la votazione? L’operazione è definitiva e non sarà più possibile votare.')) {
    return;
  }

  stopPolling();
  closePollButton.disabled = true;
  closeError.classList.add('hidden');
  closeError.textContent = '';

  try {
    const response = await fetch(`/api/polls/${encodedSlug}/close`, { method: 'POST' });
    if (!response.ok && response.status !== 409) {
      throw new Error('close-request-failed');
    }

    let closeResponse = { isClosed: true };
    if (response.ok) {
      closeResponse = await response.json();
    }

    updateStatus({ ...lastStatus, isClosed: closeResponse.isClosed ?? true });
    await refreshFinalStatus();
  } catch {
    closeError.textContent = 'Non è stato possibile chiudere la votazione. Riprova.';
    closeError.classList.remove('hidden');
    closePollButton.disabled = false;
    startPolling();
  }
});

loadPoll();