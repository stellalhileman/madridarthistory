const loginPanel = document.querySelector('#login-panel');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
const logoutButton = document.querySelector('#logout-button');
const sectionView = document.querySelector('#section-view');
const editorPanel = document.querySelector('#editor-panel');

let currentSection = 'exhibitions';
let currentImageUrl = '';

const labels = {
  exhibitions: 'Exhibitions',
  conferences: 'Conferences',
  activities: 'Activities at SLU',
  news: 'Community',
  courses: 'Courses',
  faculty: 'Faculty',
  homepage: 'Homepage images'
};

const homepageImageSettings = [
  { key: 'homepage_hero_image', label: 'Homepage banner', description: 'Upload the complete banner graphic. Text will not be added over it.' },
  { key: 'homepage_exhibitions_image', label: 'Exhibitions card', description: 'Image used behind the Exhibitions card on the homepage.' },
  { key: 'homepage_activities_image', label: 'Activities at SLU card', description: 'Image used behind the Activities at SLU card on the homepage.' },
  { key: 'homepage_conferences_image', label: 'Conferences card', description: 'Image used behind the Conferences card on the homepage.' }
];

let homepageSettings = {};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function getUserAndProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabaseClient.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (error || !profile || !['Administrator', 'Editor'].includes(profile.role)) return null;
  return { user, profile };
}

async function refreshAuth() {
  const account = await getUserAndProfile();
  if (!account) {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    logoutButton.hidden = true;
    return;
  }
  loginPanel.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
  await showSection(currentSection);
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginMessage.textContent = 'Signing in…';
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.querySelector('#login-email').value,
    password: document.querySelector('#login-password').value
  });
  if (error) { loginMessage.textContent = error.message; return; }
  loginMessage.textContent = '';
  await refreshAuth();
});

logoutButton.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  await refreshAuth();
});

document.querySelectorAll('#admin-nav button').forEach(button => {
  button.addEventListener('click', () => showSection(button.dataset.section));
});

async function fetchRows(table) {
  const { data, error } = await supabaseClient.from(table).select('*').order('created_at', { ascending: false });
  if (error && error.message.includes('created_at')) return await supabaseClient.from(table).select('*');
  return { data, error };
}

function titleFor(item, section) {
  if (section === 'courses') return item.title || item.name || item.code || 'Untitled course';
  if (section === 'faculty') return item.name || 'Untitled faculty member';
  return item.title || 'Untitled';
}

function metaFor(item, section) {
  if (section === 'exhibitions') return [item.venue, item.start_date].filter(Boolean).join(' · ');
  if (section === 'conferences' || section === 'activities') return [item.location, item.start_date].filter(Boolean).join(' · ');
  if (section === 'news') return [item.category, item.publication_date].filter(Boolean).join(' · ');
  if (section === 'courses') return [item.code, item.level, item.when_offered || item.term].filter(Boolean).join(' · ');
  if (section === 'faculty') return item.position || '';
  return '';
}

function itemLabel(section) {
  return ({exhibitions:'exhibition', conferences:'conference', activities:'activity', news:'story', courses:'course', faculty:'faculty member'})[section] || 'item';
}
function sectionHeader(section, count) {
  return `<div class="admin-heading"><div><p class="eyebrow">Content manager</p><h1>${labels[section]}</h1><p class="admin-count">${count} item${count === 1 ? '' : 's'}</p></div><button id="new-item" class="button admin-primary">+ Add ${itemLabel(section)}</button></div>`;
}

async function showSection(section) {
  currentSection = section;
  document.querySelectorAll('#admin-nav button').forEach(button => button.classList.toggle('active', button.dataset.section === section));
  editorPanel.hidden = true;
  sectionView.innerHTML = '<div class="admin-panel"><p>Loading…</p></div>';

  if (section === 'homepage') {
    await showHomepageSettings();
    return;
  }

  const { data, error } = await fetchRows(section);
  if (error) {
    sectionView.innerHTML = `<div class="admin-panel"><p class="form-message">${escapeHtml(error.message)}</p></div>`;
    return;
  }

  sectionView.innerHTML = sectionHeader(section, (data || []).length) + `<div class="admin-panel"><div class="admin-list">${renderRows(data || [], section)}</div></div>`;

  const add = document.querySelector('#new-item');
  if (add) add.addEventListener('click', () => openEditor(section));
  document.querySelectorAll('.edit-item').forEach(button => button.addEventListener('click', () => openEditor(section, button.dataset.id)));
  document.querySelectorAll('.delete-item').forEach(button => {
    button.addEventListener('click', () => deleteItem(section, button.dataset.id, button));
  });
}

async function deleteItem(section, id, button) {
  const item = button.closest('.admin-list-item');
  const title = item?.querySelector('strong')?.textContent || `this ${itemLabel(section)}`;
  const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`);
  if (!confirmed) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Deleting…';

  try {
    const { error } = await supabaseClient.from(section).delete().eq('id', id);
    if (error) throw error;
    await showSection(section);
  } catch (error) {
    console.error(`Could not delete ${section} item:`, error);
    button.disabled = false;
    button.textContent = originalText;
    let message = document.querySelector('#delete-message');
    if (!message) {
      message = document.createElement('p');
      message.id = 'delete-message';
      message.className = 'form-message delete-message';
      message.setAttribute('role', 'status');
      sectionView.prepend(message);
    }
    message.textContent = `Could not delete ${itemLabel(section)}: ${error.message || 'Please try again.'}`;
  }
}


async function showHomepageSettings() {
  const { data, error } = await supabaseClient
    .from('site_settings')
    .select('key, value')
    .in('key', homepageImageSettings.map(item => item.key));

  if (error) {
    sectionView.innerHTML = `<div class="admin-panel">
      <h2>Homepage images</h2>
      <p class="form-message">Homepage image settings could not be loaded. Make sure the setup SQL has been run in Supabase.</p>
      <p>${escapeHtml(error.message)}</p>
    </div>`;
    return;
  }

  homepageSettings = Object.fromEntries((data || []).map(row => [row.key, row.value]));
  sectionView.innerHTML = `
    <div class="admin-heading">
      <div><p class="eyebrow">Site settings</p><h1>Homepage images</h1>
      <p class="admin-count">Manage the four images shown on the public homepage.</p></div>
    </div>
    <form id="homepage-images-form" class="admin-panel admin-form">
      <div class="homepage-image-settings">
        ${homepageImageSettings.map(item => {
          const url = homepageSettings[item.key] || '';
          return `<section class="homepage-image-setting">
            <div>
              <h2>${escapeHtml(item.label)}</h2>
              <p>${escapeHtml(item.description)}</p>
              <p class="image-status" id="status-${item.key}">${url ? 'An image is currently saved. Choose a file to replace it.' : 'No image uploaded yet.'}</p>
              <label class="button admin-secondary upload-button">Choose image
                <input type="file" accept="image/jpeg,image/png,image/webp" id="file-${item.key}">
              </label>
            </div>
            <div class="homepage-image-preview" id="preview-${item.key}">
              ${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(item.label)} preview">` : '<span>No preview yet</span>'}
            </div>
          </section>`;
        }).join('')}
      </div>
      <div class="form-actions">
        <button class="button admin-primary" type="submit">Save homepage images</button>
        <p id="homepage-images-message" class="form-message" role="status"></p>
      </div>
    </form>`;

  homepageImageSettings.forEach(item => {
    const input = document.querySelector(`#file-${item.key}`);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      document.querySelector(`#status-${item.key}`).textContent = `${file.name} selected — it will upload when you save.`;
      const preview = document.querySelector(`#preview-${item.key}`);
      const localUrl = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${localUrl}" alt="${escapeHtml(item.label)} preview">`;
    });
  });

  document.querySelector('#homepage-images-form').addEventListener('submit', saveHomepageSettings);
}

async function saveHomepageSettings(event) {
  event.preventDefault();
  const message = document.querySelector('#homepage-images-message');
  message.textContent = 'Saving images…';
  const account = await getUserAndProfile();
  if (!account) {
    message.textContent = 'Your session has expired. Please sign in again.';
    return;
  }

  try {
    const rows = [];
    for (const item of homepageImageSettings) {
      const file = document.querySelector(`#file-${item.key}`).files?.[0];
      let url = homepageSettings[item.key] || null;
      if (file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`Please use a JPG, PNG, or WebP image for ${item.label}.`);
        }
        if (file.size > 8 * 1024 * 1024) {
          throw new Error(`${item.label} must be smaller than 8 MB.`);
        }
        const extension = file.name.split('.').pop().toLowerCase() || 'jpg';
        const path = `homepage/${account.user.id}/${item.key}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('site-images')
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        url = supabaseClient.storage.from('site-images').getPublicUrl(path).data.publicUrl;
      }

      if (url) {
        rows.push({ key: item.key, value: url, updated_at: new Date().toISOString(), updated_by: account.user.id });
      }
    }

    if (rows.length) {
      const { error } = await supabaseClient.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
    }

    message.textContent = 'Homepage images saved successfully.';
    await showHomepageSettings();
  } catch (error) {
    console.error(error);
    message.textContent = error.message || 'Could not save homepage images.';
  }
}

function renderRows(data, section) {
  if (!data.length) return `<div class="admin-empty">No ${labels[section].toLowerCase()} yet.</div>`;
  return data.map(item => `<article class="admin-list-item"><div><strong>${escapeHtml(titleFor(item, section))}</strong><span>${escapeHtml(metaFor(item, section))}</span></div><div class="admin-list-actions"><span class="admin-status">${item.published === false ? 'Draft' : 'Published'}</span><button class="button admin-secondary edit-item" data-id="${item.id}">Edit</button><button class="button admin-danger delete-item" data-id="${item.id}" aria-label="Delete ${escapeHtml(titleFor(item, section))}">Delete</button></div></article>`).join('');
}


function draftStorageKey(section, id = '') {
  return `madridArtHistoryDraft:${section}:${id || 'new'}`;
}

function readEditorDraft(section, id = '') {
  try {
    const raw = localStorage.getItem(draftStorageKey(section, id));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Could not read saved editor draft.', error);
    return null;
  }
}

function saveEditorDraft(section, id = '') {
  const form = document.querySelector('#editor-form');
  if (!form) return;
  const fields = {};
  form.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => {
    if (el.id === 'image-file' || el.type === 'file' || el.id === 'record-id') return;
    fields[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  try {
    localStorage.setItem(draftStorageKey(section, id), JSON.stringify(fields));
  } catch (error) {
    console.warn('Could not save editor draft.', error);
  }
}

function restoreEditorDraft(section, id = '') {
  const draft = readEditorDraft(section, id);
  if (!draft) return false;
  Object.entries(draft).forEach(([fieldId, value]) => {
    const el = document.getElementById(fieldId);
    if (!el || fieldId === 'record-id') return;
    if (el.type === 'checkbox') el.checked = Boolean(value);
    else el.value = value ?? '';
  });
  const status = document.querySelector('#image-status');
  if (status && document.querySelector('#image-file')?.files?.length === 0) {
    status.textContent = 'Draft restored. Re-select an image if you had chosen one.';
  }
  return true;
}

function clearEditorDraft(section, id = '') {
  try { localStorage.removeItem(draftStorageKey(section, id)); } catch (_) {}
}

function openEditor(section, id = null) {
  editorPanel.hidden = false;
  editorPanel.innerHTML = editorFormHtml(section);
  editorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const draftId = id || '';
  document.querySelector('#cancel-editor').addEventListener('click', () => {
    clearEditorDraft(section, draftId);
    editorPanel.hidden = true;
  });
  const form = document.querySelector('#editor-form');
  form.addEventListener('submit', saveEditor);
  form.addEventListener('input', () => saveEditorDraft(section, draftId));
  form.addEventListener('change', () => saveEditorDraft(section, draftId));
  document.querySelector('#image-file')?.addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) document.querySelector('#image-status').textContent = `${file.name} selected — it will upload when you save.`;
  });
  if (id) {
    loadEditor(section, id).then(() => restoreEditorDraft(section, draftId));
  } else {
    restoreEditorDraft(section, draftId);
  }
}

function field(id, label, type = 'text', required = false, options = null) {
  const req = required ? ' required' : '';
  if (type === 'textarea') return `<label>${label}${required ? ' *' : ''}<textarea id="${id}" rows="4"${req}></textarea></label>`;
  if (type === 'select') return `<label>${label}<select id="${id}"${req}>${options || ''}</select></label>`;
  return `<label>${label}${required ? ' *' : ''}<input id="${id}" type="${type}"${req}></label>`;
}
function languageField() {
  return field('language', 'Language', 'select', false, '<option value="">Not specified</option><option>English</option><option>Español</option><option>EN / ES</option>');
}
function baseFields(kind) {
  if (kind === 'exhibitions') return `
    ${field('title','Title','text',true)}${field('venue','Venue / gallery')}
    ${field('start-date','Start date','date',true)}${field('end-date','End date','date')}
    ${field('location','Location / address')}${languageField()}
    ${field('short-description','Short description','textarea')}${field('full-description','Full description','textarea')}
    ${field('official-website','Official website','url')}${field('additional-link','Additional link','url')}`;
  if (kind === 'conferences') return `
    ${field('title','Title','text',true)}${field('organizer','Organizer')}
    ${field('start-date','Start date','date',true)}${field('end-date','End date','date')}
    ${field('location','Location / address')}${languageField()}
    ${field('short-description','Short description','textarea')}${field('full-description','Full description','textarea')}
    ${field('program','Program','textarea')}${field('speakers','Speakers','textarea')}
    ${field('registration-info','Registration information','textarea')}${field('registration-link','Registration link','url')}
    ${field('official-website','Official website','url')}${field('additional-link','Additional link','url')}`;
  if (kind === 'activities') return `
    ${field('title','Title','text',true)}${field('start-date','Start date','date',true)}
    ${field('end-date','End date','date')}${field('start-time','Start time','time')}
    ${field('end-time','End time','time')}${field('location','Location / address')}
    ${field('meeting-point','Meeting point')}
    ${languageField()}${field('short-description','Short description','textarea')}
    ${field('full-description','Full description','textarea')}
    ${field('registration-required','Registration required','select',false,'<option value="false">No</option><option value="true">Yes</option>')}
    ${field('registration-link','Registration link','url')}${field('additional-link','Additional link','url')}`;
  if (kind === 'news') return `
    ${field('title','Title','text',true)}${field('author','Author')}
    ${field('excerpt','Short excerpt','textarea')}${field('full-article','Full article','textarea',true)}
    ${field('publication-date','Publication date','date',true)}${field('category','Category')}
    ${languageField()}${field('featured','Feature this story','select',false,'<option value="false">No</option><option value="true">Yes</option>')}
    ${field('additional-link','Additional link','url')}`;
  if (kind === 'courses') return `
    ${field('code','Course code')}${field('title','Course title','text',true)}
    ${field('level','Level','select',true,'<option value="">Choose level</option><option>Introductory</option><option>Intermediate</option><option>Advanced</option>')}
    ${field('short-description','Short description','textarea')}${field('full-description','Full description','textarea')}
    ${field('when-offered','When offered')}${field('credits','Credits','number')}
    ${field('prerequisites','Prerequisites')}${field('instructor','Instructor')}`;
  return `${field('name','Full name','text',true)}${field('position','Position / title')}
    ${field('short-bio','Short biography','textarea')}
    ${field('long-description','Full profile / research interests','textarea')}
    ${field('recent-publications','Recent publications (one per line)','textarea')}
    ${field('official-slu-profile-url','Official SLU profile link','url')}`;
}
function sharedBottomHtml(label, section) {
  const statusOptions = '<option value="">Automatic</option><option>Upcoming</option><option>Current</option><option>Past</option><option>Canceled</option>';
  return `<div class="upload-box"><div><strong>${label} image</strong><p id="image-status">No image selected. A default graphic will be used.</p></div><label class="button admin-secondary upload-button">Choose image<input id="image-file" type="file" accept="image/jpeg,image/png,image/webp"></label></div>
    <div class="form-grid two-col">${['exhibitions','conferences','activities'].includes(section) ? `<label>Status override<select id="status-override">${statusOptions}</select></label>` : ''}<label class="checkbox-label"><input id="published" type="checkbox"> Published</label></div>
    <div class="form-actions"><button class="button admin-primary" type="submit">Save</button><button id="cancel-editor" class="button admin-secondary" type="button">Cancel</button><p id="form-message" class="form-message" role="status"></p></div>`;
}
function editorFormHtml(section) {
  const label = itemLabel(section);
  return `<div class="admin-heading compact"><div><p class="eyebrow">${escapeHtml(labels[section])} editor</p><h2 id="editor-title">Add ${label}</h2></div></div><form id="editor-form" class="admin-form"><input id="record-id" type="hidden"><div class="form-grid two-col">${baseFields(section)}</div>${sharedBottomHtml(label, section)}</form>`;
}
function formFieldMap(section) {
  return ({
    exhibitions:['title','venue','start-date','end-date','location','language','short-description','full-description','official-website','additional-link','status-override'],
    conferences:['title','organizer','start-date','end-date','location','language','short-description','full-description','program','speakers','registration-info','registration-link','official-website','additional-link','status-override'],
    activities:['title','start-date','end-date','start-time','end-time','location','meeting-point','language','short-description','full-description','registration-required','registration-link','additional-link','status-override'],
    news:['title','author','excerpt','full-article','publication-date','category','language','featured','additional-link'],
    courses:['code','title','level','short-description','full-description','when-offered','credits','prerequisites','instructor'],
    faculty:['name','position','short-bio','long-description','recent-publications','official-slu-profile-url']
  })[section] || [];
}
function dbFieldName(id) {
  return ({
    'start-date':'start_date','end-date':'end_date','start-time':'start_time','end-time':'end_time',
    'short-description':'short_description','full-description':'full_description','official-website':'official_website',
    'additional-link':'additional_link','registration-info':'registration_info','registration-link':'registration_link',
    'status-override':'status_override','meeting-point':'meeting_point','registration-required':'registration_required',
    'publication-date':'publication_date','full-article':'article_content',
    'when-offered':'when_offered','short-bio':'short_description',
    'long-description':'long_description','recent-publications':'recent_publications',
    'official-slu-profile-url':'official_slu_profile_url'
  })[id] || id;
}
async function loadEditor(section, id) {
  const { data, error } = await supabaseClient.from(section).select('*').eq('id', id).single();
  if (error) { document.querySelector('#form-message').textContent = error.message; return; }
  formFieldMap(section).forEach(fieldId => {
    const el = document.querySelector('#' + fieldId);
    if (!el) return;
    const value = data[dbFieldName(fieldId)];
    if (el.tagName === 'SELECT' && ['registration-required','featured'].includes(fieldId)) el.value = String(value ?? false);
    else el.value = value ?? '';
  });
  document.querySelector('#record-id').value = data.id;
  document.querySelector('#published').checked = !!data.published;
  currentImageUrl = data.featured_image_url || '';
  document.querySelector('#image-status').textContent = currentImageUrl ? 'An image is already attached. Choose another to replace it.' : 'No image selected. A default graphic will be used.';
  document.querySelector('#editor-title').textContent = `Edit ${itemLabel(section)}`;
}

async function uploadImage(file, userId, section) {
  const extension = file.name.split('.').pop().toLowerCase() || 'jpg';
  const path = `${section}/${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabaseClient.storage.from('site-images').upload(path, file, { upsert:false, contentType:file.type });
  if (error) throw error;
  return supabaseClient.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

async function saveEditor(event) {
  event.preventDefault();
  const section = currentSection;
  const message = document.querySelector('#form-message');
  message.textContent = 'Saving…';
  const account = await getUserAndProfile();
  if (!account) { message.textContent = 'Your session has expired. Please sign in again.'; return; }
  try {
    const file = document.querySelector('#image-file')?.files[0];
    if (file) currentImageUrl = await uploadImage(file, account.user.id, section);
    const value = id => {
      const el = document.querySelector('#' + id);
      if (!el) return null;
      if (el.tagName === 'SELECT' && ['registration-required','featured'].includes(id)) return el.value === 'true';
      const raw = el.value.trim();
      if (id === 'credits') return raw === '' ? null : Number(raw);
      return raw || null;
    };
    const record = {};
    formFieldMap(section).forEach(fieldId => { record[dbFieldName(fieldId)] = value(fieldId); });
    record.featured_image_url = currentImageUrl || null;
    record.published = document.querySelector('#published').checked;
    if (['exhibitions','conferences','activities'].includes(section)) record.status_override = value('status-override');
    record.updated_at = new Date().toISOString();
    const id = document.querySelector('#record-id').value;
    const result = id ? await supabaseClient.from(section).update(record).eq('id', id) : await supabaseClient.from(section).insert(record);
    if (result.error) throw result.error;
    message.textContent = 'Saved successfully.';
    clearEditorDraft(section, id || '');
    await showSection(section);
    setTimeout(() => editorPanel.hidden = true, 400);
  } catch (error) {
    console.error(error);
    message.textContent = error.message || 'Could not save.';
  }
}

// Only rebuild the admin interface for explicit sign-in/sign-out changes.
// In this project, Supabase's visibility recovery can invoke the auth callback
// when the tab becomes active. Do not call refreshAuth for INITIAL_SESSION or
// token-refresh/recovery events: refreshAuth -> showSection hides the editor.
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    refreshAuth();
  }
});

// Initial page setup is handled here once, independently of visibility recovery.
refreshAuth();
