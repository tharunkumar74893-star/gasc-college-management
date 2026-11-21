/* GASC College Management System - Supabase-connected frontend */
(() => {
  'use strict';

  const DEPTS = ['B.A. Tamil', 'B.A. English', 'B.Sc. Computer Science', 'B.Sc. Mathematics', 'B.Com. Commerce'];
  const IMAGES = ['images/campus-front-1.jpg', 'images/campus-front-2.jpg', 'images/campus-side-view.jpg', 'images/campus-entrance.jpg'];
  const DEFAULT_CMS = {
    collegeName: 'GASC Melvengatapuram', heroTitle: 'Learn Today.', heroSubtitle: 'Lead Tomorrow.',
    heroText: 'A place to learn, grow and achieve your dreams with quality education and holistic development.',
    aboutText: 'GASC, Melvengatapuram is committed to providing quality education, encouraging curiosity and helping students build a strong foundation for tomorrow.',
    vision: 'To create a centre of academic excellence and social responsibility.',
    mission: 'To empower students with knowledge, skills, confidence and values.', phone: '+91 98765 43210',
    email: 'gasc@college.ac.in', address: 'Melvengatapuram, Ranipet, Tamil Nadu',
    facilitiesText: 'Library, learning spaces and campus facilities that support student development.',
    activitiesText: 'Sports, NSS, cultural activities and student events.', slides: IMAGES, departments: {}
  };

  const FACE_MATCH_THRESHOLD = 0.55;
  const FACE_MODEL_URL = './models';
  let faceModelsReady = false;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (el, msg, error = false) => { if (el) { el.textContent = msg; el.classList.toggle('error', error); } };
  const sb = window.supabase?.createClient(window.GASC_SUPABASE_URL, window.GASC_SUPABASE_ANON_KEY);
  if (sb) window.supabaseClient = sb;
  let currentProfile = null;
  let cmsCache = {...DEFAULT_CMS};

  if (!sb) console.error('Supabase client not loaded. Check config.js and the Supabase CDN script.');

  async function ensureFaceApiReady() {
    if (!window.faceapi) {
      throw new Error('face-api.js (v0.22.2) is not loaded on this page.');
    }
    if (!faceModelsReady) {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL)
      ]);
      faceModelsReady = true;
    }
  }

  async function captureLiveFaceDescriptor(videoEl) {
    await ensureFaceApiReady();
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.65 });
    const detections = await faceapi.detectAllFaces(videoEl, opts).withFaceLandmarks().withFaceDescriptors();
    if (!detections || detections.length === 0) {
      throw new Error('No face detected. Please face the camera in good lighting.');
    }
    if (detections.length > 1) {
      throw new Error('Multiple faces detected. Only one student should be in view.');
    }
    return detections[0].descriptor;
  }

  async function syncPendingFaceDescriptorToProfile(userId) {
    try {
      const raw = sessionStorage.getItem('gasc_pending_face_descriptor');
      if (!raw || !userId) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length !== 128) return;
      await sb.from('profiles').update({
        face_descriptor: parsed,
        face_verified: true,
        face_enrolled_at: new Date().toISOString()
      }).eq('id', userId);
      sessionStorage.removeItem('gasc_pending_face_descriptor');
    } catch (e) {
      console.warn('Could not sync pending face descriptor:', e);
    }
  }

  function header() {
    const h = $('#header'); if (!h) return;
    h.innerHTML = `<div class="topbar"><span>☎ +91 98765 43210　 ✉ gasc@college.ac.in</span><span>⌖ Melvengatapuram, Ranipet</span></div><header class="site-header"><a class="brand" href="index.html"><span class="brand-mark">GASC</span><span>GASC<small>MELVENGATAPURAM</small></span></a><button class="menu-btn" id="menu-btn" type="button">☰</button><nav class="nav" id="nav"><a href="index.html">Home</a><a href="about.html">About</a><a href="departments.html">Departments</a><a href="facilities.html">Facilities</a><a href="activities.html">Activities</a><a href="gallery.html">Gallery</a><a href="notices.html">Notice Board</a><a href="contact.html">Contact</a><a class="nav-login" href="login.html">Portal Login</a></nav></header>`;
    $('#menu-btn')?.addEventListener('click', () => $('#nav')?.classList.toggle('open'));
  }
  function footer() {
    const f = $('#footer'); if (!f) return;
    f.innerHTML = `<footer class="footer"><div class="footer-grid"><div><h2>GASC<br><small>Melvengatapuram</small></h2><i>Educate · Empower · Excel</i></div><div><h3>Quick Links</h3><a href="index.html">Home</a><a href="about.html">About College</a><a href="departments.html">Departments</a><a href="gallery.html">Gallery</a></div><div><h3>Contact Us</h3><p>☎ +91 98765 43210</p><p>✉ gasc@college.ac.in</p><p>⌖ Melvengatapuram, Ranipet</p></div><div><h3>Portal</h3><a href="login.html">Login</a><a href="register.html">Register</a><a href="notices.html">Notice Board</a></div></div><div class="copyright"><span>© 2026 GASC Melvengatapuram. All rights reserved.</span><span>Designed for Education</span></div></footer>`;
  }

  async function loadCMS() {
    try {
      const {data, error} = await sb.from('site_content').select('content').eq('content_key', 'homepage').maybeSingle();
      if (!error && data?.content) cmsCache = {...DEFAULT_CMS, ...data.content};
    } catch (e) { console.warn('Using default website content', e); }
    return cmsCache;
  }
  function applyCMS() {
    const c = cmsCache;
    const title = $('#hero-title'); if (title) title.innerHTML = `${esc(c.heroTitle)}<br><em>${esc(c.heroSubtitle)}</em>`;
    const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = value || ''; };
    setText('#hero-text', c.heroText); setText('#about-copy', c.aboutText); setText('#vision-copy', c.vision);
    setText('#mission-copy', c.mission); setText('#facilitiesText-copy', c.facilitiesText); setText('#activitiesText-copy', c.activitiesText);
    $$('[data-cms="phone"]').forEach(x => x.textContent = c.phone || '');
    $$('[data-cms="email"]').forEach(x => x.textContent = c.email || '');
    $$('[data-cms="address"]').forEach(x => x.textContent = c.address || '');
  }
  function deptCards(target) {
    if (!target) return;
    target.innerHTML = DEPTS.map((d, i) => `<article class="dept-card"><div class="dept-photo">${['📚','📖','💻','📐','📊'][i]}</div><h3>${esc(d)}</h3><p>Undergraduate programme</p><a class="btn navy" href="department.html?name=${encodeURIComponent(d)}">View Details →</a></article>`).join('');
  }
  function slider() {
    const bg = $('#hero-bg'), dots = $('#hero-dots'); if (!bg) return;
    let i = 0; const slides = Array.isArray(cmsCache.slides) && cmsCache.slides.length ? cmsCache.slides : IMAGES;
    const show = n => { i = (n + slides.length) % slides.length; bg.style.backgroundImage = `url('${slides[i]}')`;
      if (dots) { dots.innerHTML = slides.map((_, j) => `<button class="${j===i?'active':''}" aria-label="Slide ${j+1}" data-slide="${j}"></button>`).join(''); $$('button', dots).forEach(b => b.onclick = () => show(+b.dataset.slide)); }
    };
    $('#prev-slide')?.addEventListener('click', () => show(i - 1)); $('#next-slide')?.addEventListener('click', () => show(i + 1)); show(0); setInterval(() => show(i + 1), 5000);
  }
  async function renderNotices(target, limit = 4) {
    if (!target) return;
    target.innerHTML = '<p class="muted">Loading notices…</p>';
    const {data, error} = await sb.from('notices').select('title,body,notice_date').eq('is_published', true).order('notice_date', {ascending:false}).limit(limit);
    if (error) { target.innerHTML = '<p class="empty">Unable to load notices right now.</p>'; console.error(error); return; }
    target.innerHTML = (data || []).map(n => `<div class="notice-item"><span class="date-box">${esc(n.notice_date || 'NEW')}</span><p><strong>${esc(n.title)}</strong>${n.body ? `<br><small>${esc(n.body)}</small>` : ''}</p></div>`).join('') || '<p class="empty">No notices published.</p>';
  }

  async function uploadProfilePhoto(file, userId) {
    if (!file || !file.size) return null;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Photo must be JPG, PNG or WEBP.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Photo size must be 5 MB or less.');
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const {error} = await sb.storage.from('profile-photos').upload(path, file, {upsert:true, contentType:file.type});
    if (error) throw error;
    return path;
  }

  function registration() {
    const form = $('#registration-form'); if (!form) return;
    form.addEventListener('submit', async e => {
      e.preventDefault(); const msg = $('#reg-msg'); const button = $('button[type="submit"]', form) || $('button:not([type])', form);
      const fd = new FormData(form), password = String(fd.get('password') || ''), confirm = String(fd.get('confirmPassword') || '');
      if (password !== confirm) return say(msg, 'Passwords do not match.', true);
      if (password.length < 6) return say(msg, 'Password must contain at least 6 characters.', true);
      const role = form.dataset.role;
      if (!['student','faculty','hod'].includes(role)) return say(msg, 'Invalid registration role.', true);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const photo = fd.get('photo'); const metadata = {};
      for (const [key, value] of fd.entries()) if (!['password','confirmPassword','photo','email'].includes(key) && typeof value === 'string') metadata[key] = value;
      metadata.role = role;
      if (button) button.disabled = true; say(msg, 'Creating your account…');
      try {
        const {data, error} = await sb.auth.signUp({email, password, options:{data:metadata}});
        if (error) throw error;
        const user = data.user; if (!user) throw new Error('Account could not be created. Please try again.');
        if (data.session) {
          await syncPendingFaceDescriptorToProfile(user.id);
        }
        if (metadata.bloodGroup && data.session) {
          const {error: bloodError} = await sb.from('profiles').update({blood_group: metadata.bloodGroup}).eq('id', user.id);
          if (bloodError) throw bloodError;
        }
        if (photo && photo.size) {
          if (!data.session) throw new Error('Account created, but photo upload needs an active session. Please log in and upload your photo later.');
          const photoPath = await uploadProfilePhoto(photo, user.id);
          const {error: updateError} = await sb.from('profiles').update({photo_path:photoPath}).eq('id', user.id);
          if (updateError) throw updateError;
        }
        if (role === 'student') {
          if (data.session) location.href = 'student-dashboard.html';
          else say(msg, 'Registration successful. Please log in to continue.');
        } else {
          if (data.session) await sb.auth.signOut();
          say(msg, 'Registration submitted successfully. Your account will be available after Admin approval.'); form.reset();
        }
      } catch (err) { console.error(err); say(msg, err.message || 'Registration failed. Please try again.', true); }
      finally { if (button) button.disabled = false; }
    });
  }

  function login() {
    const form = $('#login-form'); if (!form) return;
    $('#show-password')?.addEventListener('change', e => { $('#login-password').type = e.target.checked ? 'text' : 'password'; });
    form.addEventListener('submit', async e => {
      e.preventDefault(); const msg = $('#login-msg'), button = $('button[type="submit"]', form) || $('button:not([type])', form);
      const email = String(form.elements.email.value).trim().toLowerCase(), password = form.elements.password.value;
      if (button) button.disabled = true; say(msg, 'Signing in…');
      try {
        const {data, error} = await sb.auth.signInWithPassword({email, password});
        if (error) throw error;
        if (data.user?.id) await syncPendingFaceDescriptorToProfile(data.user.id);
        const {data:profile, error:profileError} = await sb.from('profiles').select('*').eq('id', data.user.id).single();
        if (profileError) throw new Error('Profile could not be loaded. Contact the college administrator.');
        if (profile.status !== 'active') { await sb.auth.signOut(); throw new Error(profile.status === 'rejected' ? 'Your registration was not approved. Contact the Admin.' : 'Your account is waiting for Admin approval.'); }
        const target = profile.role === 'admin' ? 'admin-dashboard.html' : `${profile.role}-dashboard.html`;
        if (!['admin','student','faculty','hod'].includes(profile.role)) throw new Error('Your account role is not configured.');
        location.href = target;
      } catch (err) { console.error(err); say(msg, err.message || 'Email or password is incorrect.', true); }
      finally { if (button) button.disabled = false; }
    });
  }

  async function getCurrentProfile() {
    const {data:{user}, error} = await sb.auth.getUser(); if (error || !user) return null;
    await syncPendingFaceDescriptorToProfile(user.id);
    const {data, error:profileError} = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (profileError) throw profileError; return data;
  }
  async function photoUrl(path) {
    if (!path) return 'images/campus-entrance.jpg';
    const {data, error} = await sb.storage.from('profile-photos').createSignedUrl(path, 3600);
    return !error && data?.signedUrl ? data.signedUrl : 'images/campus-entrance.jpg';
  }
  function table(rows) { return `<table class="data-table"><tbody>${rows.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1] || '—')}</td></tr>`).join('')}</tbody></table>`; }
  const statusPill = status => `<span class="pill">${esc(status || '')}</span>`;

  async function dashboard() {
    const root = $('#dashboard-content'); if (!root) return;
    const requiredRole = document.body.dataset.page.replace('-dashboard','');
    try {
      currentProfile = await getCurrentProfile();
      if (!currentProfile) { location.href = 'login.html'; return; }
      if (currentProfile.status !== 'active') { await sb.auth.signOut(); location.href = 'login.html'; return; }
      if (currentProfile.role !== requiredRole) { location.href = currentProfile.role === 'admin' ? 'admin-dashboard.html' : `${currentProfile.role}-dashboard.html`; return; }
      if (requiredRole === 'admin') await adminDashboard(root);
      else await staffOrStudentDashboard(root, requiredRole);
      await renderManagementModules(root, requiredRole);
    } catch (err) { console.error(err); root.innerHTML = `<div class="dash-panel"><p class="error">Unable to load dashboard: ${esc(err.message)}</p></div>`; }
  }

  async function staffOrStudentDashboard(root, role) {
    const u = currentProfile, avatar = await photoUrl(u.photo_path);
    if (role === 'student') {
      root.innerHTML = `<div class="profile-banner"><img class="avatar" src="${avatar}" alt="Student profile photo"><div><span class="eyebrow">STUDENT PROFILE</span><h2>${esc(u.name)}</h2><p>${esc(u.department)} · ${esc(u.email)}</p>${statusPill('Active Student')}</div></div><div class="stat-grid"><div class="stat"><strong>${esc(u.roll_number || '—')}</strong><span>Roll Number</span></div><div class="stat"><strong>${esc(u.semester || '—')}</strong><span>Current Semester</span></div><div class="stat"><strong>${esc(u.academic_year || '—')}</strong><span>Academic Year</span></div><div class="stat"><strong>—</strong><span>Attendance</span></div></div><div class="dash-panel"><h2>Personal Details</h2>${table([['Name',u.name],['Date of birth',u.dob],['Gender',u.gender],['Roll Number',u.roll_number],['University Registration Number',u.university_reg_no],['Degree',u.degree],['Department',u.department],['Semester',u.semester],['Academic Year',u.academic_year],['Admission Year',u.admission_year],['Mobile',u.mobile],['Email',u.email],['Father Name',u.father_name],['Mother Name',u.mother_name],['Blood Group',u.blood_group],['Residential Address',u.address]])}</div><div class="dash-panel"><h2>Student Services</h2><div class="dash-links"><a href="notices.html">Notice Board</a><a href="departments.html">Department Details</a><a href="gallery.html">College Gallery</a><a href="#module-attendance">Attendance</a><a href="#module-timetable">Timetable</a><a href="#module-leave">Leave Management</a></div></div>`;
    } else {
      const {data:students = [], error} = await sb.rpc('get_department_student_directory');
      const directory = error ? '<p class="muted">Student directory is not enabled yet. Run the optional directory SQL included in this ZIP.</p>' : (students.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Roll Number</th><th>Gender</th><th>Email</th></tr></thead><tbody>${students.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.roll_number)}</td><td>${esc(s.gender)}</td><td>${esc(s.email)}</td></tr>`).join('')}</tbody></table></div>` : '<p>No students found in this department.</p>');
      root.innerHTML = `<div class="profile-banner"><img class="avatar" src="${avatar}" alt="Profile photo"><div><span class="eyebrow">${role.toUpperCase()} PROFILE</span><h2>${esc(u.name)}</h2><p>${esc(u.department)} · ${esc(u.email)}</p>${statusPill('Approved')}</div></div><div class="dash-panel"><h2>Professional Details</h2>${table([['Name',u.name],['Role',role.toUpperCase()],['Department',u.department],['Designation',u.designation],['Gender',u.gender],['Mobile',u.mobile],['Email',u.email]])}</div><div class="dash-panel"><h2>Department Student Directory</h2>${directory}</div><div class="dash-panel"><h2>Department Tools</h2><div class="dash-links"><a href="notices.html">Notice Board</a><a href="departments.html">Department Details</a><a href="#module-attendance">Attendance</a><a href="#module-leave">Leave Management</a><a href="#module-timetable">Timetable</a></div></div>`;
    }
  }

  async function adminDashboard(root) {
    const {data:users, error} = await sb.from('profiles').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    const pending = users.filter(x => ['faculty','hod'].includes(x.role) && x.status === 'pending');
    root.innerHTML = `<div class="admin-tabs"><button class="btn navy active" data-tab="overview">Overview</button><button class="btn teal" data-tab="website">Website Editor</button><button class="btn teal" data-tab="departments">Departments</button><button class="btn teal" data-tab="users">User Management</button><button class="btn teal" data-tab="notices">Notice Board</button><button class="btn teal" data-tab="management">Attendance · Timetable · Leave</button></div>
      <section id="admin-overview" class="admin-tab"><div class="stat-grid"><div class="stat"><strong>${users.filter(x=>x.role==='student').length}</strong><span>Registered Students</span></div><div class="stat"><strong>${users.filter(x=>x.role==='faculty').length}</strong><span>Faculty Accounts</span></div><div class="stat"><strong>${users.filter(x=>x.role==='hod').length}</strong><span>HOD Accounts</span></div><div class="stat"><strong>${pending.length}</strong><span>Pending Approvals</span></div></div><div class="dash-panel"><h2>Faculty & HOD Approval Requests</h2>${pending.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Email</th><th>Action</th></tr></thead><tbody>${pending.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.role.toUpperCase())}</td><td>${esc(x.department)}</td><td>${esc(x.email)}</td><td><button class="btn teal" data-approve="${x.id}">Approve</button> <button class="btn outline" data-reject="${x.id}">Reject</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">No pending requests.</p>'}</div></section>
      <section id="admin-website" class="admin-tab" hidden><div class="dash-panel"><h2>Home Page & College Content</h2><form id="cms-form" class="form-grid"><label>College Name<input name="collegeName"></label><label>Hero Heading<input name="heroTitle"></label><label>Hero Highlight Text<input name="heroSubtitle"></label><label class="full-field">Hero Description<textarea name="heroText" rows="2"></textarea></label><label class="full-field">About College<textarea name="aboutText" rows="3"></textarea></label><label>Vision<textarea name="vision" rows="2"></textarea></label><label>Mission<textarea name="mission" rows="2"></textarea></label><label>Phone<input name="phone"></label><label>Email<input type="email" name="email"></label><label class="full-field">Address<input name="address"></label><label class="full-field">Facilities Page Description<textarea name="facilitiesText" rows="2"></textarea></label><label class="full-field">Activities Page Description<textarea name="activitiesText" rows="2"></textarea></label><label class="full-field">Replace Slideshow Images<input type="file" name="slides" accept="image/*" multiple><small>Choose optimized images. They will be uploaded to Supabase Storage.</small></label><button class="btn teal" type="submit">Save Website Changes</button><p id="cms-msg" class="form-message full-field"></p></form></div><div class="dash-panel"><h2>Website Preview</h2><a class="btn navy" href="index.html" target="_blank">Open Public Home Page ↗</a></div></section>
      <section id="admin-departments" class="admin-tab" hidden><div class="dash-panel"><h2>Department Management</h2><div id="dept-editor"></div></div></section>
      <section id="admin-users" class="admin-tab" hidden><div class="dash-panel"><h2>Registered Users</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Role / Status</th><th>Department</th><th>Email</th></tr></thead><tbody>${users.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.role)} · ${esc(x.status)}</td><td>${esc(x.department)}</td><td>${esc(x.email)}</td></tr>`).join('')}</tbody></table></div></div></section>
      <section id="admin-management" class="admin-tab" hidden><div id="management-modules"></div></section>
      <section id="admin-notices" class="admin-tab" hidden><div class="dash-panel"><h2>Publish Notice</h2><form id="notice-form"><label>Notice title<input required name="title"></label><label>Message<textarea name="body" required></textarea></label><button class="btn teal">Publish Notice</button><p id="notice-admin-msg" class="form-message"></p></form><div id="admin-notice-list"></div></div></section>`;

    $$('[data-approve]').forEach(b => b.onclick = () => updateApproval(b.dataset.approve, 'active'));
    $$('[data-reject]').forEach(b => b.onclick = () => updateApproval(b.dataset.reject, 'rejected'));
    $$('[data-tab]').forEach(b => b.onclick = () => { $$('.admin-tab').forEach(x=>x.hidden=true); $('#admin-'+b.dataset.tab).hidden=false; $$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b)); });
    await setupCMSForm(); await setupDepartmentEditor(); await setupNoticeAdmin();
  }

  // Integrated Attendance, Timetable and Leave modules. Data access is enforced by Supabase RLS.
  async function renderManagementModules(root, role) {
    const host = role === 'admin' ? $('#management-modules', root) : root;
    if (!host) return;
    const isManager = ['admin','hod'].includes(role);
    const dept = currentProfile.department || '';
    host.insertAdjacentHTML('beforeend', `
      <div class="management-suite">
        <div class="module-tabs"><button type="button" class="btn navy active" data-module="attendance">Attendance</button><button type="button" class="btn teal" data-module="timetable">Timetable</button><button type="button" class="btn teal" data-module="leave">Leave Management</button></div>
        <section class="module-panel" id="module-attendance"><div class="dash-panel"><h2>Attendance Management</h2><p class="muted">Automatic attendance window: 9:30 AM–10:30 AM IST. Sessions open and close without staff starting them.</p>
          ${['faculty','hod','admin'].includes(role) ? '<div id="attendance-roster"></div>' : '<div id="student-attendance-summary"></div>'}
        </div></section>
        <section class="module-panel" id="module-timetable" hidden><div class="dash-panel"><h2>Timetable Management</h2>
          ${isManager ? `<form id="timetable-form" class="form-grid"><label>Department<input name="department" value="${esc(dept)}" ${role==='admin'?'':'readonly'} required></label><label>Academic Year<input name="academic_year" placeholder="2026-27" required></label><label>Semester<input name="semester" required></label><label>Section<input name="section" placeholder="A" maxlength="20" required></label><label>Day<select name="day_of_week"><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select></label><label>Period / Slot<input name="period_label" placeholder="Period 1" required></label><label>Start Time<input name="start_time" type="time" required></label><label>End Time<input name="end_time" type="time" required></label><label>Subject<input name="subject" required></label><label>Faculty Name<input name="faculty_name" required></label><label>Room<input name="room" placeholder="Room number"></label><button class="btn teal">Save Timetable Entry</button><p id="timetable-msg" class="form-message full-field"></p></form>` : ''}
          <div id="timetable-list"></div></div></section>
        <section class="module-panel" id="module-leave" hidden><div class="dash-panel"><h2>Leave Management</h2>
          ${['student','faculty','hod'].includes(role) ? `<form id="leave-form" class="form-grid"><label>From Date<input name="start_date" type="date" required></label><label>To Date<input name="end_date" type="date" required></label><label>Leave Type<select name="leave_type"><option>Medical</option><option>Personal</option><option>Family</option><option>Other</option></select></label><label class="full-field">Reason<textarea name="reason" rows="3" required minlength="5"></textarea></label><button class="btn teal">Submit Leave Request</button><p id="leave-msg" class="form-message full-field"></p></form>` : '<p class="muted">Admin can review leave requests but cannot submit a leave request through this module.</p>'}
          <div id="leave-list"></div></div></section>
      </div>`);
    $$('[data-module]',host).forEach(b=>b.onclick=()=>{ $$('.module-panel',host).forEach(x=>x.hidden=true); $('#module-'+b.dataset.module,host).hidden=false; $$('[data-module]',host).forEach(x=>x.classList.toggle('active',x===b)); });
    await setupAttendanceModule(host, role);
    await setupTimetableModule(host, role);
    await setupLeaveModule(host, role);
  }

  async function setupAttendanceModule(host, role) {
    const form=$('#attendance-session-form',host), roster=$('#attendance-roster',host), summary=$('#student-attendance-summary',host);
    // Student check-in supports both existing RPC and face-api.js (< 0.55) verification into attendance table.
    if (summary) {
      summary.innerHTML = `<p class="muted">Attendance is available automatically from 9:30 AM to 10:30 AM (IST). No staff session start is required. You can verify your face (&lt; 0.55) to record PRESENT.</p><div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="btn teal" id="student-self-attendance">Mark My Attendance</button><button type="button" class="btn navy" id="student-face-attendance">Verify Face &amp; Mark PRESENT</button></div><video id="app-face-att-video" width="320" height="240" autoplay muted playsinline style="display:none;margin-top:10px;border-radius:8px;background:#000;"></video><p id="student-attendance-msg" class="form-message"></p><div id="student-attendance-history"></div>`;
      $('#student-self-attendance',summary).onclick=async()=>{
        const btn=$('#student-self-attendance',summary), msg=$('#student-attendance-msg',summary);
        btn.disabled=true; say(msg,'Checking attendance window…');
        const {data,error}=await sb.rpc('mark_my_attendance');
        if(error){say(msg,error.message,true);btn.disabled=false;return;}
        say(msg,data?.message || 'Attendance recorded.');
        await loadStudentAttendanceHistory($('#student-attendance-history',summary));
      };
      $('#student-face-attendance',summary).onclick=async()=>{
        const btn=$('#student-face-attendance',summary), msg=$('#student-attendance-msg',summary), vid=$('#app-face-att-video',summary);
        btn.disabled=true; say(msg,'Starting camera & face verification…');
        let stream=null;
        try {
          const {data:prof,error:pErr}=await sb.from('profiles').select('face_descriptor').eq('id',currentProfile.id).single();
          if(pErr || !Array.isArray(prof?.face_descriptor) || prof.face_descriptor.length!==128){
            throw new Error('Face descriptor not registered. Please enroll face first.');
          }
          vid.style.display='block';
          stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
          vid.srcObject=stream;
          await new Promise(r=>{ vid.onloadedmetadata=()=>{ vid.play(); r(); }; });
          const liveDesc=await captureLiveFaceDescriptor(vid);
          const storedDesc=new Float32Array(prof.face_descriptor);
          const dist=Number(faceapi.euclideanDistance(liveDesc,storedDesc).toFixed(4));
          if(dist>=FACE_MATCH_THRESHOLD){
            throw new Error(`Face mismatch (distance ${dist} >= ${FACE_MATCH_THRESHOLD}). Try again.`);
          }
          const {data:studentId,error:rpcErr}=await sb.rpc('get_or_create_student_id',{p_profile_id:currentProfile.id});
          if(rpcErr || !studentId) throw new Error('Unable to map student ID.');
          const today=new Date().toISOString().split('T')[0];
          const {error:insErr}=await sb.from('attendance').upsert({
            student_id:studentId,
            attendance_date:today,
            attendance_time:new Date().toISOString(),
            status:'PRESENT',
            verification_status:'FACE_VERIFIED',
            match_distance:dist
          },{onConflict:'student_id,attendance_date'});
          if(insErr) throw new Error(insErr.message);
          say(msg,`Face verified (distance: ${dist}). Attendance marked PRESENT!`);
          await loadStudentAttendanceHistory($('#student-attendance-history',summary));
        } catch(err){
          say(msg,err.message || 'Face verification failed.',true);
        } finally {
          if(stream) stream.getTracks().forEach(t=>t.stop());
          if(vid){ vid.srcObject=null; vid.style.display='none'; }
          btn.disabled=false;
        }
      };
      await loadStudentAttendanceHistory($('#student-attendance-history',summary));
    }
    // Staff can view the automatically-created session and correct records, but cannot start it.
    if (['faculty','hod','admin'].includes(role) && roster) {
      const {data:profile}=await sb.from('profiles').select('department,academic_year,semester').eq('id',currentProfile.id).maybeSingle();
      const dept = role==='admin' ? '' : (profile?.department || currentProfile.department || '');
      const msg = document.createElement('p'); msg.className='muted'; msg.textContent='Daily attendance opens automatically at 9:30 AM IST and closes at 10:30 AM. Staff do not need to start a session.';
      roster.before(msg);
      const refresh=document.createElement('button'); refresh.type='button'; refresh.className='btn teal'; refresh.textContent='Refresh Today’s Attendance'; roster.before(refresh);
      const load=async()=>{
        let q=sb.from('attendance_sessions').select('*').eq('session_date',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date())).order('department');
        if(dept) q=q.eq('department',dept);
        const {data,error}=await q;
        if(error){roster.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;}
        roster.innerHTML=(data||[]).map(x=>`<div class="dash-panel"><h3>${esc(x.department)} · Year ${esc(x.academic_year)} · Semester ${esc(x.semester)}</h3><button type="button" class="btn outline" data-open-roster="${x.id}">View / Correct Records</button><div id="roster-${x.id}"></div></div>`).join('')||'<p>No automatic attendance sessions found for today.</p>';
        $$('[data-open-roster]',roster).forEach(b=>b.onclick=async()=>{const session=(data||[]).find(x=>x.id===b.dataset.openRoster);await loadAttendanceRoster($('#roster-'+session.id,roster),session,role);});
      };
      refresh.onclick=load; await load();
    }
  }
  async function loadStudentAttendanceHistory(host){
    if(!host)return;
    const {data,error}=await sb.from('attendance_records').select('attendance_status,marked_at,session:attendance_sessions(session_date)').eq('student_id',currentProfile.id).is('deleted_at',null).order('marked_at',{ascending:false}).limit(100);
    if(error){host.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;}
    const rows=data||[],present=rows.filter(x=>(x.attendance_status||x.status)==='present').length,pct=rows.length?Math.round(present/rows.length*100):0;
    host.innerHTML=`<p><strong>${pct}%</strong> attendance · ${present}/${rows.length} present</p>${simpleTable(['Date','Status'],rows.map(x=>[x.session?.session_date||'—',x.attendance_status||x.status||'—']))}`;
  }
  function simpleTable(headers, rows) { return `<div class="table-scroll"><table class="data-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length}">No records found.</td></tr>`}</tbody></table></div>`; }
  async function loadAttendanceRoster(host, session, role) {
    if (!host || !session) return;
    const { data: students, error } = await sb.rpc('get_attendance_student_roster', {
      p_department: session.department,
      p_academic_year: session.academic_year,
      p_semester: String(session.semester)
    });
    if (error) {
      host.innerHTML = `<p class="error">${esc(error.message)}</p>`;
      return;
    }
    const { data: existing, error: existingError } = await sb
      .from('attendance_records')
      .select('id,student_id,attendance_status,status')
      .eq('session_id', session.id)
      .is('deleted_at', null);
    if (existingError) {
      host.innerHTML = `<p class="error">${esc(existingError.message)}</p>`;
      return;
    }
    const byId = new Map((existing || []).map(x => [x.student_id, x]));
    host.innerHTML=`<h3>Student Attendance · ${esc(session.session_date)}</h3>${(students||[]).map(st=>`<div class="attendance-row"><span>${esc(st.name)} (${esc(st.roll_number||'—')})</span><select data-attendance-student="${st.id}"><option value="present" ${(byId.get(st.id)?.attendance_status||byId.get(st.id)?.status)==='present'?'selected':''}>Present</option><option value="absent" ${(byId.get(st.id)?.attendance_status||byId.get(st.id)?.status)==='absent'?'selected':''}>Absent</option></select><button class="btn teal" data-save-attendance="${st.id}">Save</button>${byId.get(st.id)?`<button class="btn outline" data-delete-attendance="${byId.get(st.id).id}">Delete</button>`:''}</div>`).join('')||'<p>No matching students in this department/year/semester.</p>'}`;
    $$('[data-save-attendance]',host).forEach(b=>b.onclick=async()=>{const studentId=b.dataset.saveAttendance, status=$(`[data-attendance-student="${studentId}"]`,host).value; const {error:saveError}=await sb.from('attendance_records').upsert({session_id:session.id,student_id:studentId,attendance_status:status,status,marked_by:currentProfile.id,deleted_at:null,deleted_by:null,delete_reason:null},{onConflict:'session_id,student_id'}); if(saveError) alert(saveError.message); else { b.textContent='Saved'; await loadAttendanceRoster(host,session); }});
    $$('[data-delete-attendance]',host).forEach(b=>b.onclick=async()=>{const reason=prompt('Enter the reason for deleting this attendance record (minimum 5 characters):'); if(!reason || reason.trim().length<5){alert('A reason of at least 5 characters is required.');return;} const {error:delError}=await sb.from('attendance_records').update({deleted_at:new Date().toISOString(),deleted_by:currentProfile.id,delete_reason:reason.trim()}).eq('id',b.dataset.deleteAttendance); if(delError)alert(delError.message); else await loadAttendanceRoster(host,session);});
  }
  async function setupTimetableModule(host, role) {
    const form=$('#timetable-form',host), list=$('#timetable-list',host);
    const dayToNumber={Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};
    const numberToDay={1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday',0:'Sunday'};
    const load=async()=>{let q=sb.from('timetable_entries').select('*').order('day_of_week').order('start_time');if(role!=='admin')q=q.eq('department',currentProfile.department);const {data,error}=await q.limit(250);if(error){list.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;}list.innerHTML=simpleTable(['Day','Time','Period','Section','Subject','Faculty','Room'],(data||[]).map(x=>[numberToDay[Number(x.day_of_week)]||String(x.day_of_week),`${x.start_time}–${x.end_time}`,x.period_label,x.section||'A',x.subject,x.faculty_name,x.room||'—']));};
    if(form)form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form),payload=Object.fromEntries(f.entries());payload.day_of_week=Number(dayToNumber[payload.day_of_week]??payload.day_of_week);if(!Number.isInteger(payload.day_of_week)||payload.day_of_week<1||payload.day_of_week>6){say($('#timetable-msg',host),'Choose a valid day (Monday–Saturday).',true);return;}payload.created_by=currentProfile.id;const {error}=await sb.from('timetable_entries').insert(payload);say($('#timetable-msg',host),error?error.message:'Timetable entry saved.',!!error);if(!error){form.reset();await load();}};
    await load();
  }
  async function setupLeaveModule(host, role) {
    const form=$('#leave-form',host), list=$('#leave-list',host); const load=async()=>{let q=sb.from('leave_requests').select('*').order('created_at',{ascending:false}).limit(100); if(!['admin','hod','faculty'].includes(role))q=q.eq('applicant_id',currentProfile.id); else if(role!=='admin')q=q.eq('department',currentProfile.department); const {data,error}=await q; if(error){list.innerHTML=`<p class="error">${esc(error.message)}</p>`;return;} list.innerHTML=(data||[]).map(x=>`<div class="notice-item"><p><strong>${esc(x.applicant_name)}</strong> · ${esc(x.start_date)} to ${esc(x.end_date)} · ${esc(x.status)}<br>${esc(x.reason)}${x.status==='pending' && canApproveLeave(role,x.applicant_role)?`<br><button class="btn teal" data-leave-action="approved" data-leave-id="${x.id}">Approve</button> <button class="btn outline" data-leave-action="rejected" data-leave-id="${x.id}">Reject</button>`:''}</p></div>`).join('')||'<p>No leave requests.</p>'; $$('[data-leave-action]',list).forEach(b=>b.onclick=async()=>{const {error:updateError}=await sb.from('leave_requests').update({status:b.dataset.leaveAction,reviewed_by:currentProfile.id,reviewed_at:new Date().toISOString()}).eq('id',b.dataset.leaveId);if(updateError)alert(updateError.message);else await load();});};
    function canApproveLeave(r, applicant){return (applicant==='student'&&['faculty','hod','admin'].includes(r))||(applicant==='faculty'&&['hod','admin'].includes(r))||(applicant==='hod'&&r==='admin');}
    if(form)form.onsubmit=async e=>{e.preventDefault();const f=new FormData(form);if(f.get('end_date')<f.get('start_date'))return say($('#leave-msg',host),'End date must be on or after start date.',true);const payload={applicant_id:currentProfile.id,applicant_name:currentProfile.name,applicant_role:role,department:currentProfile.department,start_date:f.get('start_date'),end_date:f.get('end_date'),leave_type:f.get('leave_type'),reason:f.get('reason'),status:'pending'};const {error}=await sb.from('leave_requests').insert(payload);say($('#leave-msg',host),error?error.message:'Leave request submitted.',!!error);if(!error){form.reset();await load();}}; await load();
  }

  async function updateApproval(id, status) {
    const {error} = await sb.from('profiles').update({status}).eq('id', id);
    if (error) { alert(`Could not update account: ${error.message}`); return; }
    await dashboard();
  }
  async function setupCMSForm() {
    const form = $('#cms-form'); if (!form) return;
    const c = await loadCMS();
    Object.entries(c).forEach(([k,v]) => { if (form.elements[k] && typeof v === 'string') form.elements[k].value = v; });
    form.onsubmit = async e => {
      e.preventDefault(); const msg = $('#cms-msg'), fd = new FormData(form), next = {...cmsCache};
      for (const k of ['collegeName','heroTitle','heroSubtitle','heroText','aboutText','vision','mission','phone','email','address','facilitiesText','activitiesText']) next[k] = fd.get(k);
      try {
        const files = [...form.elements.slides.files];
        if (files.length) {
          const uploaded = [];
          for (const file of files) {
            if (!file.type.startsWith('image/') || file.size > 5*1024*1024) throw new Error('Each slideshow image must be an image under 5 MB.');
            const path = `website-slides/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
            const {error} = await sb.storage.from('website-assets').upload(path,file,{upsert:true}); if (error) throw error;
            const {data} = sb.storage.from('website-assets').getPublicUrl(path); uploaded.push(data.publicUrl);
          }
          next.slides = uploaded;
        }
        const {error} = await sb.from('site_content').upsert({content_key:'homepage',content:next,updated_by:currentProfile.id},{onConflict:'content_key'});
        if (error) throw error; cmsCache = next; applyCMS(); say(msg,'Website content saved successfully.');
      } catch (err) { console.error(err); say(msg,err.message,true); }
    };
  }
  async function setupDepartmentEditor() {
    const host = $('#dept-editor'); if (!host) return;
    const {data, error} = await sb.from('departments').select('*').order('id');
    if (error) { host.innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
    host.innerHTML = (data || []).map(d => `<form class="dept-edit-form" data-id="${d.id}"><h3>${esc(d.department_name)}</h3><label>HOD Display Name<input name="hod" value="${esc(d.hod_display_name || '')}"></label><label>Department Overview<textarea name="overview" rows="2">${esc(d.overview || '')}</textarea></label><button class="btn teal">Save ${esc(d.department_name)}</button><span class="form-message"></span></form>`).join('');
    $$('.dept-edit-form',host).forEach(form => form.onsubmit = async e => {
      e.preventDefault(); const {error:updateError} = await sb.from('departments').update({hod_display_name:form.elements.hod.value,overview:form.elements.overview.value}).eq('id',form.dataset.id);
      say($('.form-message',form),updateError ? updateError.message : 'Saved.',!!updateError);
    });
  }
  async function setupNoticeAdmin() {
    const form = $('#notice-form'); if (!form) return;
    await refreshAdminNotices();
    form.onsubmit = async e => {
      e.preventDefault(); const msg = $('#notice-admin-msg');
      const {error} = await sb.from('notices').insert({title:form.elements.title.value.trim(),body:form.elements.body.value.trim(),notice_date:new Date().toISOString().slice(0,10),is_published:true,created_by:currentProfile.id});
      if (error) say(msg,error.message,true); else { say(msg,'Notice published successfully.'); form.reset(); await refreshAdminNotices(); }
    };
  }
  async function refreshAdminNotices() {
    const host = $('#admin-notice-list'); if (!host) return;
    const {data,error} = await sb.from('notices').select('id,title,notice_date,is_published').order('created_at',{ascending:false}).limit(50);
    if (error) { host.innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
    host.innerHTML = `<h3>Existing Notices</h3>` + ((data||[]).map(n=>`<div class="notice-item"><p><strong>${esc(n.title)}</strong> · ${esc(n.notice_date)} · ${n.is_published?'Published':'Draft'} <button class="btn outline" data-delete-notice="${n.id}">Delete</button></p></div>`).join('') || '<p>No notices yet.</p>');
    $$('[data-delete-notice]',host).forEach(b=>b.onclick=async()=>{ if(!confirm('Delete this notice?')) return; const {error:delError}=await sb.from('notices').delete().eq('id',b.dataset.deleteNotice); if(delError) alert(delError.message); else refreshAdminNotices(); });
  }

  async function departmentPage() {
    const root = $('#department-detail'); if (!root) return;
    const name = new URLSearchParams(location.search).get('name') || DEPTS[0];
    const {data:dept,error} = await sb.from('departments').select('*').eq('department_name',name).maybeSingle();
    if (error) { root.innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
    root.innerHTML = `<div class="content-card"><span class="eyebrow">DEPARTMENT PROFILE</span><h2>${esc(name)}</h2><p>${esc(dept?.overview || 'Department overview and academic community.')}</p><h3>Head of Department</h3><p>${esc(dept?.hod_display_name || 'HOD not yet assigned')}</p><p class="muted">Faculty and student directory details are available through authorized college portals.</p></div>`;
  }

  async function init() {
    header(); footer();
    if (!sb) return;
    await loadCMS(); applyCMS(); deptCards($('#home-departments')); deptCards($('#all-departments')); slider();
    await Promise.all([renderNotices($('#home-notices'),3), renderNotices($('#all-notices'),30)]);
    registration(); login(); await dashboard(); await departmentPage();
    $('#logout')?.addEventListener('click', async () => { await sb.auth.signOut(); location.href='login.html'; });
    $('#contact-form')?.addEventListener('submit', e => { e.preventDefault(); say($('#contact-msg'),'Thank you. Your enquiry has been recorded.'); e.target.reset(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
