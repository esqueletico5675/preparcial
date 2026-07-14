document.addEventListener("DOMContentLoaded", () => {
  if (getToken()) {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("form-login").addEventListener("submit", hacerLogin);
});

async function hacerLogin(evento) {
  evento.preventDefault();

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const boton = document.getElementById("btn-login");

  const cuerpo = new URLSearchParams();
  cuerpo.append("username", username);
  cuerpo.append("password", password);

  boton.disabled = true;
  boton.textContent = "Ingresando...";

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: cuerpo,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Usuario o contraseña incorrectos");
    }

    const data = await response.json();
    guardarSesion(data.access_token, data.role, data.username);
    window.location.href = "index.html";
  } catch (error) {
    mostrarError(error);
    boton.disabled = false;
    boton.textContent = "Ingresar";
  }
}