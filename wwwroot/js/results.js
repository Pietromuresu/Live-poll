(() => {
  const renderedByContainer = new WeakMap();

  function renderResults(container, results, totalVotes) {
    let renderedResults = renderedByContainer.get(container);
    if (!renderedResults) {
      renderedResults = new Map();
      renderedByContainer.set(container, renderedResults);
    }

    const currentResultIds = new Set();

    results.forEach((result, index) => {
      const resultId = String(result.optionId);
      currentResultIds.add(resultId);
      let elements = renderedResults.get(resultId);

      if (!elements) {
        const row = document.createElement('div');
        row.className = 'result-row';

        const label = document.createElement('span');
        label.className = 'result-label';

        const total = document.createElement('span');
        total.className = 'result-total';

        const track = document.createElement('div');
        track.className = 'result-track';
        track.setAttribute('role', 'progressbar');
        track.setAttribute('aria-valuemin', '0');
        track.setAttribute('aria-valuemax', '100');

        const bar = document.createElement('div');
        bar.className = 'result-bar';
        track.appendChild(bar);
        row.append(label, total, track);

        elements = { row, label, total, track, bar };
        renderedResults.set(resultId, elements);
      }

      if (elements.label.textContent !== result.text) {
        elements.label.textContent = result.text;
        elements.track.setAttribute('aria-label', result.text);
      }

      const count = Number(result.count) || 0;
      const percentage = totalVotes > 0
        ? Math.min(100, Math.round((count / totalVotes) * 100))
        : 0;
      const totalText = `${count} voti · ${percentage}%`;
      if (elements.total.textContent !== totalText) {
        elements.total.textContent = totalText;
      }
      if (elements.bar.style.width !== `${percentage}%`) {
        elements.bar.style.width = `${percentage}%`;
      }
      if (elements.track.getAttribute('aria-valuenow') !== String(percentage)) {
        elements.track.setAttribute('aria-valuenow', String(percentage));
      }

      const currentRow = container.children[index];
      if (currentRow !== elements.row) {
        container.insertBefore(elements.row, currentRow || null);
      }
    });

    for (const [resultId, elements] of renderedResults) {
      if (!currentResultIds.has(resultId)) {
        elements.row.remove();
        renderedResults.delete(resultId);
      }
    }
  }

  window.PollResults = { render: renderResults };
})();