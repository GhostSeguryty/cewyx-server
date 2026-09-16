# Cewyx (versión con servidor)

Plataforma de aprendizaje en ciberseguridad con **backend real**.

- Todos los usuarios se guardan en el servidor
- El administrador ve a **todos** los usuarios y sus resultados
- Funciona en red (varios dispositivos / personas)

## Requisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)

## Cómo arrancar (en tu PC)

```bash
cd Cewyx-Server
npm install
npm start
```

Abre el navegador en:

**http://localhost:3000**

La primera vez verás la pantalla para **crear el administrador**.

## Estructura

```
Cewyx-Server/
├── server.js          ← servidor Express
├── package.json
├── data/              ← se crea solo (users, courses, results en JSON)
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## Publicar en internet

Necesitas un hosting que permita **Node.js** (no solo archivos estáticos):

| Servicio        | Notas                          |
|-----------------|--------------------------------|
| Railway         | Fácil, plan gratuito limitado  |
| Render          | Similar                        |
| Fly.io          | Bueno para apps Node           |
| VPS (DigitalOcean, etc.) | Control total            |

Pasos típicos:

1. Sube la carpeta `Cewyx-Server` al servicio.
2. Comando de instalación: `npm install`
3. Comando de inicio: `npm start`
4. El puerto suele ser la variable `PORT` (ya está contemplada en el código).

## Diferencias con la versión sin servidor

| | Sin servidor (solo index.html) | Con servidor (esta) |
|--|--------------------------------|---------------------|
| Datos | Solo en cada navegador | En el servidor, compartidos |
| Admin ve a otros usuarios | No | Sí |
| Hay que instalar Node | No | Sí |
| Abrir con doble clic | Sí | No (hay que arrancar el servidor) |

## API principal

- `GET  /api/status` — ¿existe admin?
- `POST /api/setup` — crear primer admin
- `POST /api/register` — registro usuario
- `POST /api/login` — login
- `GET  /api/users` — listar usuarios (solo admin)
- `GET  /api/courses` — cursos
- `GET  /api/results` — resultados (admin ve todos)

Las contraseñas se guardan con **bcrypt**.
