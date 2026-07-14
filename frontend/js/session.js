// ============================================================
// SESSION.JS
// Maneja el token JWT en el navegador: guardarlo, leerlo, borrarlo,
// y proteger las páginas que requieren estar logueado.
// Debe cargarse ANTES que api.js en cada HTML.
// ============================================================

const TOKEN_KEY = "jwt_token";
const ROLE_KEY = "jwt_role";
const USERNAME_KEY = "jwt_username";

function guardarSesion(token, role, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USERNAME_KEY, username);
}

function getUsername() {
  return localStorage.getItem(USERNAME_KEY);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getRole() {
  return localStorage.getItem(ROLE_KEY);
}

function cerrarSesion() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
  window.location.href = "login.html";
}

// Se ejecuta automáticamente en cada página (menos login.html):
// si no hay token, te manda al login antes de que la página cargue nada.
(function protegerPagina() {
  const esLogin = window.location.pathname.endsWith("login.html");
  if (!esLogin && !getToken()) {
    window.location.href = "login.html";
  }
})();

// Pinta el círculo con la inicial del usuario en el navbar (si la página
// tiene un elemento con id="avatar-usuario"). Se llama sola al cargar
// cada página.
function pintarAvatarUsuario() {
  const avatar = document.getElementById("avatar-usuario");
  if (!avatar) return;

  const username = getUsername();
  const role = getRole();
  if (!username) return;

  avatar.textContent = username.charAt(0).toUpperCase();
  avatar.title = `${username} (${role})`;
}

document.addEventListener("DOMContentLoaded", pintarAvatarUsuario);


