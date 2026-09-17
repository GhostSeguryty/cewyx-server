/* ============================================================
   CEWYX (versión con servidor)
   Frontend → API REST en el mismo origen
   ============================================================ */

(function () {
  'use strict';

  const API = '/api';
  let token = localStorage.getItem('cewyx_token') || null;
  let currentUser = null;
  let currentView = 'dashboard';
  let currentCourseId = null;
  let currentLessonIndex = null;
  let quizAnswers = {};
  let coursesCache = [];

  // ---------- API helpers ----------
  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API + path, { ...options, headers });
    let data = null;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) {
      const err = new Error(data.error || 'Error de red');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function showError(elId, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError(elId) {
    const el = document.getElementById(elId);
    if (el) el.classList.add('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------- Auth UI ----------
  async function initAuth() {
    try {
      const status = await api('/status');
      if (token) {
        try {
          const me = await api('/me');
          currentUser = me.user;
          showApp();
          return;
        } catch {
          token = null;
          localStorage.removeItem('cewyx_token');
        }
      }

      if (!status.hasAdmin) {
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
      } else {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
      }
      document.getElementById('app').classList.add('hidden');
    } catch (e) {
      document.getElementById('setup-screen').classList.add('hidden');
      document.getElementById('auth-screen').classList.remove('hidden');
      document.getElementById('app').classList.add('hidden');
      toast('No se pudo conectar al servidor. ¿Está en marcha?', 'error');
    }
  }

  function showApp() {
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateUserUI();
    navigate('dashboard');
  }

  function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('user-greeting').textContent = currentUser.name;
    const badge = document.getElementById('user-role-badge');
    badge.textContent = currentUser.role === 'admin' ? 'Admin' : 'Usuario';
    badge.className = 'role-badge' + (currentUser.role === 'admin' ? ' admin' : '');
    document.querySelectorAll('.admin-only').forEach(el => {
      el.classList.toggle('hidden', currentUser.role !== 'admin');
    });
  }

  // Setup
  document.getElementById('setup-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError('setup-error');
    const name = document.getElementById('setup-name').value.trim();
    const email = document.getElementById('setup-email').value.trim();
    const pass = document.getElementById('setup-password').value;
    const pass2 = document.getElementById('setup-password2').value;
    if (pass !== pass2) return showError('setup-error', 'Las contraseñas no coinciden.');
    try {
      const data = await api('/setup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: pass })
      });
      token = data.token;
      localStorage.setItem('cewyx_token', token);
      currentUser = data.user;
      toast('Administrador creado', 'success');
      showApp();
    } catch (err) {
      showError('setup-error', err.message);
    }
  });

  // Tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      document.getElementById('login-form').classList.toggle('hidden', !isLogin);
      document.getElementById('register-form').classList.toggle('hidden', isLogin);
      hideError('auth-error');
    });
  });

  // Login
  document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError('auth-error');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    try {
      const data = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      token = data.token;
      localStorage.setItem('cewyx_token', token);
      currentUser = data.user;
      toast('Bienvenido/a, ' + currentUser.name, 'success');
      showApp();
    } catch (err) {
      showError('auth-error', err.message);
    }
  });

  // Register
  document.getElementById('register-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    hideError('auth-error');
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const pass2 = document.getElementById('reg-password2').value;
    if (pass !== pass2) return showError('auth-error', 'Las contraseñas no coinciden.');
    try {
      const data = await api('/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password: pass })
      });
      token = data.token;
      localStorage.setItem('cewyx_token', token);
      currentUser = data.user;
      toast('Cuenta creada', 'success');
      showApp();
    } catch (err) {
      showError('auth-error', err.message);
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await api('/logout', { method: 'POST' }); } catch {}
    token = null;
    currentUser = null;
    localStorage.removeItem('cewyx_token');
    document.getElementById('app').classList.add('hidden');
    initAuth();
    toast('Sesión cerrada', 'info');
  });

  // ---------- Navegación ----------
  function navigate(view, params = {}) {
    currentView = view;
    if (params.courseId) currentCourseId = params.courseId;
    if (params.lessonIndex !== undefined) currentLessonIndex = params.lessonIndex;

    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    const titles = {
      dashboard: 'Dashboard',
      courses: 'Cursos',
      'course-detail': 'Curso',
      lesson: 'Lección',
      quiz: 'Cuestionario',
      labs: 'Laboratorios',
      'lab-chat': 'Bot de ingeniería social',
      'lab-msg': 'Mensaje phishing ficticio',
      'lab-term': 'Terminal de práctica',
      progress: 'Progreso',
      results: 'Resultados',
      profile: 'Perfil',
      'admin-users': 'Gestión de usuarios',
      'admin-courses': 'Gestionar cursos',
      'admin-results': 'Resultados globales',
      'admin-edit-course': 'Editar curso'
    };
    document.getElementById('page-title').textContent = titles[view] || 'Cewyx';

    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');

    renderView();
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.dataset.view) navigate(item.dataset.view);
    });
  });

  document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  });
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  });

  // ---------- Progreso helpers ----------
  function getUserProgress(courseId) {
    if (!currentUser.progress) currentUser.progress = {};
    return currentUser.progress[courseId] || { completedLessons: [], quizScore: null, quizDone: false };
  }

  async function saveUserProgress(courseId, progress) {
    try {
      await api('/progress/' + courseId, {
        method: 'PUT',
        body: JSON.stringify(progress)
      });
      if (!currentUser.progress) currentUser.progress = {};
      currentUser.progress[courseId] = progress;
    } catch (e) {
      toast('Error al guardar progreso', 'error');
    }
  }

  async function markLessonComplete(courseId, lessonIndex) {
    const prog = getUserProgress(courseId);
    if (!prog.completedLessons.includes(lessonIndex)) {
      prog.completedLessons = [...prog.completedLessons, lessonIndex];
      await saveUserProgress(courseId, prog);
    }
  }

  function getCourseProgressPercent(courseId) {
    const course = coursesCache.find(c => c.id === courseId);
    if (!course || !course.lessons.length) return 0;
    const prog = getUserProgress(courseId);
    const lessonPct = (prog.completedLessons.length / course.lessons.length) * 70;
    const quizPct = prog.quizDone ? 30 : 0;
    return Math.round(lessonPct + quizPct);
  }

  async function loadCourses() {
    const data = await api('/courses');
    coursesCache = data.courses || [];
    return coursesCache;
  }

  async function refreshMe() {
    const me = await api('/me');
    currentUser = me.user;
    updateUserUI();
  }

  // ---------- Render ----------
  async function renderView() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<p style="color:var(--text-muted)">Cargando...</p>';
    try {
      switch (currentView) {
        case 'dashboard': container.innerHTML = await renderDashboard(); break;
        case 'courses': container.innerHTML = await renderCourses(); break;
        case 'course-detail': container.innerHTML = await renderCourseDetail(); break;
        case 'lesson': container.innerHTML = await renderLesson(); break;
        case 'quiz': container.innerHTML = await renderQuiz(); break;
        case 'labs': container.innerHTML = await renderLabs(); break;
        case 'lab-chat': container.innerHTML = renderLabChat(); break;
        case 'lab-msg': container.innerHTML = renderLabMsg(); break;
        case 'lab-term': container.innerHTML = renderLabTerm(); break;
        case 'progress': container.innerHTML = await renderProgress(); break;
        case 'results': container.innerHTML = await renderResults(); break;
        case 'profile': container.innerHTML = renderProfile(); break;
        case 'admin-users': container.innerHTML = await renderAdminUsers(); break;
        case 'admin-courses': container.innerHTML = await renderAdminCourses(); break;
        case 'admin-results': container.innerHTML = await renderAdminResults(); break;
        case 'admin-edit-course': container.innerHTML = await renderAdminEditCourse(); break;
        default: container.innerHTML = '<p>Vista no encontrada</p>';
      }
      bindViewEvents();
    } catch (e) {
      container.innerHTML = `<p style="color:var(--danger)">Error: ${escapeHtml(e.message)}</p>`;
      if (e.status === 401) {
        token = null;
        localStorage.removeItem('cewyx_token');
        initAuth();
      }
    }
  }

  async function renderDashboard() {
    await loadCourses();
    await refreshMe();
    const resultsData = await api('/results');
    const results = resultsData.results || [];
    const myResults = results.filter(r => r.userId === currentUser.id);
    const completedCourses = coursesCache.filter(c => getCourseProgressPercent(c.id) === 100).length;
    const avgScore = myResults.length
      ? Math.round(myResults.reduce((s, r) => s + r.percent, 0) / myResults.length)
      : 0;

    const coursesHtml = coursesCache.slice(0, 4).map(c => {
      const pct = getCourseProgressPercent(c.id);
      return `
        <div class="card" data-action="open-course" data-id="${c.id}">
          <div class="card-icon">${c.icon || '📘'}</div>
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml((c.description || '').substring(0, 100))}...</p>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${pct}% completado</div>
          <button class="btn btn-primary btn-sm" style="margin-top:0.75rem">Continuar</button>
        </div>`;
    }).join('');

    return `
      <div class="welcome-banner">
        <h2>Hola, ${escapeHtml(currentUser.name)} 👋</h2>
        <p>Plataforma con servidor: tus datos y los de todos los usuarios se guardan de forma centralizada.</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${coursesCache.length}</div>
          <div class="stat-label">Cursos disponibles</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value">${completedCourses}</div>
          <div class="stat-label">Cursos completados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-value">${myResults.length}</div>
          <div class="stat-label">Cuestionarios realizados</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${avgScore}%</div>
          <div class="stat-label">Promedio de aciertos</div>
        </div>
      </div>
      <h3 class="section-title">Cursos recomendados</h3>
      <div class="cards-grid">${coursesHtml || '<p class="empty-state">No hay cursos aún.</p>'}</div>
      <div style="margin-top:1.5rem">
        <button class="btn btn-secondary" data-action="go-courses">Ver todos los cursos</button>
        <button class="btn btn-secondary" data-action="go-labs" style="margin-left:0.5rem">Ir a laboratorios</button>
      </div>`;
  }

  async function renderCourses() {
    await loadCourses();
    await refreshMe();
    const html = coursesCache.map(c => {
      const pct = getCourseProgressPercent(c.id);
      const prog = getUserProgress(c.id);
      return `
        <div class="card" data-action="open-course" data-id="${c.id}">
          <div class="card-icon">${c.icon || '📘'}</div>
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.description)}</p>
          <div class="card-meta">
            <span>📖 ${c.lessons.length} lecciones</span>
            <span>❓ ${(c.questions || []).length} preguntas</span>
            ${prog.quizDone ? '<span>✅ Quiz hecho</span>' : ''}
          </div>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${pct}% completado</div>
          <button class="btn btn-primary btn-sm" style="margin-top:0.75rem">Abrir curso</button>
        </div>`;
    }).join('');
    return `
      <h3 class="section-title">Todos los cursos</h3>
      <div class="cards-grid">${html || '<div class="empty-state"><div class="empty-icon">📚</div><p>No hay cursos.</p></div>'}</div>`;
  }

  async function renderCourseDetail() {
    await loadCourses();
    await refreshMe();
    const course = coursesCache.find(c => c.id === currentCourseId);
    if (!course) return '<p>Curso no encontrado.</p><button class="btn btn-secondary" data-action="go-courses">Volver</button>';

    const prog = getUserProgress(course.id);
    const pct = getCourseProgressPercent(course.id);
    const lessonsHtml = course.lessons.map((l, i) => {
      const done = prog.completedLessons.includes(i);
      return `
        <div class="lesson-item ${done ? 'completed' : ''}" data-action="open-lesson" data-index="${i}">
          <div class="lesson-num">${done ? '✓' : (i + 1)}</div>
          <div class="lesson-info">
            <h4>${escapeHtml(l.title)}</h4>
            <span>${done ? 'Completada' : 'Pendiente'}</span>
          </div>
        </div>`;
    }).join('');

    return `
      <button class="btn btn-outline btn-sm" data-action="go-courses" style="margin-bottom:1rem">← Volver a cursos</button>
      <div class="course-header">
        <h2>${course.icon || ''} ${escapeHtml(course.title)}</h2>
        <p style="color:var(--text-secondary)">${escapeHtml(course.description)}</p>
        <div class="progress-bar" style="margin-top:1rem;max-width:300px">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-text">${pct}% completado</div>
      </div>
      <h3 class="section-title">Lecciones</h3>
      <div class="lessons-list">${lessonsHtml}</div>
      <h3 class="section-title">Cuestionario</h3>
      <div class="card" style="max-width:400px">
        <p>${(course.questions || []).length} preguntas de opción múltiple.</p>
        ${prog.quizDone
          ? `<p style="color:var(--success)">Ya realizado — Puntuación: <strong>${prog.quizScore}%</strong></p>
             <button class="btn btn-secondary btn-sm" data-action="start-quiz">Repetir cuestionario</button>`
          : `<button class="btn btn-primary" data-action="start-quiz">Iniciar cuestionario</button>`}
      </div>`;
  }

  async function renderLesson() {
    await loadCourses();
    const course = coursesCache.find(c => c.id === currentCourseId);
    if (!course || currentLessonIndex == null) return '<p>Lección no encontrada.</p>';
    const lesson = course.lessons[currentLessonIndex];
    if (!lesson) return '<p>Lección no encontrada.</p>';
    const isLast = currentLessonIndex >= course.lessons.length - 1;

    return `
      <button class="btn btn-outline btn-sm" data-action="open-course" data-id="${course.id}" style="margin-bottom:1rem">← Volver al curso</button>
      <div class="lesson-content">
        <h3>${escapeHtml(lesson.title)}</h3>
        ${lesson.content}
      </div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
        <button class="btn btn-primary" data-action="complete-lesson">Marcar como completada y continuar</button>
        ${isLast ? '<button class="btn btn-secondary" data-action="start-quiz">Ir al cuestionario</button>' : ''}
      </div>`;
  }

  async function renderQuiz() {
    await loadCourses();
    const course = coursesCache.find(c => c.id === currentCourseId);
    if (!course || !(course.questions || []).length) {
      return '<p>Este curso no tiene cuestionario.</p><button class="btn btn-secondary" data-action="open-course" data-id="' + currentCourseId + '">Volver</button>';
    }
    quizAnswers = {};
    const questionsHtml = course.questions.map((q, qi) => {
      const opts = q.options.map((opt, oi) => `
        <label class="quiz-option" data-q="${qi}" data-o="${oi}">
          <input type="radio" name="q${qi}" value="${oi}">
          <span class="option-letter">${String.fromCharCode(65 + oi)}</span>
          <span>${escapeHtml(opt)}</span>
        </label>`).join('');
      return `
        <div class="quiz-question" data-qi="${qi}">
          <h4>${qi + 1}. ${escapeHtml(q.q)}</h4>
          <div class="quiz-options">${opts}</div>
        </div>`;
    }).join('');

    return `
      <div class="quiz-container">
        <button class="btn btn-outline btn-sm" data-action="open-course" data-id="${course.id}" style="margin-bottom:1rem">← Volver al curso</button>
        <h3 class="section-title">Cuestionario: ${escapeHtml(course.title)}</h3>
        <p style="color:var(--text-secondary);margin-bottom:1.25rem">Selecciona una respuesta por pregunta y envía al final.</p>
        ${questionsHtml}
        <button class="btn btn-primary" data-action="submit-quiz" style="margin-top:0.5rem">Enviar respuestas</button>
        <div id="quiz-result-area"></div>
      </div>`;
  }

  async function submitQuiz() {
    const course = coursesCache.find(c => c.id === currentCourseId);
    if (!course) return;
    const questions = course.questions;
    let correct = 0;

    questions.forEach((q, qi) => {
      const selected = quizAnswers[qi];
      const isCorrect = selected === q.correct;
      if (isCorrect) correct++;
      const qEl = document.querySelector(`.quiz-question[data-qi="${qi}"]`);
      if (!qEl) return;
      qEl.querySelectorAll('.quiz-option').forEach(opt => {
        const oi = parseInt(opt.dataset.o, 10);
        opt.classList.remove('selected', 'correct', 'incorrect');
        if (oi === q.correct) opt.classList.add('correct');
        if (oi === selected && !isCorrect) opt.classList.add('incorrect');
      });
    });

    const percent = Math.round((correct / questions.length) * 100);
    const passed = percent >= 60;

    try {
      await api('/results', {
        method: 'POST',
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          percent,
          correct,
          total: questions.length
        })
      });
      await refreshMe();
    } catch (e) {
      toast('Error al guardar resultado: ' + e.message, 'error');
    }

    const area = document.getElementById('quiz-result-area');
    if (area) {
      area.innerHTML = `
        <div class="quiz-result ${passed ? 'pass' : 'fail'}" style="margin-top:1.5rem">
          <div class="score-circle">${percent}%</div>
          <h3>${passed ? '¡Bien hecho!' : 'Sigue practicando'}</h3>
          <p>Has acertado ${correct} de ${questions.length} preguntas.</p>
          <button class="btn btn-primary" data-action="open-course" data-id="${course.id}" style="margin-top:1rem">Volver al curso</button>
          <button class="btn btn-secondary" data-action="go-results" style="margin-top:1rem;margin-left:0.5rem">Ver mis resultados</button>
        </div>`;
    }
    document.querySelectorAll('.quiz-option').forEach(o => { o.style.pointerEvents = 'none'; });
    const btn = document.querySelector('[data-action="submit-quiz"]');
    if (btn) btn.disabled = true;
    toast(passed ? 'Cuestionario aprobado' : 'Cuestionario completado', passed ? 'success' : 'info');
  }

  function userLevel() {
    const labs = currentUser.labs || { done: [], xp: 0 };
    const xp = labs.xp || 0;
    const level = Math.min(10, Math.floor(xp / 80) + 1);
    return { xp, level, done: labs.done || [] };
  }

  async function completeLab(labId, xp) {
    try {
      const data = await api('/labs', { method: 'PUT', body: JSON.stringify({ labId, xp }) });
      currentUser.labs = data.labs;
      toast('Laboratorio registrado · +' + (xp || 15) + ' XP', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function renderLabs() {
    await refreshMe();
    const lv = userLevel();
    return `
      <div class="welcome-banner">
        <h2>Nivel ${lv.level} · ${lv.xp} XP</h2>
        <p>Todo es ficticio y solo para practicar. Nunca uses esto contra personas reales.</p>
        <div class="progress-bar" style="max-width:320px;margin-top:0.8rem"><div class="progress-bar-fill" style="width:${Math.min(100, (lv.xp % 80) / 80 * 100)}%"></div></div>
        <div class="progress-text">Labs hechos: ${lv.done.length}</div>
      </div>
      <h3 class="section-title">Misiones interactivas</h3>
      <div class="cards-grid">
        <div class="card">
          <div class="card-icon">🤖</div>
          <h3>Chat con “Alex”</h3>
          <p>Un bot se hace pasar por soporte de TI. Practica no entregar datos.</p>
          <button class="btn btn-primary btn-sm" data-action="lab-chat">Abrir chat</button>
        </div>
        <div class="card">
          <div class="card-icon">💬</div>
          <h3>Mensaje tipo WhatsApp</h3>
          <p>Simula cómo te escribirían para un phishing. Decide qué responder.</p>
          <button class="btn btn-primary btn-sm" data-action="lab-msg">Ver conversación</button>
        </div>
        <div class="card">
          <div class="card-icon">💻</div>
          <h3>Terminal de práctica</h3>
          <p>Comandos seguros de aprendizaje. No es una terminal real del sistema.</p>
          <button class="btn btn-primary btn-sm" data-action="lab-term">Abrir terminal</button>
        </div>
      </div>
      <h3 class="section-title">Ejercicios rápidos</h3>
      <p style="color:var(--text-secondary);margin-bottom:1.5rem">20 ejercicios + 3 misiones. Datos 100% ficticios.</p>

      <div class="lab-card">
        <h3>1. 🎣 Identificar phishing</h3>
        <p>Observa el correo ficticio y decide si es legítimo o phishing.</p>
        <div class="lab-exercise">
          <div class="fake-email">
            <strong>De:</strong> seguridad@banc0-seguro.com<br>
            <strong>Asunto:</strong> URGENTE: Su cuenta será suspendida en 12 horas<br><br>
            Estimado cliente, hemos detectado actividad sospechosa. Verifique su identidad aquí:<br>
            👉 http://banc0-seguro.com-verificar.tk/login<br>
            Si no lo hace en 12 horas, su cuenta será bloqueada.
          </div>
          <div class="lab-options">
            <button class="btn btn-danger btn-sm" data-lab="phishing" data-answer="phish">Es phishing</button>
            <button class="btn btn-secondary btn-sm" data-lab="phishing" data-answer="legit">Es legítimo</button>
          </div>
          <div id="lab-phishing-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>2. 🔗 Analizar URLs ficticias</h3>
        <p>¿Cuál parece más sospechosa?</p>
        <div class="lab-exercise">
          <div class="fake-url">A) https://www.tienda-oficial.com/cuenta</div>
          <div class="fake-url">B) https://www.tienda-oficiaI.com/cuenta (I mayúscula)</div>
          <div class="fake-url">C) https://secure.tienda-oficial.com/login</div>
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="urls" data-answer="A">A</button>
            <button class="btn btn-secondary btn-sm" data-lab="urls" data-answer="B">B</button>
            <button class="btn btn-secondary btn-sm" data-lab="urls" data-answer="C">C</button>
          </div>
          <div id="lab-urls-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>3. 🔑 Detectar contraseñas débiles</h3>
        <p>Selecciona la más débil:</p>
        <div class="lab-exercise">
          <div class="fake-password">1) C0ntr@señaSegura2024!</div>
          <div class="fake-password">2) 123456</div>
          <div class="fake-password">3) MiGatoAzul#Corr3x7</div>
          <div class="fake-password">4) Xk9#mP2$vL8@qR5w</div>
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="passwords" data-answer="1">1</button>
            <button class="btn btn-secondary btn-sm" data-lab="passwords" data-answer="2">2</button>
            <button class="btn btn-secondary btn-sm" data-lab="passwords" data-answer="3">3</button>
            <button class="btn btn-secondary btn-sm" data-lab="passwords" data-answer="4">4</button>
          </div>
          <div id="lab-passwords-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>4. 🎭 Reconocer ingeniería social</h3>
        <p>Un supuesto técnico llama: "Soy de TI. Necesitamos su contraseña para no perder sus archivos. El sistema se reinicia en 10 minutos."</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="social" data-answer="give">Dar la contraseña</button>
            <button class="btn btn-secondary btn-sm" data-lab="social" data-answer="verify">Colgar y verificar por canal oficial</button>
            <button class="btn btn-secondary btn-sm" data-lab="social" data-answer="email">Pedir que envíe un correo</button>
          </div>
          <div id="lab-social-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>5. ⚠️ Identificar comportamientos inseguros</h3>
        <p>¿Cuál es más inseguro?</p>
        <div class="lab-exercise">
          <div class="fake-password">A) Usar gestor de contraseñas y 2FA</div>
          <div class="fake-password">B) Conectar un USB encontrado en el parking al PC del trabajo</div>
          <div class="fake-password">C) Actualizar el sistema regularmente</div>
          <div class="fake-password">D) Revisar permisos de las apps</div>
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="behavior" data-answer="A">A</button>
            <button class="btn btn-secondary btn-sm" data-lab="behavior" data-answer="B">B</button>
            <button class="btn btn-secondary btn-sm" data-lab="behavior" data-answer="C">C</button>
            <button class="btn btn-secondary btn-sm" data-lab="behavior" data-answer="D">D</button>
          </div>
          <div id="lab-behavior-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>6. 📱 Permisos de una app ficticia</h3>
        <p>Una app llamada "Linterna Rápida" pide: cámara, micrófono, contactos, ubicación y SMS. ¿Qué haces?</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="permisos" data-answer="all">Dar todos los permisos</button>
            <button class="btn btn-secondary btn-sm" data-lab="permisos" data-answer="needed">Dar solo lo necesario o no instalarla</button>
            <button class="btn btn-secondary btn-sm" data-lab="permisos" data-answer="ignore">Ignorar y usarla igual</button>
          </div>
          <div id="lab-permisos-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>7. 📶 Wi-Fi pública ficticia</h3>
        <p>Estás en un café. Ves dos redes: "CafeNorte-Gratis" y "CafeNorte_Free_5G". No sabes cuál es la oficial. ¿Qué es más seguro?</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="wifi" data-answer="any">Conectarte a cualquiera</button>
            <button class="btn btn-secondary btn-sm" data-lab="wifi" data-answer="ask">Preguntar al personal y evitar datos sensibles</button>
            <button class="btn btn-secondary btn-sm" data-lab="wifi" data-answer="bank">Entrar al banco en la que tenga mejor señal</button>
          </div>
          <div id="lab-wifi-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>8. 📎 Adjunto sospechoso</h3>
        <p>Correo ficticio: "Factura urgente.zip.exe" de un remitente desconocido. ¿Qué haces?</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="adjunto" data-answer="open">Abrirlo para ver de qué se trata</button>
            <button class="btn btn-secondary btn-sm" data-lab="adjunto" data-answer="delete">No abrirlo y reportarlo / eliminarlo</button>
            <button class="btn btn-secondary btn-sm" data-lab="adjunto" data-answer="forward">Reenviarlo a compañeros para preguntar</button>
          </div>
          <div id="lab-adjunto-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>9. 🔒 Código 2FA ficticio</h3>
        <p>Alguien en un chat dice: "Soy soporte. Envíame el código de 6 dígitos que te acaba de llegar para validar tu cuenta."</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="otp" data-answer="send">Enviar el código</button>
            <button class="btn btn-secondary btn-sm" data-lab="otp" data-answer="no">No enviarlo nunca</button>
            <button class="btn btn-secondary btn-sm" data-lab="otp" data-answer="photo">Mandar captura del mensaje</button>
          </div>
          <div id="lab-otp-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>10. 💬 Mensaje de "premio"</h3>
        <p>SMS ficticio: "¡Ganaste un iPhone! Reclama en http://premio-falso.tk y paga 1 peso de envío."</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="premio" data-answer="click">Entrar y pagar</button>
            <button class="btn btn-secondary btn-sm" data-lab="premio" data-answer="ignore">Ignorarlo. Es una estafa típica</button>
            <button class="btn btn-secondary btn-sm" data-lab="premio" data-answer="data">Dejar nombre y tarjeta "por si acaso"</button>
          </div>
          <div id="lab-premio-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>11. 🖥️ Pantalla bloqueada</h3>
        <p>Sales 10 minutos del aula o la oficina. Tu sesión sigue abierta. ¿Qué es más seguro?</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="lock" data-answer="leave">Dejarla abierta, total vuelves pronto</button>
            <button class="btn btn-secondary btn-sm" data-lab="lock" data-answer="lock">Bloquear la pantalla</button>
            <button class="btn btn-secondary btn-sm" data-lab="lock" data-answer="pass">Escribir la contraseña en un papel al lado</button>
          </div>
          <div id="lab-lock-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>12. 🍪 Cookies y privacidad</h3>
        <p>Un sitio ficticio muestra: "Aceptar todas las cookies" o "Solo las necesarias". ¿Qué es mejor para tu privacidad?</p>
        <div class="lab-exercise">
          <div class="lab-options">
            <button class="btn btn-secondary btn-sm" data-lab="cookies" data-answer="all">Aceptar todas siempre</button>
            <button class="btn btn-secondary btn-sm" data-lab="cookies" data-answer="needed">Elegir solo las necesarias</button>
            <button class="btn btn-secondary btn-sm" data-lab="cookies" data-answer="random">Pulsar lo primero que salga</button>
          </div>
          <div id="lab-cookies-feedback"></div>
        </div>
      </div>

      <div class="lab-card">
        <h3>13. 📞 Voz de un familiar (ficticio)</h3>
        <p>Audio: “Mamá, tuve un accidente, transfiere $8,000 a esta cuenta ya.”</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="voz" data-answer="pay">Transferir ya</button>
          <button class="btn btn-secondary btn-sm" data-lab="voz" data-answer="call">Colgar y marcar yo al número que ya tenía</button>
          <button class="btn btn-secondary btn-sm" data-lab="voz" data-answer="same">Seguir en esa misma llamada</button>
        </div>
        <div id="lab-voz-feedback"></div>
      </div>
      <div class="lab-card">
        <h3>14. 💼 Oferta de trabajo</h3>
        <p>Te piden pagar un “curso de inducción” de $900 para entrar a una empresa ficticia.</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="job" data-answer="pay">Pagar para no perder la vacante</button>
          <button class="btn btn-secondary btn-sm" data-lab="job" data-answer="no">No pagar. Las empresas no cobran por contratarte</button>
        </div>
        <div id="lab-job-feedback"></div>
      </div>
      <div class="lab-card">
        <h3>15. 🏦 QR en un cajero</h3>
        <p>Hay un QR pegado: “Nueva app del banco. Escanea.”</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="qr" data-answer="scan">Escanearlo</button>
          <button class="btn btn-secondary btn-sm" data-lab="qr" data-answer="app">Ignorar el sticker y usar la app que ya tienes</button>
        </div>
        <div id="lab-qr-feedback"></div>
      </div>
      <div class="lab-card">
        <h3>16. 💬 “Soy tu jefe”</h3>
        <p>WhatsApp nuevo: “Estoy en junta, compra 3 tarjetas de regalo y mándame los códigos.”</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="jefe" data-answer="buy">Comprarlas</button>
          <button class="btn btn-secondary btn-sm" data-lab="jefe" data-answer="check">Confirmar por otra vía (llamada o canal interno)</button>
        </div>
        <div id="lab-jefe-feedback"></div>
      </div>
      <div class="lab-card">
        <h3>17. 🧾 SAT / apoyo ficticio</h3>
        <p>SMS: “Tienes un saldo a favor. Da clic y captura tu RFC y NIP.”</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="sat" data-answer="click">Entrar y poner el NIP</button>
          <button class="btn btn-secondary btn-sm" data-lab="sat" data-answer="portal">Entrar solo al portal oficial que escribes tú</button>
        </div>
        <div id="lab-sat-feedback"></div>
      </div>
      <div class="lab-card">
        <h3>18. 💸 Inversión milagrosa</h3>
        <p>“Deposita $2,000 y el bot te regresa $6,000 mañana.”</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="crypto" data-answer="yes">Depositar</button>
          <button class="btn btn-secondary btn-sm" data-lab="crypto" data-answer="no">No. Promesa irreal = estafa</button>
        </div>
        <div id="lab-crypto-feedback"></div>
      </div>
      <div class="lab-card">
        <h3>19. 🖥️ Pop-up de virus</h3>
        <p>Pantalla: “Tu PC está infectada. Llama al 800-55-CEWYX y compra la licencia.”</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="popup" data-answer="call">Llamar y pagar</button>
          <button class="btn btn-secondary btn-sm" data-lab="popup" data-answer="close">Cerrar el navegador. No llamar</button>
        </div>
        <div id="lab-popup-feedback"></div>
      </div>
      <div class="lab-card">
        <h3>20. 🏨 Wi‑Fi del hotel</h3>
        <p>Ves “Hotel_Gratis”, “Hotel-Free-Wifi” y “Hotel_Huespedes”.</p>
        <div class="lab-options">
          <button class="btn btn-secondary btn-sm" data-lab="hotel" data-answer="any">La de más barritas</button>
          <button class="btn btn-secondary btn-sm" data-lab="hotel" data-answer="desk">Preguntar en recepción el nombre exacto</button>
        </div>
        <div id="lab-hotel-feedback"></div>
      </div>`;
  }

  function renderLabChat() {
    return `
      <button class="btn btn-outline btn-sm" data-action="go-labs">← Laboratorios</button>
      <div class="sim-warn">SIMULACIÓN · Personaje ficticio “Alex de TI”. No hay sistema real ni datos reales.</div>
      <div class="chat-sim" id="chat-box">
        <div class="chat-bubble bot"><strong>Alex (TI ficticio)</strong><br>Hola, soy Alex del área de TI. Detectamos un acceso raro en tu cuenta de la empresa ficticia NovaCorp. ¿Puedes confirmar tu usuario?</div>
      </div>
      <div class="chat-actions" id="chat-actions">
        <button class="btn btn-secondary btn-sm" data-chat="give-user">Darle mi usuario</button>
        <button class="btn btn-secondary btn-sm" data-chat="ask-id">Pedirle que se identifique</button>
        <button class="btn btn-primary btn-sm" data-chat="hang">Colgar y llamar a TI por el directorio oficial</button>
      </div>
      <p id="chat-end" class="coach"></p>
      <form id="chat-form" class="composer">
        <input id="chat-in" maxlength="240" placeholder="Escribe tu respuesta…" autocomplete="off">
        <button class="btn btn-primary" type="submit">Enviar</button>
      </form>`;
  }

  function renderLabMsg() {
    return `
      <button class="btn btn-outline btn-sm" data-action="go-labs">← Laboratorios</button>
      <div class="sim-warn">SIMULACIÓN de chat. El paquete, el número y el link son falsos.</div>
      <div class="wa-sim">
        <div class="wa-head">+52 618 555 0199 · “Paquetería MX”</div>
        <div class="wa-msg">Hola buen día 📦 tu envío quedó detenido en aduana ficticia. Paga $12 aquí o se devuelve hoy: http://paq-mx-seguro.tk/pago</div>
        <div class="wa-msg">Si no respondes en 20 min se cancela. Mándame también el código que te llegó por SMS 🙏</div>
      </div>
      <div class="lab-options" style="margin-top:1rem">
        <button class="btn btn-danger btn-sm" data-msg="pay">Pagar y mandar el código</button>
        <button class="btn btn-secondary btn-sm" data-msg="ask">Preguntar de qué paquete se trata</button>
        <button class="btn btn-primary btn-sm" data-msg="ignore">No responder. Verificar en la app oficial</button>
      </div>
      <div id="msg-fb" class="coach"></div>
      <form id="wa-form" class="composer">
        <input id="wa-in" maxlength="240" placeholder="Escribe un mensaje…" autocomplete="off">
        <button class="btn btn-primary" type="submit">Enviar</button>
      </form>`;
  }

  function renderLabTerm() {
    return `
      <button class="btn btn-outline btn-sm" data-action="go-labs">← Laboratorios</button>
      <div class="sim-warn">Terminal FICTICIA. No ejecuta nada en tu computadora ni en el servidor.</div>
      <div class="term" id="term-out">
        <div class="term-ok">Cewyx SOC Lab 2.0 — aislado · ficticio</div>
        <div>Comandos: help, whoami, mail, scan, whois, analyze, phish, banner, clear</div>
      </div>
      <form id="term-form" style="display:flex;gap:0.5rem;margin-top:0.6rem">
        <span style="color:var(--accent)">$</span>
        <input id="term-in" autocomplete="off" placeholder="help">
        <button class="btn btn-primary btn-sm" type="submit">Enter</button>
      </form>`;
  }

  function handleLabAnswer(lab, answer) {
    const feedbacks = {
      phishing: {
        phish: { correct: true, msg: 'Correcto. Dominio sospechoso, urgencia extrema y petición de contraseña. Un banco legítimo no pide la contraseña por correo.' },
        legit: { correct: false, msg: 'Incorrecto. Hay indicios claros de phishing.' }
      },
      urls: {
        A: { correct: false, msg: 'No es la más sospechosa.' },
        B: { correct: true, msg: 'Correcto. Usa una "I" mayúscula que se confunde con "l" (typosquatting).' },
        C: { correct: false, msg: 'Parece un subdominio razonable. La sospechosa es la B.' }
      },
      passwords: {
        1: { correct: false, msg: 'Razonablemente fuerte.' },
        2: { correct: true, msg: 'Correcto. "123456" es una de las más débiles.' },
        3: { correct: false, msg: 'No es la más débil.' },
        4: { correct: false, msg: 'Parece aleatoria y fuerte.' }
      },
      social: {
        give: { correct: false, msg: 'Incorrecto. Nunca des tu contraseña por teléfono.' },
        verify: { correct: true, msg: 'Correcto. Cuelga y verifica por un canal oficial.' },
        email: { correct: false, msg: 'Mejor verifica tú por un canal que inicies.' }
      },
      behavior: {
        A: { correct: false, msg: 'Buena práctica.' },
        B: { correct: true, msg: 'Correcto. Un USB desconocido puede contener malware.' },
        C: { correct: false, msg: 'Excelente práctica.' },
        D: { correct: false, msg: 'Recomendable.' }
      },
      permisos: {
        all: { correct: false, msg: 'Incorrecto. Una linterna no necesita contactos, SMS ni ubicación.' },
        needed: { correct: true, msg: 'Correcto. Da solo lo necesario o no instales apps que piden de más.' },
        ignore: { correct: false, msg: 'Incorrecto. Esos permisos extra pueden usarse para rastrearte o leer datos.' }
      },
      wifi: {
        any: { correct: false, msg: 'Incorrecto. Una de esas redes podría ser falsa (Evil Twin).' },
        ask: { correct: true, msg: 'Correcto. Confirma la red oficial y no hagas banca ni compras ahí si puedes evitarlo.' },
        bank: { correct: false, msg: 'Incorrecto. Mejor señal no significa red segura.' }
      },
      adjunto: {
        open: { correct: false, msg: 'Incorrecto. Un .zip.exe es una señal clásica de malware.' },
        delete: { correct: true, msg: 'Correcto. No lo abras. Elimínalo o repórtalo.' },
        forward: { correct: false, msg: 'Incorrecto. Reenviarlo puede contagiar a más personas.' }
      },
      otp: {
        send: { correct: false, msg: 'Incorrecto. Quien tiene ese código puede entrar a tu cuenta.' },
        no: { correct: true, msg: 'Correcto. El soporte real no te pide el código 2FA por chat.' },
        photo: { correct: false, msg: 'Incorrecto. Una captura también entrega el código.' }
      },
      premio: {
        click: { correct: false, msg: 'Incorrecto. Es una estafa clásica para robar dinero o datos.' },
        ignore: { correct: true, msg: 'Correcto. Los premios reales no llegan por SMS dudosos pidiendo pago.' },
        data: { correct: false, msg: 'Incorrecto. Nunca des tarjeta por un "premio" inesperado.' }
      },
      lock: {
        leave: { correct: false, msg: 'Incorrecto. Alguien podría usar tu sesión.' },
        lock: { correct: true, msg: 'Correcto. Bloquear evita que otros vean o usen tu cuenta.' },
        pass: { correct: false, msg: 'Incorrecto. Un papel con la contraseña es peor.' }
      },
      cookies: {
        all: { correct: false, msg: 'Incorrecto. "Todas" suele incluir rastreadores de publicidad.' },
        needed: { correct: true, msg: 'Correcto. Las necesarias suelen bastar para que el sitio funcione.' },
        random: { correct: false, msg: 'Incorrecto. Vale la pena leer un segundo antes de aceptar.' }
      },
      voz: {
        pay: { correct: false, msg: 'Incorrecto. Puede ser voz clonada. Verifica tú.' },
        call: { correct: true, msg: 'Correcto. Cuelga y marca el número que ya tenías.' },
        same: { correct: false, msg: 'Incorrecto. Quien llama controla la conversación.' }
      },
      job: {
        pay: { correct: false, msg: 'Incorrecto. Cobrar por “dar el empleo” es estafa.' },
        no: { correct: true, msg: 'Correcto. No pagues por que te contraten.' }
      },
      qr: {
        scan: { correct: false, msg: 'Incorrecto. El sticker puede ir a una web falsa.' },
        app: { correct: true, msg: 'Correcto. Usa la app oficial que ya instalaste.' }
      },
      jefe: {
        buy: { correct: false, msg: 'Incorrecto. Pedir tarjetas de regalo es un clásico.' },
        check: { correct: true, msg: 'Correcto. Confirma por otro canal.' }
      },
      sat: {
        click: { correct: false, msg: 'Incorrecto. El NIP no se pone en un link de SMS.' },
        portal: { correct: true, msg: 'Correcto. Entras tú al sitio oficial.' }
      },
      crypto: {
        yes: { correct: false, msg: 'Incorrecto. Nadie multiplica dinero seguro en un día.' },
        no: { correct: true, msg: 'Correcto. Es un gancho de inversión falsa.' }
      },
      popup: {
        call: { correct: false, msg: 'Incorrecto. Es scareware para cobrarte.' },
        close: { correct: true, msg: 'Correcto. Cierras y no llamas a ese número.' }
      },
      hotel: {
        any: { correct: false, msg: 'Incorrecto. Puede ser una red señuelo.' },
        desk: { correct: true, msg: 'Correcto. Confirmas el nombre en recepción.' }
      }
    };
    const result = feedbacks[lab] && feedbacks[lab][answer];
    if (!result) return;
    const fb = document.getElementById('lab-' + lab + '-feedback');
    if (fb) {
      fb.className = 'lab-feedback ' + (result.correct ? 'correct' : 'incorrect');
      fb.textContent = result.msg;
    }
  }

  async function renderProgress() {
    await loadCourses();
    await refreshMe();
    const html = coursesCache.map(c => {
      const pct = getCourseProgressPercent(c.id);
      const prog = getUserProgress(c.id);
      return `
        <div class="card">
          <div class="card-icon">${c.icon || '📘'}</div>
          <h3>${escapeHtml(c.title)}</h3>
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          <div class="progress-text">${pct}% — Lecciones: ${prog.completedLessons.length}/${c.lessons.length}
            ${prog.quizDone ? ` | Quiz: ${prog.quizScore}%` : ' | Quiz pendiente'}</div>
          <button class="btn btn-secondary btn-sm" style="margin-top:0.75rem" data-action="open-course" data-id="${c.id}">Ir al curso</button>
        </div>`;
    }).join('');
    return `<h3 class="section-title">Tu progreso</h3><div class="cards-grid">${html}</div>`;
  }

  async function renderResults() {
    const data = await api('/results');
    const results = (data.results || [])
      .filter(r => r.userId === currentUser.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!results.length) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🏆</div>
          <p>Aún no has completado ningún cuestionario.</p>
          <button class="btn btn-primary" data-action="go-courses" style="margin-top:1rem">Ir a cursos</button>
        </div>`;
    }
    const html = results.map(r => {
      const date = new Date(r.date).toLocaleString('es-ES');
      const pass = r.percent >= 60;
      return `
        <div class="result-item">
          <div>
            <strong>${escapeHtml(r.courseTitle)}</strong>
            <div style="font-size:0.85rem;color:var(--text-muted)">${date} — ${r.correct}/${r.total} correctas</div>
          </div>
          <div class="score ${pass ? 'pass' : 'fail'}">${r.percent}%</div>
        </div>`;
    }).join('');
    return `<h3 class="section-title">Historial de resultados</h3>${html}`;
  }

  function renderProfile() {
    return `
      <div class="card" style="max-width:500px">
        <h3>👤 ${escapeHtml(currentUser.name)}</h3>
        <p style="color:var(--text-secondary);margin:0.5rem 0">${escapeHtml(currentUser.email)}</p>
        <p><span class="badge ${currentUser.role === 'admin' ? 'badge-admin' : 'badge-user'}">${currentUser.role === 'admin' ? 'Administrador' : 'Usuario'}</span></p>
        <p style="font-size:0.85rem;color:var(--text-muted);margin-top:1rem">Cuenta creada: ${new Date(currentUser.createdAt).toLocaleDateString('es-ES')}</p>
      </div>
      <div class="card" style="max-width:500px;margin-top:1rem">
        <h3>Cambiar contraseña</h3>
        <form id="change-pass-form">
          <div class="form-group">
            <label>Contraseña actual</label>
            <input type="password" id="curr-pass" required>
          </div>
          <div class="form-group">
            <label>Nueva contraseña</label>
            <input type="password" id="new-pass" required minlength="6">
          </div>
          <div class="form-group">
            <label>Confirmar nueva</label>
            <input type="password" id="new-pass2" required minlength="6">
          </div>
          <button type="submit" class="btn btn-primary">Actualizar</button>
        </form>
      </div>`;
  }

  async function renderAdminUsers() {
    if (currentUser.role !== 'admin') return '<p>Acceso denegado.</p>';
    const data = await api('/users');
    const users = data.users || [];
    const rows = users.map(u => {
      const xp = (u.labs && u.labs.xp) || 0;
      const lvl = Math.min(10, Math.floor(xp / 80) + 1);
      const labsN = (u.labs && u.labs.done && u.labs.done.length) || 0;
      const coursesN = Object.keys(u.progress || {}).length;
      return `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>Nv. ${lvl} · ${xp} XP</td>
        <td>${labsN} labs · ${coursesN} cursos tocados</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
        <td><span class="badge ${u.blocked ? 'badge-blocked' : 'badge-active'}">${u.blocked ? 'Bloqueado' : 'Activo'}</span></td>
        <td class="actions-cell">
          ${u.id !== currentUser.id ? `
            <button class="btn btn-sm btn-secondary" data-admin="toggle-block" data-id="${u.id}" data-blocked="${u.blocked}">${u.blocked ? 'Desbloquear' : 'Bloquear'}</button>
            <button class="btn btn-sm btn-secondary" data-admin="toggle-role" data-id="${u.id}" data-role="${u.role}">${u.role === 'admin' ? 'Hacer usuario' : 'Hacer admin'}</button>
            <button class="btn btn-sm btn-danger" data-admin="delete-user" data-id="${u.id}">Eliminar</button>
          ` : '<span style="color:var(--text-muted);font-size:0.85rem">Tú</span>'}
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="search-bar">
        <input type="text" id="user-search" placeholder="Buscar por nombre o correo...">
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Nivel</th><th>Progreso</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody id="users-tbody">${rows}</tbody>
        </table>
      </div>
      <p style="color:var(--text-muted);font-size:0.85rem">${users.length} usuario(s) registrado(s) en el servidor</p>`;
  }

  async function renderAdminCourses() {
    if (currentUser.role !== 'admin') return '<p>Acceso denegado.</p>';
    await loadCourses();
    const rows = coursesCache.map(c => `
      <tr>
        <td>${c.icon || '📘'} ${escapeHtml(c.title)}</td>
        <td>${c.lessons.length}</td>
        <td>${(c.questions || []).length}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-secondary" data-admin="edit-course" data-id="${c.id}">Editar</button>
          <button class="btn btn-sm btn-danger" data-admin="delete-course" data-id="${c.id}">Eliminar</button>
        </td>
      </tr>`).join('');

    return `
      <button class="btn btn-primary" data-admin="new-course" style="margin-bottom:1.25rem">+ Crear curso</button>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Título</th><th>Lecciones</th><th>Preguntas</th><th>Acciones</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  async function renderAdminEditCourse() {
    if (currentUser.role !== 'admin') return '<p>Acceso denegado.</p>';
    await loadCourses();
    const isNew = currentCourseId === 'new';
    const course = isNew
      ? { id: 'new', title: '', description: '', icon: '📘', lessons: [], questions: [] }
      : coursesCache.find(c => c.id === currentCourseId);
    if (!course) return '<p>Curso no encontrado.</p>';

    return `
      <button class="btn btn-outline btn-sm" data-action="go-admin-courses" style="margin-bottom:1rem">← Volver</button>
      <h3 class="section-title">${isNew ? 'Crear curso' : 'Editar curso'}</h3>
      <form id="course-form">
        <div class="form-group">
          <label>Título</label>
          <input type="text" id="course-title" value="${escapeHtml(course.title)}" required>
        </div>
        <div class="form-group">
          <label>Icono (emoji)</label>
          <input type="text" id="course-icon" value="${escapeHtml(course.icon || '📘')}" maxlength="4">
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <textarea id="course-desc" rows="3" required>${escapeHtml(course.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Lecciones (JSON)</label>
          <textarea id="course-lessons" rows="8" style="font-family:monospace;font-size:0.85rem">${escapeHtml(JSON.stringify(course.lessons || [], null, 2))}</textarea>
        </div>
        <div class="form-group">
          <label>Preguntas (JSON)</label>
          <textarea id="course-questions" rows="8" style="font-family:monospace;font-size:0.85rem">${escapeHtml(JSON.stringify(course.questions || [], null, 2))}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Guardar curso</button>
      </form>`;
  }

  async function renderAdminResults() {
    if (currentUser.role !== 'admin') return '<p>Acceso denegado.</p>';
    const data = await api('/results');
    const results = (data.results || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!results.length) {
      return '<div class="empty-state"><div class="empty-icon">📋</div><p>Aún no hay resultados.</p></div>';
    }
    const rows = results.map(r => `
      <tr>
        <td>${escapeHtml(r.userName)}</td>
        <td>${escapeHtml(r.courseTitle)}</td>
        <td>${r.percent}%</td>
        <td>${r.correct}/${r.total}</td>
        <td>${new Date(r.date).toLocaleString('es-ES')}</td>
      </tr>`).join('');
    return `
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Curso</th><th>Puntuación</th><th>Aciertos</th><th>Fecha</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ---------- Eventos ----------
  function bindViewEvents() {
    const container = document.getElementById('view-container');

    container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', async () => {
        const action = el.dataset.action;
        const id = el.dataset.id;
        const index = el.dataset.index !== undefined ? parseInt(el.dataset.index, 10) : null;

        switch (action) {
          case 'open-course':
            navigate('course-detail', { courseId: id });
            break;
          case 'open-lesson':
            navigate('lesson', { courseId: currentCourseId, lessonIndex: index });
            break;
          case 'complete-lesson':
            await markLessonComplete(currentCourseId, currentLessonIndex);
            toast('Lección completada', 'success');
            await loadCourses();
            const course = coursesCache.find(c => c.id === currentCourseId);
            if (currentLessonIndex < course.lessons.length - 1) {
              navigate('lesson', { courseId: currentCourseId, lessonIndex: currentLessonIndex + 1 });
            } else {
              navigate('course-detail', { courseId: currentCourseId });
            }
            break;
          case 'start-quiz':
            navigate('quiz', { courseId: currentCourseId });
            break;
          case 'submit-quiz':
            await submitQuiz();
            break;
          case 'go-courses':
            navigate('courses');
            break;
          case 'go-labs':
            navigate('labs');
            break;
          case 'lab-chat':
            navigate('lab-chat');
            break;
          case 'lab-msg':
            navigate('lab-msg');
            break;
          case 'lab-term':
            navigate('lab-term');
            break;
          case 'go-results':
            navigate('results');
            break;
          case 'go-admin-courses':
            navigate('admin-courses');
            break;
        }
      });
    });

    container.querySelectorAll('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const qi = parseInt(opt.dataset.q, 10);
        const oi = parseInt(opt.dataset.o, 10);
        quizAnswers[qi] = oi;
        const parent = opt.closest('.quiz-options');
        parent.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
      });
    });

    container.querySelectorAll('[data-lab]').forEach(btn => {
      btn.addEventListener('click', async () => {
        handleLabAnswer(btn.dataset.lab, btn.dataset.answer);
        const okMap = { phishing: 'phish', urls: 'B', passwords: '2', social: 'verify', behavior: 'B', permisos: 'needed', wifi: 'ask', adjunto: 'delete', otp: 'no', premio: 'ignore', lock: 'lock', cookies: 'needed', voz: 'call', job: 'no', qr: 'app', jefe: 'check', sat: 'portal', crypto: 'no', popup: 'close', hotel: 'desk' };
        if (okMap[btn.dataset.lab] === btn.dataset.answer) await completeLab('quick-' + btn.dataset.lab, 10);
      });
    });

    function alexReply(text) {
      const t = text.toLowerCase();
      const leak = /(contraseña|password|clave|usuario\s*es|mi user|código|codigo|otp|\d{6})/.test(t);
      const safe = /(no te creo|verificar|directorio|oficial|no te la doy|no te doy|llamo a ti|no mando|desconfío|desconfio)/.test(t);
      if (leak) return { html: 'Gracias. Con eso ya “entré”. En un ataque real habrías perdido la cuenta.', bad: true };
      if (safe) return { html: 'Ok… se corta la llamada. Hiciste lo correcto: no entregaste secretos y verificas por otro canal.', good: true };
      if (/quién eres|quien eres|ticket|extensión|extension|jefe/.test(t)) return { html: 'No tengo ticket a la mano. Mira, si no me das la clave en 5 minutos se borran tus archivos. ¿Me la pasas ya?' };
      return { html: 'Te escucho. Necesito usuario, contraseña o el código SMS para “liberar” la cuenta. Date prisa.' };
    }

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-in');
        const text = (input.value || '').trim();
        if (!text) return;
        input.value = '';
        const box = document.getElementById('chat-box');
        const end = document.getElementById('chat-end');
        box.innerHTML += '<div class="chat-bubble me">' + escapeHtml(text) + '</div>';
        const r = alexReply(text);
        box.innerHTML += '<div class="chat-bubble bot"><b>Alex</b><br>' + r.html + '</div>';
        box.scrollTop = box.scrollHeight;
        if (r.bad) end.innerHTML = '<span style="color:var(--danger)">La simulación te pescó. Un TI real no pide contraseña ni 2FA por chat.</span>';
        if (r.good) {
          end.innerHTML = '<span style="color:var(--success)">Bien. Cortaste el engaño.</span>';
          await completeLab('chat-alex', 40);
        }
      });
    }

    container.querySelectorAll('[data-chat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const map = { 'give-user': 'Te paso mi usuario ana.demo y la clave', 'ask-id': '¿Cuál es tu ticket y extensión?', 'hang': 'No te creo. Voy a verificar por el directorio oficial' };
        const input = document.getElementById('chat-in');
        if (input) {
          input.value = map[btn.dataset.chat] || '';
          document.getElementById('chat-form').requestSubmit();
        }
      });
    });

    function waReply(text) {
      const t = text.toLowerCase();
      if (/(pago|código|codigo|tarjeta|clabe|\d{6}|ya pagué|ya pague)/.test(t)) return { html: 'Listo, con ese dato el atacante ficticio ya tiene lo que quería.', bad: true };
      if (/(no|estafa|falso|verificar|app oficial|no doy|no pago)/.test(t)) return { html: '…dejó de responder. Correcto: no pagaste ni diste el código.', good: true };
      return { html: 'Sí sí es tu paquete jaja. El link es seguro 😅 mándame el código para no perderlo.' };
    }

    const waForm = document.getElementById('wa-form');
    if (waForm) {
      waForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('wa-in');
        const text = (input.value || '').trim();
        if (!text) return;
        input.value = '';
        const box = document.getElementById('wa-box');
        const fb = document.getElementById('msg-fb');
        box.innerHTML += '<div class="wa-msg me">' + escapeHtml(text) + '</div>';
        const r = waReply(text);
        box.innerHTML += '<div class="wa-msg">' + r.html + '</div>';
        box.scrollTop = box.scrollHeight;
        if (r.bad) fb.innerHTML = '<span style="color:var(--danger)">Caíste en la simulación. Ese link .tk y el SMS son la trampa.</span>';
        if (r.good) {
          fb.innerHTML = '<span style="color:var(--success)">Bien. En la vida real abrirías la app oficial, no el chat.</span>';
          await completeLab('wa-phish', 35);
        }
      });
    }

    container.querySelectorAll('[data-msg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const map = { pay: 'Ok te pago y te mando el código', ask: '¿De qué paquete hablas?', ignore: 'No, esto parece estafa. Voy a verificar en la app oficial' };
        const input = document.getElementById('wa-in');
        if (input) {
          input.value = map[btn.dataset.msg] || '';
          document.getElementById('wa-form').requestSubmit();
        }
      });
    });

    const termForm = document.getElementById('term-form');
    if (termForm) {
      termForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('term-in');
        const out = document.getElementById('term-out');
        const cmd = (input.value || '').trim().toLowerCase();
        input.value = '';
        const replies = {
          help: 'help whoami mail scan whois analyze phish banner hint clear',
          whoami: 'practica@cewyx-lab  rol=estudiante  red=simulada',
          mail: 'INBOX ficticio\n[!] URGENTE banc0-seguro.com — “valide su clave”\n[!] paq-mx-seguro.tk — cobro $12\n[*] Boletín interno NovaCorp — sin links raros',
          scan: 'scan ficticio 10.0.0.8\n22/tcp closed ssh\n80/tcp open  http\n443/tcp open  https\n445/tcp filtered\n(no escanea tu red real)',
          whois: 'dominio paq-mx-seguro.tk\ncreado: hace 2 días · país: n/d · SSL: no\nriesgo: alto · imita marca',
          analyze: 'reglas: urgencia + link corto + pide OTP = phishing\nacción: no clic · verificar en app oficial',
          phish: 'indicadores: .tk  “20 min”  código SMS  pago mínimo\nveredicto: NO entrar',
          banner: 'CEWYX ████ SOC ████ training only',
          hint: 'TI real no pide password ni OTP por chat.',
          clear: ''
        };
        let key = cmd;
        if (cmd.startsWith('whois')) key = 'whois';
        if (cmd === 'clear') out.innerHTML = '';
        else {
          const body = replies[key] || 'comando desconocido. prueba help';
          out.innerHTML += '<div class="term-cmd">$ ' + escapeHtml(cmd) + '</div><pre class="term-pre">' + escapeHtml(body) + '</pre>';
        }
        out.scrollTop = out.scrollHeight;
        if (key === 'phish' || key === 'scan' || key === 'analyze' || key === 'mail') await completeLab('term-' + key, 12);
      });
    }

    const passForm = document.getElementById('change-pass-form');
    if (passForm) {
      passForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const curr = document.getElementById('curr-pass').value;
        const neu = document.getElementById('new-pass').value;
        const neu2 = document.getElementById('new-pass2').value;
        if (neu !== neu2) return toast('Las contraseñas no coinciden', 'error');
        try {
          await api('/me/password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword: curr, newPassword: neu })
          });
          toast('Contraseña actualizada', 'success');
          passForm.reset();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }

    const searchInput = document.getElementById('user-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase();
        document.querySelectorAll('#users-tbody tr').forEach(tr => {
          const text = tr.textContent.toLowerCase();
          tr.style.display = text.includes(q) ? '' : 'none';
        });
      });
    }

    container.querySelectorAll('[data-admin]').forEach(btn => {
      btn.addEventListener('click', () => handleAdminAction(btn.dataset.admin, btn));
    });

    const courseForm = document.getElementById('course-form');
    if (courseForm) {
      courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCourseFromForm();
      });
    }
  }

  async function handleAdminAction(action, btn) {
    const id = btn.dataset.id;
    try {
      switch (action) {
        case 'toggle-block': {
          const blocked = btn.dataset.blocked === 'true';
          await api('/users/' + id, {
            method: 'PATCH',
            body: JSON.stringify({ blocked: !blocked })
          });
          toast(!blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado', 'info');
          navigate('admin-users');
          break;
        }
        case 'toggle-role': {
          const role = btn.dataset.role === 'admin' ? 'user' : 'admin';
          await api('/users/' + id, {
            method: 'PATCH',
            body: JSON.stringify({ role })
          });
          toast('Rol actualizado a ' + role, 'success');
          navigate('admin-users');
          break;
        }
        case 'delete-user': {
          if (!confirm('¿Eliminar este usuario?')) return;
          await api('/users/' + id, { method: 'DELETE' });
          toast('Usuario eliminado', 'info');
          navigate('admin-users');
          break;
        }
        case 'delete-course': {
          if (!confirm('¿Eliminar este curso?')) return;
          await api('/courses/' + id, { method: 'DELETE' });
          toast('Curso eliminado', 'info');
          navigate('admin-courses');
          break;
        }
        case 'edit-course':
          navigate('admin-edit-course', { courseId: id });
          break;
        case 'new-course':
          navigate('admin-edit-course', { courseId: 'new' });
          break;
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function saveCourseFromForm() {
    const title = document.getElementById('course-title').value.trim();
    const icon = document.getElementById('course-icon').value.trim() || '📘';
    const description = document.getElementById('course-desc').value.trim();
    let lessons, questions;
    try {
      lessons = JSON.parse(document.getElementById('course-lessons').value);
      if (!Array.isArray(lessons)) throw new Error('Lecciones debe ser un array');
    } catch (err) {
      return toast('JSON de lecciones inválido', 'error');
    }
    try {
      questions = JSON.parse(document.getElementById('course-questions').value);
      if (!Array.isArray(questions)) throw new Error('Preguntas debe ser un array');
    } catch (err) {
      return toast('JSON de preguntas inválido', 'error');
    }

    try {
      if (currentCourseId === 'new') {
        await api('/courses', {
          method: 'POST',
          body: JSON.stringify({ title, icon, description, lessons, questions })
        });
        toast('Curso creado', 'success');
      } else {
        await api('/courses/' + currentCourseId, {
          method: 'PUT',
          body: JSON.stringify({ title, icon, description, lessons, questions })
        });
        toast('Curso actualizado', 'success');
      }
      navigate('admin-courses');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal').classList.add('hidden');
  });
  document.querySelector('.modal-backdrop').addEventListener('click', () => {
    document.getElementById('modal').classList.add('hidden');
  });

  // Inicio
  initAuth();
})();
