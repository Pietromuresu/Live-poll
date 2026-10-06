(() => {
  const storageKey = 'livepoll.participations';

  function readParticipations() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        return {};
      }

      const participations = JSON.parse(stored);
      return participations && typeof participations === 'object' && !Array.isArray(participations)
        ? participations
        : {};
    } catch {
      return {};
    }
  }

  function writeParticipation(sessionKey, nickname) {
    try {
      const participations = readParticipations();
      participations[sessionKey] = nickname;
      localStorage.setItem(storageKey, JSON.stringify(participations));
    } catch {
    }
  }

  function removeParticipation(sessionKey) {
    try {
      const participations = readParticipations();
      delete participations[sessionKey];
      localStorage.setItem(storageKey, JSON.stringify(participations));
    } catch {
    }
  }

  window.LivePollStorage = {
    readParticipations,
    writeParticipation,
    removeParticipation
  };
})();