const form = document.getElementById('new-poll-form');
const questionInput = document.getElementById('question');
const questionError = document.getElementById('question-error');
const optionsList = document.getElementById('options-list');
const addOptionButton = document.getElementById('add-option');
const saveButton = document.getElementById('save-poll');
const saveError = document.getElementById('save-error');

function clearFieldError(input, error) {
  error.classList.add('hidden');
  input.removeAttribute('aria-invalid');
}

function showFieldError(input, error) {
  error.classList.remove('hidden');
  input.setAttribute('aria-invalid', 'true');
}

function createOptionRow(index) {
  const row = document.createElement('div');
  row.className = 'option-row';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'option-input-wrap';

  const label = document.createElement('label');
  label.htmlFor = `option-${index + 1}`;

  const input = document.createElement('input');
  input.id = `option-${index + 1}`;
  input.name = 'options';
  input.type = 'text';
  input.autocomplete = 'off';

  const error = document.createElement('p');
  error.id = `option-${index + 1}-error`;
  error.className = 'field-error hidden';
  error.textContent = 'Inserisci un testo per questa opzione.';
  input.setAttribute('aria-describedby', error.id);
  input.addEventListener('input', () => clearFieldError(input, error));

  const removeButton = document.createElement('button');
  removeButton.className = 'btn btn-secondary';
  removeButton.type = 'button';
  removeButton.textContent = 'Rimuovi';
  removeButton.addEventListener('click', () => {
    row.remove();
    updateOptionRows();
  });

  inputWrap.append(label, input, error);
  row.append(inputWrap, removeButton);
  return row;
}

function updateOptionRows() {
  const rows = [...optionsList.children];
  rows.forEach((row, index) => {
    const label = row.querySelector('label');
    const input = row.querySelector('input');
    const error = row.querySelector('.field-error');
    const removeButton = row.querySelector('button');

    label.htmlFor = `option-${index + 1}`;
    label.textContent = `Opzione ${index + 1}`;
    input.id = `option-${index + 1}`;
    error.id = `option-${index + 1}-error`;
    input.setAttribute('aria-describedby', error.id);
    removeButton.setAttribute('aria-label', `Rimuovi opzione ${index + 1}`);
    removeButton.disabled = rows.length <= 2;
  });

  addOptionButton.disabled = rows.length >= 6;
}

function validateFields() {
  const fields = [
    { input: questionInput, error: questionError, message: 'Inserisci una domanda.' },
    ...[...optionsList.querySelectorAll('.option-row')].map((row) => ({
      input: row.querySelector('input'),
      error: row.querySelector('.field-error'),
      message: 'Inserisci un testo per questa opzione.'
    }))
  ];

  const invalidFields = fields.filter(({ input }) => !input.value.trim());
  fields.forEach(({ input, error, message }) => {
    if (!input.value.trim()) {
      error.textContent = message;
      showFieldError(input, error);
    } else {
      clearFieldError(input, error);
    }
  });

  return invalidFields;
}

questionInput.addEventListener('input', () => clearFieldError(questionInput, questionError));

for (let index = 0; index < 2; index += 1) {
  optionsList.appendChild(createOptionRow(index));
}
updateOptionRows();

addOptionButton.addEventListener('click', () => {
  const row = createOptionRow(optionsList.children.length);
  optionsList.appendChild(row);
  updateOptionRows();
  row.querySelector('input').focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveError.classList.add('hidden');
  saveError.textContent = '';

  const invalidFields = validateFields();
  if (invalidFields.length > 0) {
    invalidFields[0].input.focus();
    return;
  }

  const request = {
    question: questionInput.value.trim(),
    options: [...optionsList.querySelectorAll('input')].map((input) => input.value.trim())
  };

  saveButton.disabled = true;
  saveButton.textContent = 'Salvataggio...';

  try {
    const response = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request)
    });

    if (response.status === 201) {
      const createdPoll = await response.json();
      if (createdPoll.slug) {
        window.location.assign(`/admin/polls/${encodeURIComponent(createdPoll.slug)}`);
        return;
      }
    }

    let message = 'Non è stato possibile salvare il poll. Riprova.';
    try {
      const responseBody = await response.json();
      if (responseBody.error) {
        message = responseBody.error;
      }
    } catch {
    }
    saveError.textContent = message;
    saveError.classList.remove('hidden');
  } catch {
    saveError.textContent = 'Errore di rete. Controlla la connessione e riprova.';
    saveError.classList.remove('hidden');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Salva poll';
  }
});