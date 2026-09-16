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
        case 'labs': container.innerHTML = renderLabs(); break;
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

  function renderLabs() {
    return `
      <h3 class="section-title">Laboratorios educativos</h3>
      <p style="color:var(--text-secondary);margin-bottom:1.5rem">Ejercicios interactivos con datos ficticios.</p>
      <div class="lab-card" id="lab-phishing">
        <h3>🎣 Identificar phishing</h3>
        <p>Observa el correo ficticio y decide si es legítimo o phishing.</p>
        <div class="lab-exercise">
          <div class="fake-email">
            <strong>De:</strong> seguridad@banc0-seguro.com<br>
            <strong>Asunto:</strong> URGENTE: Su cuenta será suspendida en 12 horas<br><br>
            Estimado cliente,<br><br>
            Hemos detectado actividad sospechosa. Debe verificar su identidad haciendo clic e introduciendo usuario y contraseña:<br><br>
            👉 http://banc0-seguro.com-verificar.tk/login<br><br>
            Si no lo hace en 12 horas, su cuenta será bloqueada.<br><br>
            Atentamente, Departamento de Seguridad
          </div>
          <div class="lab-options">
            <button class="btn btn-danger btn-sm" data-lab="phishing" data-answer="phish">Es phishing</button>
            <button class="btn btn-secondary btn-sm" data-lab="phishing" data-answer="legit">Es legítimo</button>
          </div>
          <div id="lab-phishing-feedback"></div>
        </div>
      </div>
      <div class="lab-card" id="lab-urls">
        <h3>🔗 Analizar URLs ficticias</h3>
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
      <div class="lab-card" id="lab-passwords">
        <h3>🔑 Detectar contraseñas débiles</h3>
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
      <div class="lab-card" id="lab-social">
        <h3>🎭 Reconocer ingeniería social</h3>
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
      <div class="lab-card" id="lab-behavior">
        <h3>⚠️ Identificar comportamientos inseguros</h3>
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
      </div>`;
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
    const rows = users.map(u => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
        <td><span class="badge ${u.blocked ? 'badge-blocked' : 'badge-active'}">${u.blocked ? 'Bloqueado' : 'Activo'}</span></td>
        <td class="actions-cell">
          ${u.id !== currentUser.id ? `
            <button class="btn btn-sm btn-secondary" data-admin="toggle-block" data-id="${u.id}" data-blocked="${u.blocked}">${u.blocked ? 'Desbloquear' : 'Bloquear'}</button>
            <button class="btn btn-sm btn-secondary" data-admin="toggle-role" data-id="${u.id}" data-role="${u.role}">${u.role === 'admin' ? 'Hacer usuario' : 'Hacer admin'}</button>
            <button class="btn btn-sm btn-danger" data-admin="delete-user" data-id="${u.id}">Eliminar</button>
          ` : '<span style="color:var(--text-muted);font-size:0.85rem">Tú</span>'}
        </td>
      </tr>`).join('');

    return `
      <div class="search-bar">
        <input type="text" id="user-search" placeholder="Buscar por nombre o correo...">
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
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
      btn.addEventListener('click', () => handleLabAnswer(btn.dataset.lab, btn.dataset.answer));
    });

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
