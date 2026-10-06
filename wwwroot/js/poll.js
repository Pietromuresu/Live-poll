const pollPage = document.getElementById('participant-poll');
const pollLoading = document.getElementById('poll-loading');
const pollNotFound = document.getElementById('poll-not-found');
const pollLoadError = document.getElementById('poll-load-error');
const participantContent = document.getElementById('participant-content');
const participantQuestion = document.getElementById('participant-question');
const participantIdentity = document.getElementById('participant-identity');
const questionSection = document.getElementById('poll-question-section');
const votedSection = document.getElementById('poll-voted-section');
const closedSection = document.getElementById('poll-closed-section');
const pollOptions = document.getElementById('poll-options');
const voteError = document.getElementById('vote-error');
const submitVoteButton = document.getElementById('submit-vote');
const connectionWarning = document.getElementById('connection-warning');
const notVotedNote = document.getElementById('not-voted-note');
const finalResultsError = document.getElementById('final-results-error');
const finalResultsList = document.getElementById('final-results-list');

const slug = pollPage.dataset.slug;
let poll;
let nickname;
let hasVoted = false;
let isSubmittingVote = false;
let currentSection = '';
let pollingActive = false;
let pollingTimeout;
let finalResultsRequested = false;

function showPageState(state) {
  pollLoading.classList.toggle('hidden', state !== 'loading');
  pollNotFound.classList.toggle('hidden', state !== 'not-found');
  pollLoadError.classList.toggle('hidden', state !== 'error');
  participantContent.classList.toggle('hidden', state !== 'ready');
}

function showPollSection(section) {
  currentSection = section;
  questionSection.classList.toggle('hidden', section !== 'question');
  votedSection.classList.toggle('hidden', section !== 'voted');
  closedSection.classList.toggle('hidden', section !== 'closed');
}

function stopPolling() {
  pollingActive = false;
  clearTimeout(pollingTimeout);
}

function showPollNotFound() {
  stopPolling();
  showPageState('not-found');
}

function setVoteControlsDisabled(disabled) {
  pollOptions.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.disabled = disabled;
  });
  submitVoteButton.disabled = disabled || !pollOptions.querySelector('input:checked');
}

function renderOptions(options) {
  pollOptions.replaceChildren();

  options.forEach((option) => {
    const label = document.createElement('label');
    label.className = 'poll-option-card';

    const input = document.createElement('input');
    input.className = 'poll-option-radio';
    input.type = 'radio';
    input.name = 'optionId';
    input.value = String(option.id);
    input.addEventListener('change', () => {
      pollOptions.querySelectorAll('.poll-option-card').forEach((card) => {
        card.classList.toggle('selected', card.querySelector('input').checked);
      });
      submitVoteButton.disabled = isSubmittingVote || !input.checked;
    });

    const indicator = document.createElement('span');
    indicator.className = 'poll-option-indicator';
    indicator.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'poll-option-text';
    text.textContent = option.text;

    label.append(input, indicator, text);
    pollOptions.appendChild(label);
  });

  setVoteControlsDisabled(false);
}

async function verifyParticipantStatus() {
  const response = await fetch(
    `/api/polls/${encodeURIComponent(slug)}/participants/${encodeURIComponent(nickname)}`,
    { headers: { Accept: 'application/json' } }
  );

  if (response.status === 404) {
    window.LivePollStorage.removeParticipation(poll.sessionKey);
    window.location.assign('/');
    return;
  }

  if (!response.ok) {
    throw new Error('participant-status-failed');
  }

  const participant = await response.json();
  hasVoted = participant.hasVoted;
  if (poll.isClosed) {
    showClosedPoll();
  } else if (hasVoted) {
    showPollSection('voted');
  } else {
    showPollSection('question');
  }
}

async function loadFinalResults() {
  finalResultsRequested = true;
  finalResultsError.textContent = '';
  finalResultsError.classList.add('hidden');

  try {
    const response = await fetch(
      `/api/polls/${encodeURIComponent(slug)}/results?nickname=${encodeURIComponent(nickname)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (response.status === 404) {
      showPollNotFound();
      return;
    }
    if (!response.ok) {
      throw new Error('final-results-failed');
    }

    const status = await response.json();
    window.PollResults.render(finalResultsList, status.results, status.voteCount);
  } catch {
    finalResultsError.textContent = 'Non è stato possibile caricare i risultati. Ricarica la pagina per riprovare.';
    finalResultsError.classList.remove('hidden');
  }
}

function showClosedPoll() {
  stopPolling();
  poll.isClosed = true;
  connectionWarning.classList.add('hidden');

  if (currentSection === 'question') {
    pollOptions.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = false;
    });
    pollOptions.querySelectorAll('.poll-option-card').forEach((card) => {
      card.classList.remove('selected');
    });
    submitVoteButton.disabled = true;
  }

  notVotedNote.classList.toggle('hidden', hasVoted);
  showPollSection('closed');
  if (!finalResultsRequested) {
    loadFinalResults();
  }
}

function schedulePollCheck() {
  if (pollingActive && !isSubmittingVote) {
    pollingTimeout = setTimeout(checkPollStatus, 2000);
  }
}

async function checkPollStatus() {
  if (!pollingActive || isSubmittingVote) {
    return;
  }

  try {
    const response = await fetch(`/api/polls/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' }
    });

    if (!pollingActive || isSubmittingVote) {
      return;
    }
    if (response.status === 404) {
      showPollNotFound();
      return;
    }
    if (!response.ok) {
      throw new Error('poll-check-failed');
    }

    const currentPoll = await response.json();
    if (!pollingActive || isSubmittingVote) {
      return;
    }

    connectionWarning.classList.add('hidden');
    if (currentPoll.isClosed) {
      showClosedPoll();
      return;
    }
    schedulePollCheck();
  } catch {
    if (pollingActive && !isSubmittingVote) {
      connectionWarning.classList.remove('hidden');
      schedulePollCheck();
    }
  }
}

function startPolling() {
  if (!pollingActive && !poll.isClosed && !isSubmittingVote) {
    pollingActive = true;
    schedulePollCheck();
  }
}

async function loadPoll() {
  showPageState('loading');

  try {
    const pollResponse = await fetch(`/api/polls/${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json' }
    });

    if (pollResponse.status === 404) {
      showPollNotFound();
      return;
    }

    if (!pollResponse.ok) {
      throw new Error('poll-load-failed');
    }

    poll = await pollResponse.json();
    const participations = window.LivePollStorage.readParticipations();
    nickname = participations[poll.sessionKey];
    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      window.location.assign('/');
      return;
    }

    nickname = nickname.trim();
    participantQuestion.textContent = poll.question;
    participantIdentity.textContent = `Partecipi come ${nickname}`;
    renderOptions(poll.options);
    await verifyParticipantStatus();
    showPageState('ready');
    if (!poll.isClosed && (currentSection === 'question' || currentSection === 'voted')) {
      startPolling();
    }
  } catch {
    showPageState('error');
  }
}

async function handleClosedVoteConflict() {
  const response = await fetch(
    `/api/polls/${encodeURIComponent(slug)}/participants/${encodeURIComponent(nickname)}`,
    { headers: { Accept: 'application/json' } }
  );

  if (response.status === 404) {
    window.LivePollStorage.removeParticipation(poll.sessionKey);
    window.location.assign('/');
    return;
  }

  if (!response.ok) {
    throw new Error('participant-status-failed');
  }

  const participant = await response.json();
  hasVoted = participant.hasVoted;
  if (hasVoted) {
    showPollSection('voted');
    startPolling();
  } else {
    showClosedPoll();
  }
}

submitVoteButton.addEventListener('click', async () => {
  const selectedOption = pollOptions.querySelector('input[type="radio"]:checked');
  if (!selectedOption || isSubmittingVote) {
    return;
  }

  isSubmittingVote = true;
  stopPolling();
  voteError.textContent = '';
  voteError.classList.add('hidden');
  setVoteControlsDisabled(true);

  try {
    const response = await fetch(`/api/polls/${encodeURIComponent(slug)}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ nickname, optionId: Number(selectedOption.value) })
    });

    if (response.status === 200) {
      hasVoted = true;
      showPollSection('voted');
      return;
    }

    if (response.status === 409) {
      await handleClosedVoteConflict();
      return;
    }

    let message = 'Non è stato possibile inviare il voto. Riprova.';
    try {
      const responseBody = await response.json();
      if (responseBody.error) {
        message = responseBody.error;
      }
    } catch {
    }
    voteError.textContent = message;
    voteError.classList.remove('hidden');
  } catch {
    voteError.textContent = 'Errore di rete. Controlla la connessione e riprova.';
    voteError.classList.remove('hidden');
  } finally {
    isSubmittingVote = false;
    if (currentSection === 'question') {
      setVoteControlsDisabled(false);
    }
    if (currentSection === 'question' || currentSection === 'voted') {
      startPolling();
    }
  }
});

loadPoll();