async function apiRequest(path, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  const token = getToken();
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);

  if (response.status === 401) {
    cerrarSesion(); // token inválido o expirado -> vuelve al login
    throw new Error("Sesión expirada, inicia sesión de nuevo");
  }

  if (!response.ok) {
    let mensaje = `Error ${response.status}`;
    try {
      const data = await response.json();
      if (data.detail) mensaje = data.detail;
    } catch (e) {}
    throw new Error(mensaje);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Atajos para cada método HTTP
const apiGet = (path) => apiRequest(path, "GET");
const apiPost = (path, body) => apiRequest(path, "POST", body);
const apiPatch = (path, body) => apiRequest(path, "PATCH", body);
const apiDelete = (path) => apiRequest(path, "DELETE");

// ============================================================
// UI helpers: mostrar mensajes de éxito / error con Bootstrap
// ============================================================

function mostrarAlerta(mensaje, tipo = "success") {
  const contenedor = document.getElementById("alertas");
  if (!contenedor) return;

  const alerta = document.createElement("div");
  alerta.className = `alert alert-${tipo} alert-dismissible fade show`;
  alerta.role = "alert";
  alerta.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;
  contenedor.appendChild(alerta);

  setTimeout(() => alerta.remove(), 4000);
}

function mostrarError(error) {
  console.error(error);
  mostrarAlerta(error.message || "Ocurrió un error inesperado", "danger");
}