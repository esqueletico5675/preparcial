// ============================================================
// API.JS
// Funciones genéricas para hablar con el backend (FastAPI).
// Todas las páginas usan estas mismas 4 funciones: apiGet, apiPost,
// apiPatch y apiDelete. Así evitamos repetir código fetch() en cada página.
// ============================================================

/**
 * Hace una petición a la API y devuelve el JSON de la respuesta.
 * Si la respuesta no es exitosa (status >= 400), lanza un error con
 * el mensaje que envía el backend (detail).
 */
async function apiRequest(path, method = "GET", body = null) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, options);

  // Si el backend responde con error, intentamos leer el mensaje "detail"
  if (!response.ok) {
    let mensaje = `Error ${response.status}`;
    try {
      const data = await response.json();
      if (data.detail) mensaje = data.detail;
    } catch (e) {
      // si no vino JSON, dejamos el mensaje genérico
    }
    throw new Error(mensaje);
  }

  // DELETE a veces no devuelve contenido
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

/**
 * Muestra una alerta de Bootstrap dentro del contenedor #alertas.
 * tipo puede ser: "success", "danger", "warning", "info"
 */
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

  // se auto-elimina después de 4 segundos
  setTimeout(() => alerta.remove(), 4000);
}

// Atajo para errores: siempre muestra el mensaje real del backend
function mostrarError(error) {
  console.error(error);
  mostrarAlerta(error.message || "Ocurrió un error inesperado", "danger");
}