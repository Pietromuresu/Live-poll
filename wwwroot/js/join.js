const joinForm = document.getElementById('join-form');
const sessionKeyInput = document.getElementById('session-key-input');
const sessionKeyStatus = document.getElementById('session-key-status');
const nicknameInput = document.getElementById('nickname-input');
const nicknameStatus = document.getElementById('nickname-status');
const joinError = document.getElementById('join-error');
const enterButton = document.getElementById('enter-button');

let currentSlug = '';
let currentSessionKey = '';
let sessionKeyValid = false;
let nicknameState = 'empty';
let isSubmitting = false;
let codeRequestVersion = 0;
let nicknameRequestVersion = 0;
let nicknameCheckTimeout;

function updateEnterButton() {
  const nicknameIsValid = nicknameState === 'available' || nicknameState === 'returning';
  enterButton.disabled = isSubmitting || !sessionKeyValid || !nicknameIsValid;
}

function setNicknameState(state, message = '') {
  nicknameState = state;
  nicknameStatus.textContent = message;
  updateEnterButton();
}

function clearJoinError() {
  joinError.textContent = '';
  joinError.classList.add('hidden');
}

function setSubmitting(submitting) {
  isSubmitting = submitting;
  sessionKeyInput.disabled = submitting;
  nicknameInput.disabled = submitting || !sessionKeyValid;
  updateEnterButton();
}

function isCurrentNicknameCheck(version, sessionKey, slug, nickname) {
  return version === nicknameRequestVersion
    && currentSessionKey === sessionKey
    && currentSlug === slug
    && nicknameInput.value.trim() === nickname;
}

async function checkNickname(version, sessionKey, slug, nickname) {
  try {
    const response = await fetch(
      `/api/polls/${encodeURIComponent(slug)}/participants/${encodeURIComponent(nickname)}`,
      { headers: { Accept: 'application/json' } }
    );

    if (!isCurrentNicknameCheck(version, sessionKey, slug, nickname)) {
      return;
    }

    if (response.status === 404) {
      setNicknameState('available', 'Nickname disponibile');
      return;
    }

    if (response.ok) {
      const savedNickname = window.LivePollStorage.readParticipations()[sessionKey];
      if (savedNickname === nickname) {
        setNicknameState('returning', 'Bentornato, riprenderai da dove eri');
      } else {
        setNicknameState('taken', 'Nickname già in uso');
      }
      return;
    }

    setNicknameState('error', 'Errore durante la verifica del nickname. Riprova.');
  } catch {
    if (isCurrentNicknameCheck(version, sessionKey, slug, nickname)) {
      setNicknameState('error', 'Errore di rete durante la verifica del nickname.');
    }
  }
}

function scheduleNicknameCheck() {
  clearTimeout(nicknameCheckTimeout);
  nicknameRequestVersion += 1;
  const version = nicknameRequestVersion;
  const nickname = nicknameInput.value.trim();

  if (!sessionKeyValid || !currentSlug || nickname.length === 0) {
    setNicknameState('empty');
    return;
  }

  setNicknameState('checking', 'Verifica nickname...');
  const sessionKey = currentSessionKey;
  const slug = currentSlug;
  nicknameCheckTimeout = setTimeout(() => {
    checkNickname(version, sessionKey, slug, nickname);
  }, 300);
}

async function verifySessionKey(sessionKey) {
  codeRequestVersion += 1;
  const version = codeRequestVersion;
  nicknameRequestVersion += 1;
  clearTimeout(nicknameCheckTimeout);

  currentSessionKey = sessionKey;
  currentSlug = '';
  sessionKeyValid = false;
  nicknameInput.disabled = true;
  sessionKeyStatus.textContent = '';
  setNicknameState('empty');
  clearJoinError();

  if (sessionKey.length !== 6) {
    updateEnterButton();
    return;
  }

  sessionKeyStatus.textContent = 'Verifica codice...';

  try {
    const response = await fetch(`/api/polls/by-key/${encodeURIComponent(sessionKey)}`, {
      headers: { Accept: 'application/json' }
    });

    if (version !== codeRequestVersion || sessionKeyInput.value.trim() !== sessionKey) {
      return;
    }

    if (response.status === 404) {
      sessionKeyStatus.textContent = 'Codice non valido';
      return;
    }

    if (!response.ok) {
      sessionKeyStatus.textContent = 'Errore durante la verifica del codice. Riprova.';
      return;
    }

    const poll = await response.json();
    if (version !== codeRequestVersion || sessionKeyInput.value.trim() !== sessionKey) {
      return;
    }

    currentSlug = poll.slug;
    sessionKeyValid = true;
    nicknameInput.disabled = false;
    sessionKeyStatus.textContent = poll.isClosed
      ? `Domanda: ${poll.question} · Votazione chiusa`
      : `Domanda: ${poll.question}`;
    scheduleNicknameCheck();
  } catch {
    if (version === codeRequestVersion && sessionKeyInput.value.trim() === sessionKey) {
      sessionKeyStatus.textContent = 'Errore di rete durante la verifica del codice.';
    }
  }
}

sessionKeyInput.addEventListener('input', () => {
  const uppercaseValue = sessionKeyInput.value.toUpperCase();
  if (sessionKeyInput.value !== uppercaseValue) {
    sessionKeyInput.value = uppercaseValue;
  }
  verifySessionKey(sessionKeyInput.value.trim());
});

nicknameInput.addEventListener('input', () => {
  clearJoinError();
  scheduleNicknameCheck();
});

joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (enterButton.disabled || !currentSlug) {
    return;
  }

  const sessionKey = currentSessionKey;
  const slug = currentSlug;
  const nickname = nicknameInput.value.trim();
  clearJoinError();
  setSubmitting(true);

  try {
    const response = await fetch(`/api/polls/${encodeURIComponent(slug)}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ nickname })
    });

    if (response.status === 200 && window.LivePollStorage.readParticipations()[sessionKey] !== nickname) {
      setSubmitting(false);
      setNicknameState('taken', 'Nickname già in uso');
      return;
    }

    if (response.status === 201 || response.status === 200) {
      window.LivePollStorage.writeParticipation(sessionKey, nickname);
      window.location.assign(`/polls/${encodeURIComponent(slug)}`);
      return;
    }

    let message = 'Non è stato possibile entrare nella votazione. Riprova.';
    try {
      const responseBody = await response.json();
      if (responseBody.error) {
        message = responseBody.error;
      }
    } catch {
    }
    joinError.textContent = message;
    joinError.classList.remove('hidden');
    setSubmitting(false);
  } catch {
    joinError.textContent = 'Errore di rete. Controlla la connessione e riprova.';
    joinError.classList.remove('hidden');
    setSubmitting(false);
  }
});