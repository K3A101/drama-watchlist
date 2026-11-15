'use strict';

const STATUSES = {
  watching: 'Watching',
  completed: 'Completed',
  dropped: 'Dropped',
  plan: 'Plan to watch',
};

/* ---------- Storage (IndexedDB, lives in this browser) ---------- */

const DB_NAME = 'drama-watchlist';
const STORE = 'dramas';

const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

function withStore(mode, action) {
  return dbPromise.then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error);
  }));
}

const db = {
  all: () => withStore('readonly', (store) => store.getAll()),
  put: (drama) => withStore('readwrite', (store) => store.put(drama)),
  putMany: (dramas) => withStore('readwrite', (store) => { dramas.forEach((d) => store.put(d)); }),
  remove: (id) => withStore('readwrite', (store) => store.delete(id)),
};

/* ---------- State & elements ---------- */

const state = { dramas: [], filter: 'all', search: '', sort: 'added' };
let pendingImage = '';

const $ = (id) => document.getElementById(id);
const el = {
  cards: $('cards'),
  empty: $('empty'),
  template: $('card-template'),
  search: $('search'),
  sort: $('sort'),
  filters: document.querySelectorAll('[data-filter]'),
  addButton: $('add-button'),
  exportButton: $('export-button'),
  importButton: $('import-button'),
  importInput: $('import-input'),
  dialog: $('drama-dialog'),
  dialogTitle: $('dialog-title'),
  form: $('drama-form'),
  titleError: $('title-error'),
  clearRating: $('clear-rating'),
  fileInput: $('image-file'),
  urlInput: $('image-url'),
  preview: $('image-preview'),
  previewImage: $('preview-image'),
  previewError: $('preview-error'),
  removeImage: $('remove-image'),
  deleteButton: $('delete-button'),
  cancelButton: $('cancel-button'),
};

/* ---------- Rendering ---------- */

const sorters = {
  added: (a, b) => b.createdAt - a.createdAt,
  title: (a, b) => a.title.localeCompare(b.title),
  rating: (a, b) => b.rating - a.rating || a.title.localeCompare(b.title),
};

function render() {
  const query = state.search.trim().toLowerCase();
  const list = state.dramas
    .filter((d) => state.filter === 'all' || d.status === state.filter)
    .filter((d) => d.title.toLowerCase().includes(query))
    .sort(sorters[state.sort]);

  el.cards.replaceChildren(...list.map(createCard));
  el.empty.hidden = list.length > 0;
  el.empty.textContent = state.dramas.length
    ? 'No dramas match this filter.'
    : 'No dramas yet. Add your first one!';

  document.querySelectorAll('[data-count]').forEach((node) => {
    const key = node.dataset.count;
    node.textContent = key === 'all'
      ? state.dramas.length
      : state.dramas.filter((d) => d.status === key).length;
  });
}

function createCard(drama) {
  const card = el.template.content.firstElementChild.cloneNode(true);

  const image = card.querySelector('.card__image');
  if (drama.image) {
    image.addEventListener('error', () => card.classList.add('card--no-image'));
    image.src = drama.image;
  } else {
    card.classList.add('card--no-image');
  }

  const status = card.querySelector('.card__status');
  status.textContent = STATUSES[drama.status];
  status.classList.add(`card__status--${drama.status}`);

  const button = card.querySelector('.card__button');
  button.textContent = drama.title;
  button.addEventListener('click', () => openDialog(drama));

  const rating = card.querySelector('.card__rating');
  if (drama.rating) {
    const stars = document.createElement('span');
    stars.setAttribute('aria-hidden', 'true');
    stars.textContent = '★'.repeat(drama.rating) + '☆'.repeat(5 - drama.rating);
    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = `Rated ${drama.rating} out of 5`;
    rating.append(stars, label);
  } else {
    rating.textContent = 'Not rated';
    rating.classList.add('card__rating--empty');
  }

  const notes = card.querySelector('.card__notes');
  if (drama.notes) notes.textContent = drama.notes;
  else notes.remove();

  return card;
}

/* ---------- Images ---------- */

// Shrinks uploads so lots of posters still fit comfortably in browser storage.
function resizeImage(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

function setImage(src) {
  pendingImage = src;
  el.previewError.hidden = true;
  el.preview.hidden = !src;
  if (src) el.previewImage.src = src;
  else el.previewImage.removeAttribute('src');
}

el.previewImage.addEventListener('error', () => {
  if (pendingImage) el.previewError.hidden = false;
});
el.previewImage.addEventListener('load', () => {
  el.previewError.hidden = true;
});

el.fileInput.addEventListener('change', async () => {
  const file = el.fileInput.files[0];
  if (!file) return;
  try {
    setImage(await resizeImage(file));
    el.urlInput.value = '';
  } catch {
    alert('That file could not be read as an image.');
    el.fileInput.value = '';
  }
});

el.urlInput.addEventListener('input', () => {
  setImage(el.urlInput.value.trim());
  el.fileInput.value = '';
});

el.removeImage.addEventListener('click', () => {
  setImage('');
  el.urlInput.value = '';
  el.fileInput.value = '';
});

/* ---------- Add / edit dialog ---------- */

function createId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function openDialog(drama) {
  const fields = el.form.elements;
  el.form.reset();
  el.titleError.hidden = true;
  el.dialogTitle.textContent = drama ? 'Edit drama' : 'Add drama';
  el.deleteButton.hidden = !drama;

  fields.dramaId.value = drama?.id ?? '';
  fields.title.value = drama?.title ?? '';
  fields.status.value = drama?.status ?? (state.filter !== 'all' ? state.filter : 'watching');
  fields.notes.value = drama?.notes ?? '';
  if (drama?.rating) $(`rating-${drama.rating}`).checked = true;

  setImage(drama?.image ?? '');
  if (drama?.image && !drama.image.startsWith('data:')) el.urlInput.value = drama.image;

  el.dialog.showModal();
}

el.addButton.addEventListener('click', () => openDialog());
el.cancelButton.addEventListener('click', () => el.dialog.close());

el.clearRating.addEventListener('click', () => {
  el.form.querySelectorAll('input[name="rating"]').forEach((input) => { input.checked = false; });
});

el.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = el.form.elements;
  const title = fields.title.value.trim();
  if (!title) {
    el.titleError.hidden = false;
    fields.title.focus();
    return;
  }

  const id = fields.dramaId.value;
  const existing = state.dramas.find((d) => d.id === id);
  const drama = {
    id: id || createId(),
    title,
    status: fields.status.value,
    rating: Number(fields.rating.value) || 0,
    image: pendingImage,
    notes: fields.notes.value.trim(),
    createdAt: existing?.createdAt ?? Date.now(),
  };

  try {
    await db.put(drama);
  } catch {
    alert('Saving failed. Your browser storage may be full or blocked.');
    return;
  }

  state.dramas = existing
    ? state.dramas.map((d) => (d.id === id ? drama : d))
    : [...state.dramas, drama];
  el.dialog.close();
  render();
});

el.deleteButton.addEventListener('click', async () => {
  const id = el.form.elements.dramaId.value;
  const drama = state.dramas.find((d) => d.id === id);
  if (!drama || !confirm(`Delete "${drama.title}"?`)) return;
  await db.remove(id);
  state.dramas = state.dramas.filter((d) => d.id !== id);
  el.dialog.close();
  render();
});

/* ---------- Filters, search, sort ---------- */

el.filters.forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    el.filters.forEach((b) => {
      const active = b === button;
      b.classList.toggle('nav__item--active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    render();
  });
});

el.search.addEventListener('input', () => {
  state.search = el.search.value;
  render();
});

el.sort.addEventListener('change', () => {
  state.sort = el.sort.value;
  render();
});

/* ---------- Export / import (backup) ---------- */

el.exportButton.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.dramas, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `drama-watchlist-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

el.importButton.addEventListener('click', () => el.importInput.click());

el.importInput.addEventListener('change', async () => {
  const file = el.importInput.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error('Not a list');
    const valid = data
      .filter((d) => d && typeof d.id === 'string' && typeof d.title === 'string'
        && Object.hasOwn(STATUSES, d.status))
      .map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        rating: Math.min(5, Math.max(0, Math.round(Number(d.rating) || 0))),
        image: typeof d.image === 'string' ? d.image : '',
        notes: typeof d.notes === 'string' ? d.notes : '',
        createdAt: Number(d.createdAt) || Date.now(),
      }));
    await db.putMany(valid);
    state.dramas = await db.all();
    render();
    alert(`Imported ${valid.length} drama${valid.length === 1 ? '' : 's'}.`);
  } catch {
    alert('That file is not a valid watchlist export.');
  }
  el.importInput.value = '';
});

/* ---------- Start ---------- */

db.all()
  .then((dramas) => {
    state.dramas = dramas;
    render();
  })
  .catch(() => {
    el.empty.hidden = false;
    el.empty.textContent = 'Your browser is blocking storage, so dramas cannot be saved here.';
  });
