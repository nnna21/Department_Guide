/* ──────────────────────────────────────────────────────────────────────────
   Department Guide — Frontend Application
   ────────────────────────────────────────────────────────────────────────── */
'use strict';

/* ─── State ──────────────────────────────────────────────────────────────── */
let currentUser = null;   // { id, name, role }
let currentPage = 'home';

/* ─── Bootstrap ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  showPage('home');
});

/* ─── Session helpers ────────────────────────────────────────────────────── */
async function checkSession() {
  try {
    const data = await api('/api/auth/me');
    if (data.loggedIn) {
      currentUser = { id: data.id, name: data.name, role: data.role };
      applyAuthUI();
    }
  } catch (_) { /* ignore */ }
}

async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  clearAlert('loginAlert');
  if (!email || !password) { showAlert('loginAlert', 'Please fill in all fields.', 'error'); return; }

  try {
    const data = await api('/api/auth/login', 'POST', { email, password });
    currentUser = { id: data.id, name: data.name, role: data.role };
    applyAuthUI();
    closeLoginModal();
    toast(`Welcome back, ${data.name}!`, 'success');
    refreshCurrentPage();
  } catch (err) {
    showAlert('loginAlert', err.message || 'Login failed', 'error');
  }
}

async function logout() {
  await api('/api/auth/logout', 'POST').catch(() => {});
  currentUser = null;
  applyAuthUI();
  showPage('home');
  toast('Logged out.', 'info');
}

function applyAuthUI() {
  const badge = document.getElementById('userBadge');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminLink = document.getElementById('adminNavLink');

  if (currentUser) {
    badge.textContent = `${currentUser.name} (${currentUser.role})`;
    badge.style.display = '';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = '';
    adminLink.style.display = currentUser.role === 'admin' ? '' : 'none';

    // Show admin-only buttons
    document.querySelectorAll('[id$="Btn"]').forEach(btn => {
      if (['addNoticeBtn','addClassBtn','addProfBtn'].includes(btn.id)) {
        btn.style.display = currentUser.role === 'admin' ? '' : 'none';
      }
    });
    document.getElementById('uploadFileBtn').style.display = '';
  } else {
    badge.style.display = 'none';
    loginBtn.style.display = '';
    logoutBtn.style.display = 'none';
    adminLink.style.display = 'none';
    ['addNoticeBtn','addClassBtn','addProfBtn','uploadFileBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.getElementById('adminAppsSection').style.display = 'none';
    document.getElementById('adminComplaintsSection').style.display = 'none';
  }
}

/* ─── Page routing ───────────────────────────────────────────────────────── */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.getAttribute('onclick') && l.getAttribute('onclick').includes(`'${name}'`)) {
      l.classList.add('active');
    }
  });

  currentPage = name;
  document.getElementById('navLinks').classList.remove('open');

  switch (name) {
    case 'home':         loadHome();        break;
    case 'notices':      loadNotices();     break;
    case 'schedule':     loadSchedule();    break;
    case 'professors':   loadProfessors();  break;
    case 'files':        loadFiles();       break;
    case 'applications': loadApplicationsPage(); break;
    case 'complaints':   loadComplaintsPage();   break;
    case 'admin':        loadAdminPage();   break;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMenu() { document.getElementById('navLinks').classList.toggle('open'); }
function refreshCurrentPage() { showPage(currentPage); }

/* ─── Home ───────────────────────────────────────────────────────────────── */
async function loadHome() {
  // Stats
  const [notices, schedule, professors, files] = await Promise.all([
    api('/api/notices').catch(() => []),
    api('/api/schedule').catch(() => []),
    api('/api/professors').catch(() => []),
    api('/api/files').catch(() => [])
  ]);

  document.getElementById('statNotices').textContent = notices.length;
  document.getElementById('statClasses').textContent = schedule.length;
  document.getElementById('statProfs').textContent   = professors.length;
  document.getElementById('statFiles').textContent   = files.length;

  // Latest 3 notices
  const homeNotices = document.getElementById('homeNotices');
  if (!notices.length) {
    homeNotices.innerHTML = emptyState('No notices yet.');
  } else {
    homeNotices.innerHTML = `<div class="notice-list">${notices.slice(0,3).map(renderNoticeItem).join('')}</div>`;
  }

  // Today's schedule
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = schedule.filter(c => c.day_of_week === today);
  const homeSchedule = document.getElementById('homeSchedule');
  if (!todayClasses.length) {
    homeSchedule.innerHTML = `<div class="card"><p style="color:var(--text-muted);text-align:center;padding:20px">No classes scheduled for ${today}.</p></div>`;
  } else {
    homeSchedule.innerHTML = `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Course</th><th>Code</th><th>Professor</th><th>Room</th></tr></thead>
            <tbody>${todayClasses.map(c => `
              <tr>
                <td>${c.start_time} – ${c.end_time}</td>
                <td>${esc(c.course_name)}</td>
                <td><code>${esc(c.course_code)}</code></td>
                <td>${esc(c.professor_name || '—')}</td>
                <td>${esc(c.room)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }
}

/* ─── Notices ────────────────────────────────────────────────────────────── */
async function loadNotices() {
  const notices = await api('/api/notices').catch(() => []);
  const el = document.getElementById('noticesList');
  if (!notices.length) { el.innerHTML = emptyState('No notices yet.'); return; }

  el.innerHTML = `<div class="notice-list">${notices.map(n => renderNoticeItem(n, true)).join('')}</div>`;
}

function renderNoticeItem(n, showAdmin = false) {
  const adminActions = (showAdmin && currentUser?.role === 'admin') ? `
    <span style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-sm btn-outline" onclick="editNotice(${n.id})">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteNotice(${n.id})">Delete</button>
    </span>` : '';
  return `
    <div class="notice-item priority-${n.priority}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <span class="notice-title">${esc(n.title)}</span>
        <span class="badge badge-${n.priority}">${n.priority}</span>
      </div>
      <p class="notice-body">${esc(n.body)}</p>
      <div class="notice-meta">Posted by ${esc(n.author_name)} · ${formatDate(n.created_at)}${adminActions}</div>
    </div>`;
}

function openNoticeModal(id) {
  document.getElementById('noticeEditId').value = id || '';
  document.getElementById('noticeModalTitle').textContent = id ? 'Edit Notice' : 'Add Notice';
  document.getElementById('noticeTitle').value = '';
  document.getElementById('noticeBody').value  = '';
  document.getElementById('noticePriority').value = 'normal';
  document.getElementById('noticeModal').classList.remove('hidden');
}

async function editNotice(id) {
  const n = await api(`/api/notices/${id}`);
  document.getElementById('noticeEditId').value = id;
  document.getElementById('noticeModalTitle').textContent = 'Edit Notice';
  document.getElementById('noticeTitle').value = n.title;
  document.getElementById('noticeBody').value  = n.body;
  document.getElementById('noticePriority').value = n.priority;
  document.getElementById('noticeModal').classList.remove('hidden');
}

function closeNoticeModal() { document.getElementById('noticeModal').classList.add('hidden'); }

async function saveNotice() {
  const id    = document.getElementById('noticeEditId').value;
  const title = document.getElementById('noticeTitle').value.trim();
  const body  = document.getElementById('noticeBody').value.trim();
  const priority = document.getElementById('noticePriority').value;
  if (!title || !body) { toast('Title and body are required.', 'error'); return; }

  try {
    if (id) {
      await api(`/api/notices/${id}`, 'PUT', { title, body, priority });
    } else {
      await api('/api/notices', 'POST', { title, body, priority });
    }
    closeNoticeModal();
    loadNotices();
    toast('Notice saved.', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteNotice(id) {
  if (!confirm('Delete this notice?')) return;
  await api(`/api/notices/${id}`, 'DELETE');
  loadNotices();
  toast('Notice deleted.', 'success');
}

/* ─── Schedule ───────────────────────────────────────────────────────────── */
async function loadSchedule() {
  const day      = document.getElementById('filterDay').value;
  const semester = document.getElementById('filterSemester').value;
  const params   = new URLSearchParams();
  if (day)      params.set('day', day);
  if (semester) params.set('semester', semester);

  const schedule = await api(`/api/schedule?${params}`).catch(() => []);
  const body = document.getElementById('scheduleBody');
  const header = document.getElementById('scheduleActionsHeader');

  if (currentUser?.role === 'admin') header.style.display = '';
  else header.style.display = 'none';

  // Populate semester filter
  const semSelect = document.getElementById('filterSemester');
  if (semSelect.options.length === 1) {
    const allSems = [...new Set(schedule.map(c => c.semester))];
    allSems.forEach(s => semSelect.add(new Option(s, s)));
  }

  if (!schedule.length) {
    body.innerHTML = `<tr><td colspan="8">${emptyState('No classes found.')}</td></tr>`;
    return;
  }
  body.innerHTML = schedule.map(c => `
    <tr>
      <td><span class="day-pill">${esc(c.day_of_week)}</span></td>
      <td>${c.start_time} – ${c.end_time}</td>
      <td>${esc(c.course_name)}</td>
      <td><code>${esc(c.course_code)}</code></td>
      <td>${esc(c.professor_name || '—')}</td>
      <td>${esc(c.room)}</td>
      <td>${esc(c.semester)}</td>
      ${currentUser?.role === 'admin' ? `<td>
        <button class="btn btn-sm btn-outline" onclick="editClass(${c.id})">Edit</button>
        <button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="deleteClass(${c.id})">Del</button>
      </td>` : '<td style="display:none"></td>'}
    </tr>`).join('');
}

async function openClassModal() {
  await populateProfSelect();
  document.getElementById('classEditId').value = '';
  document.getElementById('classModalTitle').textContent = 'Add Class';
  ['className','classCode','classRoom','classSemester'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('classStart').value = '08:00';
  document.getElementById('classEnd').value   = '10:00';
  document.getElementById('classModal').classList.remove('hidden');
}

async function editClass(id) {
  await populateProfSelect();
  const c = await api(`/api/schedule/${id}`);
  document.getElementById('classEditId').value    = id;
  document.getElementById('classModalTitle').textContent = 'Edit Class';
  document.getElementById('className').value      = c.course_name;
  document.getElementById('classCode').value      = c.course_code;
  document.getElementById('classProfessor').value = c.professor_id || '';
  document.getElementById('classRoom').value      = c.room;
  document.getElementById('classDay').value       = c.day_of_week;
  document.getElementById('classSemester').value  = c.semester;
  document.getElementById('classStart').value     = c.start_time;
  document.getElementById('classEnd').value       = c.end_time;
  document.getElementById('classModal').classList.remove('hidden');
}

function closeClassModal() { document.getElementById('classModal').classList.add('hidden'); }

async function saveClass() {
  const id = document.getElementById('classEditId').value;
  const payload = {
    course_name:  document.getElementById('className').value.trim(),
    course_code:  document.getElementById('classCode').value.trim(),
    professor_id: document.getElementById('classProfessor').value || null,
    room:         document.getElementById('classRoom').value.trim(),
    day_of_week:  document.getElementById('classDay').value,
    semester:     document.getElementById('classSemester').value.trim(),
    start_time:   document.getElementById('classStart').value,
    end_time:     document.getElementById('classEnd').value
  };
  try {
    if (id) await api(`/api/schedule/${id}`, 'PUT', payload);
    else    await api('/api/schedule', 'POST', payload);
    closeClassModal();
    loadSchedule();
    toast('Schedule updated.', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteClass(id) {
  if (!confirm('Delete this class entry?')) return;
  await api(`/api/schedule/${id}`, 'DELETE');
  loadSchedule();
  toast('Entry deleted.', 'success');
}

async function populateProfSelect() {
  const sel = document.getElementById('classProfessor');
  if (sel.options.length > 1) return;
  const profs = await api('/api/professors').catch(() => []);
  profs.forEach(p => sel.add(new Option(p.name, p.id)));
}

/* ─── Professors ─────────────────────────────────────────────────────────── */
async function loadProfessors() {
  const profs = await api('/api/professors').catch(() => []);
  const grid = document.getElementById('professorGrid');
  if (!profs.length) { grid.innerHTML = emptyState('No faculty members found.'); return; }
  grid.innerHTML = profs.map(p => renderProfCard(p)).join('');
}

function renderProfCard(p, showActions = true) {
  const initials = p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const adminActions = (showActions && currentUser?.role === 'admin') ? `
    <div style="margin-top:14px;display:flex;gap:8px">
      <button class="btn btn-sm btn-outline" onclick="editProf(${p.id})">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteProf(${p.id})">Delete</button>
    </div>` : '';
  return `
    <div class="prof-card">
      <div class="prof-avatar">${initials}</div>
      <div class="prof-name">${esc(p.name)}</div>
      ${p.email  ? `<div class="prof-info">✉️ <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>` : ''}
      ${p.phone  ? `<div class="prof-info">📞 ${esc(p.phone)}</div>` : ''}
      ${p.office ? `<div class="prof-info">🚪 ${esc(p.office)}</div>` : ''}
      ${adminActions}
    </div>`;
}

function openProfModal() {
  document.getElementById('profEditId').value = '';
  document.getElementById('profModalTitle').textContent = 'Add Faculty';
  ['profName','profEmail','profPhone','profOffice','profPassword'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('profPasswordGroup').style.display = '';
  document.getElementById('profModal').classList.remove('hidden');
}

async function editProf(id) {
  const p = await api(`/api/professors/${id}`);
  document.getElementById('profEditId').value = id;
  document.getElementById('profModalTitle').textContent = 'Edit Faculty';
  document.getElementById('profName').value   = p.name;
  document.getElementById('profEmail').value  = p.email;
  document.getElementById('profPhone').value  = p.phone  || '';
  document.getElementById('profOffice').value = p.office || '';
  document.getElementById('profPasswordGroup').style.display = 'none';
  document.getElementById('profModal').classList.remove('hidden');
}

function closeProfModal() { document.getElementById('profModal').classList.add('hidden'); }

async function saveProf() {
  const id = document.getElementById('profEditId').value;
  const payload = {
    name:     document.getElementById('profName').value.trim(),
    email:    document.getElementById('profEmail').value.trim(),
    phone:    document.getElementById('profPhone').value.trim(),
    office:   document.getElementById('profOffice').value.trim(),
    password: document.getElementById('profPassword').value
  };
  if (!payload.name || !payload.email) { toast('Name and email are required.', 'error'); return; }
  if (!id && !payload.password) { toast('Password is required for new faculty.', 'error'); return; }
  if (!id && payload.password.length < 6) { toast('Password must be at least 6 characters.', 'error'); return; }

  try {
    if (id) await api(`/api/professors/${id}`, 'PUT', payload);
    else    await api('/api/professors', 'POST', payload);
    closeProfModal();
    loadProfessors();
    if (currentPage === 'admin') loadAdminProfGrid();
    toast('Faculty saved.', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteProf(id) {
  if (!confirm('Delete this faculty member?')) return;
  await api(`/api/professors/${id}`, 'DELETE');
  loadProfessors();
  if (currentPage === 'admin') loadAdminProfGrid();
  toast('Faculty removed.', 'success');
}

/* ─── Files ──────────────────────────────────────────────────────────────── */
async function loadFiles() {
  const cat = document.getElementById('filterFileCategory').value;
  const url = cat ? `/api/files?category=${encodeURIComponent(cat)}` : '/api/files';
  const files = await api(url).catch(() => []);
  const el = document.getElementById('filesList');

  if (!files.length) { el.innerHTML = emptyState('No files uploaded yet.'); return; }
  el.innerHTML = `<div class="file-list">${files.map(f => renderFileItem(f)).join('')}</div>`;
}

function renderFileItem(f) {
  const icon = fileIcon(f.mime_type);
  const size = formatBytes(f.file_size);
  const deleteBtn = currentUser ? `<button class="btn btn-sm btn-danger" onclick="deleteFile(${f.id})">Delete</button>` : '';
  return `
    <div class="file-item">
      <div class="file-icon">${icon}</div>
      <div class="file-info">
        <div class="file-name">${esc(f.title)}</div>
        <div class="file-meta">${esc(f.original_name)} · ${size} · ${esc(f.category)} · by ${esc(f.uploader_name)} · ${formatDate(f.created_at)}</div>
        ${f.description ? `<div class="file-meta" style="margin-top:2px">${esc(f.description)}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
        <a class="btn btn-sm btn-primary" href="/api/files/${f.id}/download">⬇ Download</a>
        ${deleteBtn}
      </div>
    </div>`;
}

function openUploadModal() {
  ['fileTitle','fileDescription'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fileCategory').value = 'general';
  document.getElementById('fileInput').value = '';
  document.getElementById('selectedFileName').textContent = '';
  document.getElementById('uploadModal').classList.remove('hidden');
}
function closeUploadModal() { document.getElementById('uploadModal').classList.add('hidden'); }

function onFileSelected(input) {
  const name = input.files[0]?.name || '';
  document.getElementById('selectedFileName').textContent = name;
}

async function uploadFile() {
  const title   = document.getElementById('fileTitle').value.trim();
  const desc    = document.getElementById('fileDescription').value.trim();
  const cat     = document.getElementById('fileCategory').value;
  const fileInp = document.getElementById('fileInput');
  if (!title)            { toast('Title is required.', 'error'); return; }
  if (!fileInp.files[0]) { toast('Please select a file.', 'error'); return; }

  const fd = new FormData();
  fd.append('title', title);
  fd.append('description', desc);
  fd.append('category', cat);
  fd.append('file', fileInp.files[0]);

  try {
    const res = await fetch('/api/files', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    closeUploadModal();
    loadFiles();
    toast('File uploaded.', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteFile(id) {
  if (!confirm('Delete this file?')) return;
  await api(`/api/files/${id}`, 'DELETE');
  loadFiles();
  toast('File deleted.', 'success');
}

/* ─── Applications ───────────────────────────────────────────────────────── */
function loadApplicationsPage() {
  if (currentUser?.role === 'admin') {
    document.getElementById('adminAppsSection').style.display = '';
    loadAdminItems('applications');
  }
}

async function submitApplication() {
  const payload = {
    applicant_name:  document.getElementById('appName').value.trim(),
    applicant_email: document.getElementById('appEmail').value.trim(),
    type:            document.getElementById('appType').value,
    subject:         document.getElementById('appSubject').value.trim(),
    body:            document.getElementById('appBody').value.trim()
  };
  clearAlert('appFormAlert');
  if (!payload.applicant_name || !payload.applicant_email || !payload.subject || !payload.body) {
    showAlert('appFormAlert', 'Please fill in all fields.', 'error'); return;
  }
  try {
    await api('/api/applications', 'POST', payload);
    showAlert('appFormAlert', 'Application submitted successfully! Keep your email to check status.', 'success');
    ['appName','appEmail','appSubject','appBody'].forEach(id => document.getElementById(id).value = '');
  } catch (err) { showAlert('appFormAlert', err.message, 'error'); }
}

async function checkApplications() {
  const email = document.getElementById('appCheckEmail').value.trim();
  if (!email) { toast('Enter your email address.', 'error'); return; }
  const apps = await api(`/api/applications?email=${encodeURIComponent(email)}`).catch(() => []);
  const el = document.getElementById('appStatusList');
  if (!apps.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">No applications found for that email.</p>'; return; }
  el.innerHTML = apps.map(a => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-weight:600;font-size:.9rem">${esc(a.subject)}</div>
      <div style="font-size:.8rem;color:var(--text-muted);margin-top:3px">${esc(a.type.replace(/_/g,' '))} · ${formatDate(a.created_at)}</div>
      <div style="margin-top:4px"><span class="badge badge-${a.status}">${a.status}</span></div>
      ${a.admin_notes ? `<div style="margin-top:6px;font-size:.82rem;color:var(--text-muted)">Note: ${esc(a.admin_notes)}</div>` : ''}
    </div>`).join('');
}

/* ─── Complaints ─────────────────────────────────────────────────────────── */
function loadComplaintsPage() {
  if (currentUser?.role === 'admin') {
    document.getElementById('adminComplaintsSection').style.display = '';
    loadAdminItems('complaints');
  }
}

async function submitComplaint() {
  const payload = {
    reporter_name:  document.getElementById('complaintName').value.trim(),
    reporter_email: document.getElementById('complaintEmail').value.trim(),
    category:       document.getElementById('complaintCategory').value,
    subject:        document.getElementById('complaintSubject').value.trim(),
    description:    document.getElementById('complaintDesc').value.trim()
  };
  clearAlert('complaintFormAlert');
  if (!payload.reporter_name || !payload.reporter_email || !payload.subject || !payload.description) {
    showAlert('complaintFormAlert', 'Please fill in all fields.', 'error'); return;
  }
  try {
    await api('/api/complaints', 'POST', payload);
    showAlert('complaintFormAlert', 'Complaint submitted. You can track its status using your email.', 'success');
    ['complaintName','complaintEmail','complaintSubject','complaintDesc'].forEach(id => document.getElementById(id).value = '');
  } catch (err) { showAlert('complaintFormAlert', err.message, 'error'); }
}

async function checkComplaints() {
  const email = document.getElementById('complaintCheckEmail').value.trim();
  if (!email) { toast('Enter your email address.', 'error'); return; }
  const complaints = await api(`/api/complaints?email=${encodeURIComponent(email)}`).catch(() => []);
  const el = document.getElementById('complaintStatusList');
  if (!complaints.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem">No complaints found for that email.</p>'; return; }
  el.innerHTML = complaints.map(c => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-weight:600;font-size:.9rem">${esc(c.subject)}</div>
      <div style="font-size:.8rem;color:var(--text-muted);margin-top:3px">${esc(c.category)} · ${formatDate(c.created_at)}</div>
      <div style="margin-top:4px"><span class="badge badge-${c.status}">${c.status.replace('_',' ')}</span></div>
      ${c.admin_notes ? `<div style="margin-top:6px;font-size:.82rem;color:var(--text-muted)">Note: ${esc(c.admin_notes)}</div>` : ''}
    </div>`).join('');
}

/* ─── Admin page ─────────────────────────────────────────────────────────── */
let activeAdminTab = 'applications';

function adminTab(tab) {
  activeAdminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('[id^="adminTab-"]').forEach(t => t.style.display = 'none');
  event.target.classList.add('active');
  document.getElementById(`adminTab-${tab}`).style.display = '';

  if (tab === 'applications') loadAdminAllApps();
  else if (tab === 'complaints') loadAdminAllComplaints();
  else if (tab === 'users') loadAdminProfGrid();
}

async function loadAdminPage() {
  if (!currentUser || currentUser.role !== 'admin') {
    showPage('home'); return;
  }
  loadAdminAllApps();
}

async function loadAdminAllApps() {
  const apps = await api('/api/applications').catch(() => []);
  const el = document.getElementById('adminAllApps');
  if (!apps.length) { el.innerHTML = emptyState('No applications yet.'); return; }
  el.innerHTML = renderAdminItemsTable(apps, 'applications');
}

async function loadAdminAllComplaints() {
  const complaints = await api('/api/complaints').catch(() => []);
  const el = document.getElementById('adminAllComplaints');
  if (!complaints.length) { el.innerHTML = emptyState('No complaints yet.'); return; }
  el.innerHTML = renderAdminItemsTable(complaints, 'complaints');
}

async function loadAdminProfGrid() {
  const profs = await api('/api/professors').catch(() => []);
  const grid = document.getElementById('adminProfGrid');
  if (!profs.length) { grid.innerHTML = emptyState('No faculty yet.'); return; }
  grid.innerHTML = profs.map(p => renderProfCard(p, true)).join('');
}

function renderAdminItemsTable(items, type) {
  const isApp = type === 'applications';
  const nameField = isApp ? 'applicant_name' : 'reporter_name';
  const emailField = isApp ? 'applicant_email' : 'reporter_email';
  const typeField = isApp ? 'type' : 'category';
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Email</th>
            <th>${isApp ? 'Type' : 'Category'}</th>
            <th>Subject</th><th>Status</th><th>Date</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.id}</td>
              <td>${esc(item[nameField])}</td>
              <td>${esc(item[emailField])}</td>
              <td>${esc(item[typeField]?.replace(/_/g,' ') || '')}</td>
              <td>${esc(item.subject)}</td>
              <td><span class="badge badge-${item.status}">${item.status.replace('_',' ')}</span></td>
              <td>${formatDate(item.created_at)}</td>
              <td><button class="btn btn-sm btn-outline" onclick="openStatusModal('${type}',${item.id},'${item.status}',${JSON.stringify(item.admin_notes||'').replace(/</g,'\\u003c')})">Update</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* Also used from complaints/applications page */
async function loadAdminItems(type) {
  if (type === 'applications') loadAdminAppsInline();
  else loadAdminComplaintsInline();
}

async function loadAdminAppsInline() {
  const apps = await api('/api/applications').catch(() => []);
  const el = document.getElementById('adminAppsList');
  if (!apps.length) { el.innerHTML = emptyState('No applications yet.'); return; }
  el.innerHTML = renderAdminItemsTable(apps, 'applications');
}

async function loadAdminComplaintsInline() {
  const complaints = await api('/api/complaints').catch(() => []);
  const el = document.getElementById('adminComplaintsList');
  if (!complaints.length) { el.innerHTML = emptyState('No complaints yet.'); return; }
  el.innerHTML = renderAdminItemsTable(complaints, 'complaints');
}

/* ─── Status modal ───────────────────────────────────────────────────────── */
function openStatusModal(type, id, currentStatus, currentNotes) {
  document.getElementById('statusItemType').value = type;
  document.getElementById('statusItemId').value   = id;
  document.getElementById('statusNotes').value    = currentNotes || '';
  document.getElementById('statusModalTitle').textContent = `Update ${type === 'applications' ? 'Application' : 'Complaint'} Status`;

  const sel = document.getElementById('statusSelect');
  sel.innerHTML = '';
  const opts = type === 'applications'
    ? ['pending','reviewed','approved','rejected']
    : ['open','in_progress','resolved','closed'];
  opts.forEach(o => {
    const opt = new Option(o.replace('_',' '), o);
    if (o === currentStatus) opt.selected = true;
    sel.add(opt);
  });
  document.getElementById('statusModal').classList.remove('hidden');
}
function closeStatusModal() { document.getElementById('statusModal').classList.add('hidden'); }

async function saveStatus() {
  const type  = document.getElementById('statusItemType').value;
  const id    = document.getElementById('statusItemId').value;
  const status = document.getElementById('statusSelect').value;
  const admin_notes = document.getElementById('statusNotes').value.trim();

  try {
    await api(`/api/${type}/${id}`, 'PUT', { status, admin_notes });
    closeStatusModal();
    toast('Status updated.', 'success');
    if (type === 'applications') { loadAdminAllApps(); loadAdminAppsInline(); }
    else                        { loadAdminAllComplaints(); loadAdminComplaintsInline(); }
  } catch (err) { toast(err.message, 'error'); }
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
async function api(url, method = 'GET', body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(1)} MB`;
}

function fileIcon(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/'))       return '🖼️';
  if (mime.startsWith('video/'))       return '🎥';
  if (mime.startsWith('audio/'))       return '🎵';
  if (mime.includes('pdf'))            return '📕';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel'))   return '📊';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📽️';
  if (mime.includes('zip') || mime.includes('archive'))   return '🗜️';
  return '📄';
}

function emptyState(msg) {
  return `<div class="empty-state">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <p>${msg}</p>
  </div>`;
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="alert alert-${type}">${esc(msg)}</div>`;
}
function clearAlert(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '';
}

/* ─── Login modal ────────────────────────────────────────────────────────── */
function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('loginEmail').focus(), 50);
}
function closeLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }
function closeLoginIfBackdrop(e) { if (e.target.classList.contains('modal-backdrop')) closeLoginModal(); }

// Allow Enter key in login form
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLoginModal();
    closeNoticeModal();
    closeClassModal();
    closeProfModal();
    closeUploadModal();
    closeStatusModal();
  }
});

/* ─── Drag and drop upload ───────────────────────────────────────────────── */
const uploadZone = document.getElementById('uploadZone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('fileInput').files = dt.files;
      document.getElementById('selectedFileName').textContent = file.name;
    }
  });
}
