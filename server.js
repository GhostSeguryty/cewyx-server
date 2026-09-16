/**
 * Cewyx Server
 * Node.js + Express + JSON storage
 * Ejecutar: npm install && npm start
 * Luego abrir: http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Helpers de archivos ----------
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getUsers() {
  return readJSON(USERS_FILE, []);
}

function saveUsers(users) {
  writeJSON(USERS_FILE, users);
}

function getCourses() {
  const courses = readJSON(COURSES_FILE, null);
  if (courses === null || (Array.isArray(courses) && courses.length === 0 && !fs.existsSync(COURSES_FILE))) {
    const defaults = getDefaultCourses();
    writeJSON(COURSES_FILE, defaults);
    return defaults;
  }
  return courses;
}

function saveCourses(courses) {
  writeJSON(COURSES_FILE, courses);
}

function getResults() {
  return readJSON(RESULTS_FILE, []);
}

function saveResults(results) {
  writeJSON(RESULTS_FILE, results);
}

function findUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  return getUsers().find(u => u.id === id);
}

function hasAdmin() {
  return getUsers().some(u => u.role === 'admin');
}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

// ---------- Cursos por defecto ----------
function getDefaultCourses() {
  return [
    {
      id: 'c1',
      title: 'Fundamentos de Ciberseguridad',
      description: 'Aprende los conceptos básicos de la seguridad digital, amenazas comunes y cómo protegerte en el día a día.',
      icon: '🔐',
      lessons: [
        {
          title: '¿Qué es la ciberseguridad?',
          content: `<p>La <strong>ciberseguridad</strong> es el conjunto de prácticas, tecnologías y procesos diseñados para proteger sistemas, redes y datos de ataques digitales.</p>
          <p>Su objetivo principal es garantizar tres pilares fundamentales:</p>
          <ul>
            <li><strong>Confidencialidad:</strong> Solo las personas autorizadas pueden acceder a la información.</li>
            <li><strong>Integridad:</strong> Los datos no deben ser modificados de forma no autorizada.</li>
            <li><strong>Disponibilidad:</strong> Los sistemas y datos deben estar accesibles cuando se necesiten.</li>
          </ul>
          <div class="tip-box">💡 Tip: Estos tres principios se conocen como la <strong>tríada CIA</strong> (Confidentiality, Integrity, Availability).</div>`
        },
        {
          title: 'Tipos de amenazas',
          content: `<p>Las amenazas cibernéticas más comunes incluyen:</p>
          <ul>
            <li><strong>Malware:</strong> Software malicioso (virus, ransomware, troyanos).</li>
            <li><strong>Phishing:</strong> Intentos de engañar a usuarios para robar credenciales.</li>
            <li><strong>Ataques de denegación de servicio (DoS/DDoS):</strong> Sobrecargar un sistema para dejarlo inutilizable.</li>
            <li><strong>Ingeniería social:</strong> Manipulación psicológica para obtener información.</li>
            <li><strong>Ataques de fuerza bruta:</strong> Intentar muchas contraseñas hasta acertar.</li>
          </ul>
          <div class="warning-box">⚠️ Nunca subestimes las amenazas simples: muchas brechas empiezan con un correo engañoso o una contraseña débil.</div>`
        },
        {
          title: 'Buenas prácticas básicas',
          content: `<p>Algunas recomendaciones esenciales:</p>
          <ol>
            <li>Usa contraseñas fuertes y únicas para cada servicio.</li>
            <li>Activa la autenticación de dos factores (2FA) siempre que sea posible.</li>
            <li>Mantén el software y sistemas operativos actualizados.</li>
            <li>Desconfía de correos o mensajes inesperados que pidan datos personales.</li>
            <li>Realiza copias de seguridad periódicas de información importante.</li>
            <li>Utiliza redes Wi-Fi seguras y evita las públicas para operaciones sensibles.</li>
          </ol>`
        }
      ],
      questions: [
        { q: '¿Cuáles son los tres pilares de la ciberseguridad (tríada CIA)?', options: ['Confidencialidad, Integridad y Disponibilidad', 'Control, Identidad y Acceso', 'Cifrado, Identificación y Autenticación', 'Código, Internet y Antivirus'], correct: 0 },
        { q: '¿Qué es el phishing?', options: ['Un tipo de malware que cifra archivos', 'Un intento de engañar para robar credenciales', 'Un ataque que sobrecarga servidores', 'Un firewall avanzado'], correct: 1 },
        { q: '¿Cuál de estas es una buena práctica de seguridad?', options: ['Usar la misma contraseña en todos lados', 'Compartir contraseñas con amigos de confianza', 'Activar la autenticación de dos factores', 'Abrir todos los enlaces de correos promocionales'], correct: 2 },
        { q: '¿Qué significa que un sistema tenga "disponibilidad"?', options: ['Que solo admins pueden acceder', 'Que los datos no se modifican', 'Que está accesible cuando se necesita', 'Que está cifrado'], correct: 2 }
      ]
    },
    {
      id: 'c2',
      title: 'Contraseñas Seguras',
      description: 'Domina la creación y gestión de contraseñas robustas, gestores de contraseñas y autenticación multifactor.',
      icon: '🔑',
      lessons: [
        {
          title: 'Características de una contraseña fuerte',
          content: `<p>Una contraseña segura debe cumplir varios requisitos:</p>
          <ul>
            <li><strong>Longitud:</strong> Al menos 12-16 caracteres (mejor si es más larga).</li>
            <li><strong>Complejidad:</strong> Mezcla de mayúsculas, minúsculas, números y símbolos.</li>
            <li><strong>Impredecible:</strong> Evita palabras del diccionario, fechas de cumpleaños o secuencias obvias.</li>
            <li><strong>Única:</strong> Nunca reutilices la misma contraseña en varios sitios.</li>
          </ul>
          <div class="tip-box">💡 Una frase de contraseña (passphrase) como "Gato!Azul#Corre2024" es más fácil de recordar y más segura.</div>`
        },
        {
          title: 'Gestores de contraseñas',
          content: `<p>Los gestores de contraseñas almacenan de forma cifrada todas tus credenciales. Solo necesitas recordar una contraseña maestra.</p>
          <ul>
            <li>Generan contraseñas aleatorias y fuertes automáticamente.</li>
            <li>Rellenan formularios de forma segura.</li>
            <li>Detectan contraseñas reutilizadas o comprometidas.</li>
          </ul>`
        },
        {
          title: 'Autenticación multifactor (MFA / 2FA)',
          content: `<p>La autenticación de dos factores añade una capa extra: además de la contraseña, necesitas un segundo factor.</p>
          <ul>
            <li><strong>Algo que sabes:</strong> Contraseña o PIN.</li>
            <li><strong>Algo que tienes:</strong> Teléfono, token, llave física.</li>
            <li><strong>Algo que eres:</strong> Huella, reconocimiento facial.</li>
          </ul>
          <p>Las apps de autenticación (TOTP) son más seguras que los SMS.</p>`
        }
      ],
      questions: [
        { q: '¿Cuál es la longitud mínima recomendada para una contraseña moderna?', options: ['6 caracteres', '8 caracteres', '12-16 caracteres', '4 dígitos'], correct: 2 },
        { q: '¿Por qué no se debe reutilizar contraseñas?', options: ['Porque ocupan más espacio', 'Si una se filtra, atacan todas las cuentas', 'Porque es más lento escribirlas', 'No hay problema en reutilizarlas'], correct: 1 },
        { q: '¿Qué es más seguro como segundo factor?', options: ['Código por SMS', 'App de autenticación (TOTP)', 'Pregunta de seguridad', 'Nombre de la mascota'], correct: 1 },
        { q: '¿Qué ventaja principal tiene un gestor de contraseñas?', options: ['Hace las contraseñas más cortas', 'Permite recordar solo una maestra y generar fuertes', 'Elimina la necesidad de 2FA', 'Acelera el internet'], correct: 1 }
      ]
    },
    {
      id: 'c3',
      title: 'Phishing',
      description: 'Identifica y evita los intentos de phishing: correos falsos, sitios fraudulentos y técnicas de engaño.',
      icon: '🎣',
      lessons: [
        {
          title: '¿Qué es el phishing?',
          content: `<p>El <strong>phishing</strong> es una técnica de ingeniería social donde el atacante se hace pasar por una entidad legítima para engañarte y obtener datos sensibles.</p>
          <p>Puede llegar por correo, SMS (smishing), redes sociales o llamadas (vishing).</p>`
        },
        {
          title: 'Señales de alerta',
          content: `<ul>
            <li>Remitente sospechoso o dominio alterado.</li>
            <li>Urgencia artificial: "Tu cuenta será bloqueada en 24 horas".</li>
            <li>Errores ortográficos o redacción poco profesional.</li>
            <li>Enlaces que no coinciden con el sitio oficial.</li>
            <li>Solicitud de contraseñas o datos personales por correo.</li>
          </ul>
          <div class="tip-box">💡 Verifica la URL completa. Escribe la dirección del sitio oficial manualmente.</div>`
        },
        {
          title: 'Qué hacer si sospechas de un phishing',
          content: `<ol>
            <li>No hagas clic en enlaces ni descargues adjuntos.</li>
            <li>No respondas con información personal.</li>
            <li>Reporta el mensaje.</li>
            <li>Si ya introdujiste datos, cambia contraseñas y activa 2FA.</li>
          </ol>`
        }
      ],
      questions: [
        { q: '¿Cuál es una señal típica de phishing?', options: ['Correo con diseño profesional y sin errores', 'Urgencia extrema y dominio sospechoso', 'Enlace al sitio oficial verificado', 'Solicitud de feedback'], correct: 1 },
        { q: 'Si recibes un correo del "banco" pidiendo tu contraseña, ¿qué debes hacer?', options: ['Responder con los datos', 'Hacer clic en el enlace', 'No responder y verificar entrando al sitio oficial', 'Reenviar el correo'], correct: 2 },
        { q: '¿Qué es el smishing?', options: ['Phishing por correo', 'Phishing por SMS', 'Un tipo de malware', 'Un antivirus'], correct: 1 },
        { q: '¿Por qué es peligroso hacer clic en enlaces de correos sospechosos?', options: ['Pueden llevar a sitios falsos que roban credenciales', 'Solo gastan datos', 'No hay peligro', 'Ralentizan el ordenador'], correct: 0 }
      ]
    },
    {
      id: 'c4',
      title: 'Ingeniería Social',
      description: 'Comprende cómo los atacantes manipulan psicológicamente a las personas para obtener acceso o información.',
      icon: '🎭',
      lessons: [
        {
          title: 'Principios de la ingeniería social',
          content: `<p>La ingeniería social explota la confianza, el miedo o la urgencia. No ataca sistemas, sino a las personas.</p>
          <ul>
            <li><strong>Autoridad:</strong> Se hacen pasar por jefes o soporte técnico.</li>
            <li><strong>Urgencia:</strong> Crean presión de tiempo.</li>
            <li><strong>Escasez:</strong> Ofertas limitadas o amenazas de pérdida.</li>
            <li><strong>Reciprocidad:</strong> Dan algo para pedir algo a cambio.</li>
          </ul>`
        },
        {
          title: 'Técnicas comunes',
          content: `<ul>
            <li><strong>Pretexting:</strong> Inventar un escenario creíble.</li>
            <li><strong>Baiting:</strong> USB infectados u ofertas atractivas.</li>
            <li><strong>Tailgating:</strong> Seguir a alguien a una zona restringida.</li>
            <li><strong>Quid pro quo:</strong> Ofrecer un servicio falso a cambio de acceso.</li>
          </ul>`
        },
        {
          title: 'Cómo defenderse',
          content: `<ol>
            <li>Verifica la identidad de quien pide información sensible.</li>
            <li>No te dejes presionar por urgencias artificiales.</li>
            <li>No conectes dispositivos desconocidos.</li>
            <li>Reporta intentos sospechosos.</li>
          </ol>`
        }
      ],
      questions: [
        { q: '¿Qué es el pretexting?', options: ['Usar malware', 'Inventar un escenario falso para obtener información', 'Ataque de fuerza bruta', 'Cifrar archivos'], correct: 1 },
        { q: 'Un atacante te llama haciéndose pasar por soporte técnico y pide tu contraseña. ¿Qué principio usa?', options: ['Escasez', 'Autoridad', 'Reciprocidad', 'Curiosidad'], correct: 1 },
        { q: '¿Qué es el tailgating?', options: ['Seguir a alguien autorizado para entrar a una zona restringida', 'Enviar correos masivos', 'Robar contraseñas por red', 'Instalar keyloggers'], correct: 0 },
        { q: 'La mejor defensa contra la ingeniería social es:', options: ['Solo antivirus', 'Concienciación, verificación y no ceder a urgencias', 'Desconectar internet', 'Contraseñas de 4 dígitos'], correct: 1 }
      ]
    },
    {
      id: 'c5',
      title: 'Seguridad de Redes',
      description: 'Conceptos básicos de redes seguras, Wi-Fi, firewalls y protección en conexiones públicas.',
      icon: '🌐',
      lessons: [
        {
          title: 'Redes y riesgos básicos',
          content: `<p>En redes no protegidas un atacante puede interceptar tráfico (Man-in-the-Middle).</p>
          <p>Riesgos en Wi-Fi públicas:</p>
          <ul>
            <li>Redes falsas (Evil Twin).</li>
            <li>Interceptación de datos no cifrados.</li>
            <li>Malware a través de portales cautivos.</li>
          </ul>`
        },
        {
          title: 'Protección en redes',
          content: `<ul>
            <li>Usa siempre HTTPS.</li>
            <li>Considera una VPN de confianza en redes públicas.</li>
            <li>Desactiva la conexión automática a Wi-Fi abiertas.</li>
            <li>En casa usa WPA3 (o WPA2) y cambia la contraseña del router.</li>
          </ul>`
        },
        {
          title: 'Segmentación y mínimo privilegio',
          content: `<ul>
            <li><strong>Segmentación:</strong> Separar zonas de red.</li>
            <li><strong>Mínimo privilegio:</strong> Solo los permisos necesarios.</li>
            <li><strong>Monitoreo:</strong> Detectar comportamientos anómalos.</li>
          </ul>`
        }
      ],
      questions: [
        { q: '¿Qué riesgo principal tienen las Wi-Fi públicas?', options: ['Son más lentas', 'Posible interceptación de datos y redes falsas', 'Gastan más batería', 'No permiten HTTPS'], correct: 1 },
        { q: '¿Para qué sirve principalmente una VPN en una red pública?', options: ['Acelerar la conexión', 'Cifrar el tráfico frente a posibles atacantes en la red', 'Bloquear anuncios', 'Cambiar el color del navegador'], correct: 1 },
        { q: '¿Qué protocolo de seguridad Wi-Fi es más recomendable?', options: ['WEP', 'WPA', 'WPA2 / WPA3', 'Sin contraseña'], correct: 2 },
        { q: 'El principio de mínimo privilegio significa:', options: ['Dar todos los permisos a todos', 'Dar solo los permisos necesarios', 'No usar contraseñas', 'Desactivar el firewall'], correct: 1 }
      ]
    },
    {
      id: 'c6',
      title: 'Malware',
      description: 'Conoce los distintos tipos de software malicioso y cómo prevenir infecciones.',
      icon: '🦠',
      lessons: [
        {
          title: 'Tipos de malware',
          content: `<ul>
            <li><strong>Virus:</strong> Se adhiere a archivos.</li>
            <li><strong>Gusanos:</strong> Se replican por la red.</li>
            <li><strong>Troyanos:</strong> Parecen legítimos pero son maliciosos.</li>
            <li><strong>Ransomware:</strong> Cifra archivos y exige rescate.</li>
            <li><strong>Spyware / Keyloggers:</strong> Roban información.</li>
          </ul>`
        },
        {
          title: 'Cómo se propaga',
          content: `<ul>
            <li>Descargas de sitios no confiables.</li>
            <li>Adjuntos de correo y macros.</li>
            <li>USB infectados.</li>
            <li>Vulnerabilidades no parcheadas.</li>
          </ul>`
        },
        {
          title: 'Prevención y respuesta',
          content: `<ol>
            <li>Mantén el sistema actualizado.</li>
            <li>Usa antivirus de buena reputación.</li>
            <li>No descargues de fuentes dudosas.</li>
            <li>Haz copias de seguridad regulares.</li>
          </ol>
          <div class="warning-box">⚠️ Ante ransomware, no se recomienda pagar el rescate.</div>`
        }
      ],
      questions: [
        { q: '¿Qué hace el ransomware?', options: ['Acelera el PC', 'Cifra archivos y pide un rescate', 'Limpia el disco', 'Actualiza el sistema'], correct: 1 },
        { q: '¿Cuál es una vía común de infección?', options: ['Actualizar el sistema', 'Descargar de sitios no confiables o abrir adjuntos sospechosos', 'Usar gestor de contraseñas', 'Activar 2FA'], correct: 1 },
        { q: '¿Qué tipo de malware registra las teclas?', options: ['Ransomware', 'Keylogger / Spyware', 'Adware', 'Gusano'], correct: 1 },
        { q: 'Ante un ransomware, la recomendación es:', options: ['Pagar inmediatamente', 'No pagar, restaurar desde backups y reportar', 'Formatear y olvidarse', 'Publicar la clave'], correct: 1 }
      ]
    },
    {
      id: 'c7',
      title: 'Privacidad Digital',
      description: 'Protege tu huella digital, configura privacidad en servicios y entiende el rastreo en línea.',
      icon: '🕵️',
      lessons: [
        {
          title: 'Tu huella digital',
          content: `<p>Todo lo que haces en internet deja rastros: búsquedas, likes, ubicaciones, dispositivos.</p>
          <ul>
            <li>Datos que compartes voluntariamente.</li>
            <li>Datos recolectados automáticamente (cookies, fingerprinting).</li>
            <li>Datos inferidos (intereses, hábitos).</li>
          </ul>`
        },
        {
          title: 'Buenas prácticas de privacidad',
          content: `<ul>
            <li>Ajusta la configuración de privacidad de redes y servicios.</li>
            <li>Usa navegación privada cuando no quieras historial local (no te hace anónimo).</li>
            <li>Limita permisos de las apps (ubicación, micrófono, contactos).</li>
            <li>Piensa antes de publicar información sensible.</li>
          </ul>`
        },
        {
          title: 'Herramientas y hábitos',
          content: `<ol>
            <li>Buscadores y navegadores orientados a privacidad.</li>
            <li>Revisar apps y sitios con acceso a tus cuentas (OAuth).</li>
            <li>No reutilizar el mismo perfil en todos lados si buscas separación.</li>
          </ol>`
        }
      ],
      questions: [
        { q: '¿Qué es la huella digital?', options: ['Solo tu contraseña', 'El rastro de datos que dejas al usar internet', 'Un tipo de malware', 'El número de serie del PC'], correct: 1 },
        { q: 'La navegación privada del navegador:', options: ['Te hace anónimo en internet', 'No guarda historial local, pero el tráfico sigue visible para la red/ISP', 'Bloquea todo el rastreo', 'Cifra todo'], correct: 1 },
        { q: '¿Qué deberías revisar periódicamente?', options: ['Solo el antivirus', 'Permisos de apps y accesos OAuth', 'El color del tema', 'La velocidad del Wi-Fi'], correct: 1 },
        { q: 'Publicar fotos de documentos puede ser riesgoso porque:', options: ['Ocupan espacio', 'Pueden contener datos personales aprovechables', 'Bajan la calidad', 'No hay riesgo'], correct: 1 }
      ]
    },
    {
      id: 'c8',
      title: 'Seguridad de Dispositivos',
      description: 'Protege ordenadores, móviles y otros dispositivos: actualizaciones, cifrado y configuración segura.',
      icon: '📱',
      lessons: [
        {
          title: 'Actualizaciones y parches',
          content: `<p>Las actualizaciones suelen incluir correcciones de seguridad. Retrasarlas deja ventanas abiertas a explotaciones conocidas.</p>
          <ul>
            <li>Activa actualizaciones automáticas cuando sea posible.</li>
            <li>No ignores avisos de apps críticas.</li>
          </ul>`
        },
        {
          title: 'Cifrado y bloqueo',
          content: `<ul>
            <li>Activa el bloqueo de pantalla (PIN, huella, rostro).</li>
            <li>Cifra el almacenamiento del dispositivo.</li>
            <li>En móviles, activa búsqueda y borrado remoto.</li>
            <li>No dejes sesiones abiertas en equipos compartidos.</li>
          </ul>`
        },
        {
          title: 'Apps y permisos',
          content: `<p>Instala solo desde tiendas oficiales o fuentes de confianza. Revisa los permisos que solicitan.</p>
          <p>Desinstala lo que no uses y revisa permisos periódicamente.</p>`
        }
      ],
      questions: [
        { q: '¿Por qué son importantes las actualizaciones de seguridad?', options: ['Solo cambian el diseño', 'Corrigen vulnerabilidades explotables', 'Siempre hacen el dispositivo más lento', 'No tienen relación con la seguridad'], correct: 1 },
        { q: 'Si pierdes el móvil, ¿qué te ayuda a proteger los datos?', options: ['Dejarlo sin PIN', 'Cifrado + bloqueo + borrado remoto', 'Tener muchas apps', 'Misma contraseña en todo'], correct: 1 },
        { q: '¿Qué deberías hacer con los permisos de las apps?', options: ['Conceder todos siempre', 'Revisarlos y dar solo los necesarios', 'Ignorarlos', 'Desactivar internet'], correct: 1 },
        { q: 'Instalar apps fuera de las tiendas oficiales:', options: ['Siempre es más seguro', 'Aumenta el riesgo de malware', 'No tiene efecto', 'Mejora el rendimiento'], correct: 1 }
      ]
    }
  ];
}

// ---------- Middleware de sesión simple (token en header) ----------
// Tokens en memoria: { token: userId }
const sessions = new Map();

function createSession(userId) {
  const token = uuidv4();
  sessions.set(token, userId);
  return token;
}

function getUserFromRequest(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !sessions.has(token)) return null;
  return findUserById(sessions.get(token));
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  if (user.blocked) return res.status(403).json({ error: 'Cuenta bloqueada' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Se requiere administrador' });
    next();
  });
}

// ---------- API: Estado inicial ----------
app.get('/api/status', (req, res) => {
  ensureDataDir();
  getCourses(); // asegura cursos por defecto
  res.json({
    hasAdmin: hasAdmin(),
    ok: true
  });
});

// ---------- API: Setup (primer admin) ----------
app.post('/api/setup', async (req, res) => {
  if (hasAdmin()) {
    return res.status(400).json({ error: 'Ya existe un administrador' });
  }
  const { name, email, password } = req.body || {};
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nombre inválido' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Correo inválido' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' });

  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Ese correo ya está registrado' });
  }

  const hash = await bcrypt.hash(password, 10);
  const admin = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hash,
    role: 'admin',
    blocked: false,
    progress: {},
    createdAt: new Date().toISOString()
  };
  users.push(admin);
  saveUsers(users);
  getCourses();

  const token = createSession(admin.id);
  res.json({ token, user: publicUser(admin) });
});

// ---------- API: Registro ----------
app.post('/api/register', async (req, res) => {
  if (!hasAdmin()) {
    return res.status(400).json({ error: 'Primero debe crearse el administrador' });
  }
  const { name, email, password } = req.body || {};
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nombre inválido' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Correo inválido' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' });

  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Ese correo ya está registrado' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hash,
    role: 'user',
    blocked: false,
    progress: {},
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);

  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

// ---------- API: Login ----------
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

  const user = findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  if (user.blocked) return res.status(403).json({ error: 'Tu cuenta está bloqueada' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

  const token = createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

// ---------- API: Logout ----------
app.post('/api/logout', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) sessions.delete(token);
  res.json({ ok: true });
});

// ---------- API: Me ----------
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ---------- API: Cambiar contraseña ----------
app.post('/api/me/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const ok = await bcrypt.compare(currentPassword, req.user.password);
  if (!ok) return res.status(400).json({ error: 'Contraseña actual incorrecta' });

  const users = getUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  users[idx].password = await bcrypt.hash(newPassword, 10);
  saveUsers(users);
  res.json({ ok: true });
});

// ---------- API: Progreso ----------
app.get('/api/progress', requireAuth, (req, res) => {
  res.json({ progress: req.user.progress || {} });
});

app.put('/api/progress/:courseId', requireAuth, (req, res) => {
  const { courseId } = req.params;
  const data = req.body || {};
  const users = getUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (!users[idx].progress) users[idx].progress = {};
  users[idx].progress[courseId] = {
    completedLessons: data.completedLessons || [],
    quizScore: data.quizScore ?? null,
    quizDone: !!data.quizDone
  };
  saveUsers(users);
  res.json({ progress: users[idx].progress[courseId] });
});

// ---------- API: Cursos ----------
app.get('/api/courses', requireAuth, (req, res) => {
  res.json({ courses: getCourses() });
});

app.get('/api/courses/:id', requireAuth, (req, res) => {
  const course = getCourses().find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
  res.json({ course });
});

app.post('/api/courses', requireAdmin, (req, res) => {
  const { title, description, icon, lessons, questions } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'Título y descripción requeridos' });

  const courses = getCourses();
  const course = {
    id: uuidv4(),
    title: title.trim(),
    description: description.trim(),
    icon: icon || '📘',
    lessons: Array.isArray(lessons) ? lessons : [],
    questions: Array.isArray(questions) ? questions : []
  };
  courses.push(course);
  saveCourses(courses);
  res.json({ course });
});

app.put('/api/courses/:id', requireAdmin, (req, res) => {
  const courses = getCourses();
  const idx = courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Curso no encontrado' });

  const { title, description, icon, lessons, questions } = req.body || {};
  if (title) courses[idx].title = title.trim();
  if (description) courses[idx].description = description.trim();
  if (icon !== undefined) courses[idx].icon = icon;
  if (Array.isArray(lessons)) courses[idx].lessons = lessons;
  if (Array.isArray(questions)) courses[idx].questions = questions;

  saveCourses(courses);
  res.json({ course: courses[idx] });
});

app.delete('/api/courses/:id', requireAdmin, (req, res) => {
  let courses = getCourses();
  const before = courses.length;
  courses = courses.filter(c => c.id !== req.params.id);
  if (courses.length === before) return res.status(404).json({ error: 'Curso no encontrado' });
  saveCourses(courses);
  res.json({ ok: true });
});

// ---------- API: Resultados (quiz) ----------
app.get('/api/results', requireAuth, (req, res) => {
  const results = getResults();
  if (req.user.role === 'admin') {
    return res.json({ results });
  }
  res.json({ results: results.filter(r => r.userId === req.user.id) });
});

app.post('/api/results', requireAuth, (req, res) => {
  const { courseId, courseTitle, percent, correct, total } = req.body || {};
  if (!courseId || percent == null) return res.status(400).json({ error: 'Datos incompletos' });

  const results = getResults();
  const entry = {
    id: uuidv4(),
    userId: req.user.id,
    userName: req.user.name,
    courseId,
    courseTitle: courseTitle || '',
    percent: Number(percent),
    correct: Number(correct) || 0,
    total: Number(total) || 0,
    date: new Date().toISOString()
  };
  results.push(entry);
  saveResults(results);

  // Actualizar progreso del usuario
  const users = getUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx !== -1) {
    if (!users[idx].progress) users[idx].progress = {};
    if (!users[idx].progress[courseId]) {
      users[idx].progress[courseId] = { completedLessons: [], quizScore: null, quizDone: false };
    }
    users[idx].progress[courseId].quizDone = true;
    users[idx].progress[courseId].quizScore = Number(percent);
    saveUsers(users);
  }

  res.json({ result: entry });
});

// ---------- API: Admin usuarios ----------
app.get('/api/users', requireAdmin, (req, res) => {
  const users = getUsers().map(publicUser);
  res.json({ users });
});

app.patch('/api/users/:id', requireAdmin, (req, res) => {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (users[idx].id === req.user.id) {
    return res.status(400).json({ error: 'No puedes modificar tu propia cuenta así' });
  }

  const { blocked, role } = req.body || {};
  if (typeof blocked === 'boolean') users[idx].blocked = blocked;
  if (role === 'admin' || role === 'user') users[idx].role = role;

  saveUsers(users);
  res.json({ user: publicUser(users[idx]) });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  }
  let users = getUsers();
  const before = users.length;
  users = users.filter(u => u.id !== req.params.id);
  if (users.length === before) return res.status(404).json({ error: 'Usuario no encontrado' });
  saveUsers(users);

  let results = getResults().filter(r => r.userId !== req.params.id);
  saveResults(results);

  res.json({ ok: true });
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start ----------
ensureDataDir();
getCourses();

app.listen(PORT, () => {
  console.log('');
  console.log('  🛡️  Cewyx Server');
  console.log('  ----------------');
  console.log(`  Abre en el navegador: http://localhost:${PORT}`);
  console.log('');
  console.log('  Ctrl+C para detener');
  console.log('');
});
