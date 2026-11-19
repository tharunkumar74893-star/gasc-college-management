/* GASC College Management System - Supabase-connected frontend */
(() => {
  'use strict';

  const DEPTS = ['B.A. Tamil', 'B.A. English', 'B.Sc. Computer Science', 'B.Sc. Mathematics', 'B.Com. Commerce'];
  const IMAGES = ['assets/images/campus-front-1.jpg', 'assets/images/campus-front-2.jpg', 'assets/images/campus-side-view.jpg', 'assets/images/campus-entrance.jpg'];
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

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const say = (el, msg, error = false) => { if (el) { el.textContent = msg; el.classList.toggle('error', error); } };
  const sb = window.supabase?.createClient(window.GASC_SUPABASE_URL, window.GASC_SUPABASE_ANON_KEY);
  let currentProfile = null;
  let cmsCache = {...DEFAULT_CMS};

  if (!sb) console.error('Supabase client not loaded. Check config.js and the Supabase CDN script.');

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
    const {data, error:profileError} = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (profileError) throw profileError; return data;
  }

  async function photoUrl(path) {
    if (!path) return 'assets/images/campus-entrance.jpg';
    const {data, error} = await sb.storage.from('profile-photos').createSignedUrl(path, 3600);
    return !error && data?.signedUrl ? data.signedUrl : 'assets/images/campus-entrance.jpg';
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
    } catch (err) { console.error(err); root.innerHTML = `<div class="dash-panel"><p class="error">Unable to load dashboard: ${esc(err.message)}</p></div>`; }
  }

  async function staffOrStudentDashboard(root, role) {
    const u = currentProfile, avatar = await photoUrl(u.photo_path);
    if (role === 'student') {
      root.innerHTML = `<div class="profile-banner"><img class="avatar" src="${avatar}" alt="Student profile photo"><div><span class="eyebrow">STUDENT PROFILE</span><h2>${esc(u.name)}</h2><p>${esc(u.department)} · ${esc(u.email)}</p>${statusPill('Active Student')}</div></div><div class="stat-grid"><div class="stat"><strong>${esc(u.roll_number || '—')}</strong><span>Roll Number</span></div><div class="stat"><strong>${esc(u.semester || '—')}</strong><span>Current Semester</span></div><div class="stat"><strong>${esc(u.academic_year || '—')}</strong><span>Academic Year</span></div><div class="stat"><strong>—</strong><span>Attendance</span></div></div><div class="dash-panel"><h2>Personal Details</h2>${table([['Name',u.name],['Date of birth',u.dob],['Gender',u.gender],['Roll Number',u.roll_number],['University Registration Number',u.university_reg_no],['Degree',u.degree],['Department',u.department],['Semester',u.semester],['Academic Year',u.academic_year],['Admission Year',u.admission_year],['Mobile',u.mobile],['Email',u.email],['Father Name',u.father_name],['Mother Name',u.mother_name],['Blood Group',u.blood_group],['Residential Address',u.address]])}</div><div class="dash-panel"><h2>Student Services</h2><div class="dash-links"><a href="notices.html">Notice Board</a><a href="departments.html">Department Details</a><a href="gallery.html">College Gallery</a><a href="#attendance">Attendance (coming soon)</a><a href="#timetable">Timetable (coming soon)</a><a href="#leave">Leave Management (coming soon)</a></div></div>`;
    } else {
      const {data:students = [], error} = await sb.rpc('get_department_student_directory');
      const directory = error ? '<p class="muted">Student directory is not enabled yet. Run the optional directory SQL included in this ZIP.</p>' : (students.length ? `<div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Roll Number</th><th>Gender</th><th>Email</th></tr></thead><tbody>${students.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.roll_number)}</td><td>${esc(s.gender)}</td><td>${esc(s.email)}</td></tr>`).join('')}</tbody></table></div>` : '<p>No students found in this department.</p>');
      root.innerHTML = `<div class="profile-banner"><img class="avatar" src="${avatar}" alt="Profile photo"><div><span class="eyebrow">${role.toUpperCase()} PROFILE</span><h2>${esc(u.name)}</h2><p>${esc(u.department)} · ${esc(u.email)}</p>${statusPill('Approved')}</div></div><div class="dash-panel"><h2>Professional Details</h2>${table([['Name',u.name],['Role',role.toUpperCase()],['Department',u.department],['Designation',u.designation],['Gender',u.gender],['Mobile',u.mobile],['Email',u.email]])}</div><div class="dash-panel"><h2>Department Student Directory</h2>${directory}</div><div class="dash-panel"><h2>Department Tools</h2><div class="dash-links"><a href="notices.html">Notice Board</a><a href="departments.html">Department Details</a><a href="#attendance">Attendance (coming soon)</a><a href="#leave">Leave Management (coming soon)</a><a href="#timetable">Timetable (coming soon)</a></div></div>`;
    }
  }

  async function adminDashboard(root) {
    const {data:users, error} = await sb.from('profiles').select('*').order('created_at',{ascending:false});
    if (error) throw error;
    const pending = users.filter(x => ['faculty','hod'].includes(x.role) && x.status === 'pending');
    root.innerHTML = `<div class="admin-tabs"><button class="btn navy active" data-tab="overview">Overview</button><button class="btn teal" data-tab="website">Website Editor</button><button class="btn teal" data-tab="departments">Departments</button><button class="btn teal" data-tab="users">User Management</button><button class="btn teal" data-tab="notices">Notice Board</button></div>
      <section id="admin-overview" class="admin-tab"><div class="stat-grid"><div class="stat"><strong>${users.filter(x=>x.role==='student').length}</strong><span>Registered Students</span></div><div class="stat"><strong>${users.filter(x=>x.role==='faculty').length}</strong><span>Faculty Accounts</span></div><div class="stat"><strong>${users.filter(x=>x.role==='hod').length}</strong><span>HOD Accounts</span></div><div class="stat"><strong>${pending.length}</strong><span>Pending Approvals</span></div></div><div class="dash-panel"><h2>Faculty & HOD Approval Requests</h2>${pending.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Email</th><th>Action</th></tr></thead><tbody>${pending.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.role.toUpperCase())}</td><td>${esc(x.department)}</td><td>${esc(x.email)}</td><td><button class="btn teal" data-approve="${x.id}">Approve</button> <button class="btn outline" data-reject="${x.id}">Reject</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="empty">No pending requests.</p>'}</div></section>
      <section id="admin-website" class="admin-tab" hidden><div class="dash-panel"><h2>Home Page & College Content</h2><form id="cms-form" class="form-grid"><label>College Name<input name="collegeName"></label><label>Hero Heading<input name="heroTitle"></label><label>Hero Highlight Text<input name="heroSubtitle"></label><label class="full-field">Hero Description<textarea name="heroText" rows="2"></textarea></label><label class="full-field">About College<textarea name="aboutText" rows="3"></textarea></label><label>Vision<textarea name="vision" rows="2"></textarea></label><label>Mission<textarea name="mission" rows="2"></textarea></label><label>Phone<input name="phone"></label><label>Email<input type="email" name="email"></label><label class="full-field">Address<input name="address"></label><label class="full-field">Facilities Page Description<textarea name="facilitiesText" rows="2"></textarea></label><label class="full-field">Activities Page Description<textarea name="activitiesText" rows="2"></textarea></label><label class="full-field">Replace Slideshow Images<input type="file" name="slides" accept="image/*" multiple><small>Choose optimized images. They will be uploaded to Supabase Storage.</small></label><button class="btn teal" type="submit">Save Website Changes</button><p id="cms-msg" class="form-message full-field"></p></form></div><div class="dash-panel"><h2>Website Preview</h2><a class="btn navy" href="index.html" target="_blank">Open Public Home Page ↗</a></div></section>
      <section id="admin-departments" class="admin-tab" hidden><div class="dash-panel"><h2>Department Management</h2><div id="dept-editor"></div></div></section>
      <section id="admin-users" class="admin-tab" hidden><div class="dash-panel"><h2>Registered Users</h2><div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Role / Status</th><th>Department</th><th>Email</th></tr></thead><tbody>${users.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.role)} · ${esc(x.status)}</td><td>${esc(x.department)}</td><td>${esc(x.email)}</td></tr>`).join('')}</tbody></table></div></div></section>
      <section id="admin-notices" class="admin-tab" hidden><div class="dash-panel"><h2>Publish Notice</h2><form id="notice-form"><label>Notice title<input required name="title"></label><label>Message<textarea name="body" required></textarea></label><button class="btn teal">Publish Notice</button><p id="notice-admin-msg" class="form-message"></p></form><div id="admin-notice-list"></div></div></section>`;

    $$('[data-approve]').forEach(b => b.onclick = () => updateApproval(b.dataset.approve, 'active'));
    $$('[data-reject]').forEach(b => b.onclick = () => updateApproval(b.dataset.reject, 'rejected'));
    $$('[data-tab]').forEach(b => b.onclick = () => { $$('.admin-tab').forEach(x=>x.hidden=true); $('#admin-'+b.dataset.tab).hidden=false; $$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b)); });
    await setupCMSForm(); await setupDepartmentEditor(); await setupNoticeAdmin();
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
      e.preventDefault();
      const msg = $('#notice-admin-msg');

      const noticeTitle = form.elements.title.value.trim();
      const noticeBody = form.elements.body.value.trim();

      if (!noticeTitle || !noticeBody) {
        say(msg, 'Please enter both a notice title and message.', true);
        return;
      }

      const {error} = await sb.from('notices').insert({
        title: noticeTitle,
        description: noticeBody,
        body: noticeBody,
        notice_date: new Date().toISOString().slice(0, 10),
        is_published: true,
        created_by: currentProfile.id
      });

      if (error) {
        say(msg, error.message, true);
      } else {
        say(msg, 'Notice published successfully.');
        form.reset();
        await refreshAdminNotices();
      }
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
