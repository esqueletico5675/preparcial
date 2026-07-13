// ============================================================
// SESSION.JS
// Maneja el token JWT en el navegador: guardarlo, leerlo, borrarlo,
// y proteger las páginas que requieren estar logueado.
// Debe cargarse ANTES que api.js en cada HTML.
// ============================================================

const TOKEN_KEY = "jwt_token";
const ROLE_KEY = "jwt_role";

function guardarSesion(token, role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
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