// ============================================================
// USUARIOS.JS
// Tabla y modal para gestionar usuarios (solo admins).
// ============================================================

let modalUsuario;
let usuariosCache = [];
let empresaIdAdmin = null; // se obtiene de /me, requerido por el modelo UsuarioCreate

document.addEventListener("DOMContentLoaded", async () => {
  if (getRole() !== "admin") {
    mostrarAlerta("No tenés permisos para ver esta página", "danger");
    setTimeout(() => (window.location.href = "index.html"), 1500);
    return;
  }

  modalUsuario = new bootstrap.Modal(document.getElementById("modalUsuario"));

  try {
    const yo = await apiGet("/me");
    empresaIdAdmin = yo.empresaid;
  } catch (error) {
    mostrarError(error);
    return;
  }

  cargarUsuarios();
  document.getElementById("form-usuario").addEventListener("submit", guardarUsuario);
});

async function cargarUsuarios() {
  try {
    usuariosCache = await apiGet("/showusuarios");
    aplicarBusqueda();
  } catch (error) {
    mostrarError(error);
  }
}

function aplicarBusqueda() {
  const texto = (document.getElementById("buscador")?.value || "").toLowerCase().trim();
  const filtro = document.querySelector(".btn-filtro.active")?.dataset.filtro || "todos";

  let lista = usuariosCache;
  if (filtro === "activos") lista = lista.filter((u) => u.active);
  if (filtro === "inactivos") lista = lista.filter((u) => !u.active);

  if (texto) {
    lista = lista.filter((u) => (u.username ?? "").toLowerCase().includes(texto));
  }

  pintarTabla(lista);
}

function filtrarPor(filtro, boton) {
  document.querySelectorAll(".btn-filtro").forEach((b) => b.classList.remove("active"));
  boton.classList.add("active");
  aplicarBusqueda();
}

function pintarTabla(usuarios) {
  const tbody = document.getElementById("tabla-usuarios");
  tbody.innerHTML = "";

  if (usuarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No hay usuarios para mostrar</td></tr>`;
    return;
  }

  const yoMismo = getUsername();

  usuarios.forEach((u) => {
    const esYo = u.username === yoMismo;
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${u.id}</td>
      <td>${escapeHtml(u.username ?? "")}</td>
      <td><span class="badge bg-info text-dark">${escapeHtml(u.role ?? "")}</span></td>
      <td>
        <span class="badge ${u.active ? "bg-success" : "bg-secondary"}">
          ${u.active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="abrirEditar(${escapeHtml(JSON.stringify(u))})">
          <i class="bi bi-pencil"></i>
        </button>
        ${
          u.active
            ? `<button class="btn btn-sm btn-outline-danger" ${esYo ? "disabled title='No podés desactivarte a vos mismo'" : ""} onclick="desactivarUsuario(${u.id})">
                 <i class="bi bi-person-dash"></i>
               </button>`
            : `<button class="btn btn-sm btn-outline-success" onclick="activarUsuario(${u.id})">
                 <i class="bi bi-person-check"></i>
               </button>`
        }
      </td>
    `;
    tbody.appendChild(fila);
  });
}

function abrirNuevo() {
  document.getElementById("form-usuario").reset();
  document.getElementById("usuario-id").value = "";
  document.getElementById("usuario-password").required = true;
  document.getElementById("password-hint").classList.add("d-none");
  document.getElementById("tituloModal").textContent = "Nuevo usuario";
}

function abrirEditar(usuario) {
  document.getElementById("usuario-id").value = usuario.id;
  document.getElementById("usuario-username").value = usuario.username ?? "";
  document.getElementById("usuario-role").value = usuario.role ?? "empleado";
  document.getElementById("usuario-password").value = "";
  document.getElementById("usuario-password").required = false;
  document.getElementById("password-hint").classList.remove("d-none");
  document.getElementById("tituloModal").textContent = "Editar usuario";
  modalUsuario.show();
}

async function guardarUsuario(evento) {
  evento.preventDefault();

  const id = document.getElementById("usuario-id").value;
  const password = document.getElementById("usuario-password").value;

  try {
    if (id) {
      // Edición: solo mandamos password si el admin escribió una nueva
      const datos = {
        role: document.getElementById("usuario-role").value,
      };
      if (password) datos.password = password;

      await apiPatch(`/uptadeUsuario/${id}`, datos);
      mostrarAlerta("Usuario actualizado correctamente");
    } else {
      const datos = {
        username: document.getElementById("usuario-username").value,
        role: document.getElementById("usuario-role").value,
        password: password,
        empresaid: empresaIdAdmin, // el backend lo ignora y usa el del admin logueado, pero el modelo lo exige
      };
      await apiPost("/register", datos);
      mostrarAlerta("Usuario creado correctamente");
    }
    modalUsuario.hide();
    cargarUsuarios();
  } catch (error) {
    mostrarError(error);
  }
}

async function desactivarUsuario(id) {
  if (!confirm("¿Desactivar este usuario? No podrá volver a iniciar sesión.")) return;

  try {
    await apiDelete(`/KILLusuario/${id}`);
    mostrarAlerta("Usuario desactivado");
    cargarUsuarios();
  } catch (error) {
    mostrarError(error);
  }
}

async function activarUsuario(id) {
  try {
    await apiPatch(`/uptadeUsuario/${id}`, { active: true });
    mostrarAlerta("Usuario activado");
    cargarUsuarios();
  } catch (error) {
    mostrarError(error);
  }
}