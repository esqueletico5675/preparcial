// ============================================================
// PROPIETARIOS.JS
// Maneja la tabla y el formulario (modal) de propietarios.
// Incluye un buscador que filtra por nombre, cédula o email
// SIN necesidad de que el usuario escriba ningún ID.
// ============================================================

let modalPropietario;
let propietariosCache = []; // guarda la última lista cargada, para poder filtrarla sin volver a pedirla al backend

document.addEventListener("DOMContentLoaded", () => {
  modalPropietario = new bootstrap.Modal(document.getElementById("modalPropietario"));
  cargarPropietarios("todos");

  document.getElementById("form-propietario").addEventListener("submit", guardarPropietario);
});

// Carga la tabla según el filtro: "todos", "activos" o "inactivos"
async function cargarPropietarios(filtro = "todos") {
  const rutas = {
    todos: "/showowners",
    activos: "/active_owners",
    inactivos: "/inactive_owners",
  };

  try {
    propietariosCache = await apiGet(rutas[filtro]);
    aplicarBusqueda();
  } catch (error) {
    mostrarError(error);
  }
}

// Filtra propietariosCache según lo que el usuario escribió en el buscador
function aplicarBusqueda() {
  const texto = (document.getElementById("buscador")?.value || "").toLowerCase().trim();

  if (!texto) {
    pintarTabla(propietariosCache);
    return;
  }

  const filtrados = propietariosCache.filter((p) => {
    return (
      (p.name ?? "").toLowerCase().includes(texto) ||
      (p.cc ?? "").toLowerCase().includes(texto) ||
      (p.email ?? "").toLowerCase().includes(texto) ||
      (p.cellphone ?? "").toLowerCase().includes(texto)
    );
  });

  pintarTabla(filtrados);
}

function pintarTabla(propietarios) {
  const tbody = document.getElementById("tabla-propietarios");
  tbody.innerHTML = "";

  if (propietarios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No hay propietarios para mostrar</td></tr>`;
    return;
  }

  propietarios.forEach((p) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.id}</td>
      <td>${escapeHtml(p.name ?? "")}</td>
      <td>${escapeHtml(p.email ?? "")}</td>
      <td>${escapeHtml(p.cellphone ?? "")}</td>
      <td>${escapeHtml(p.cc ?? "")}</td>
      <td>
        <span class="badge ${p.active ? "bg-success" : "bg-secondary"}">
          ${p.active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="abrirEditar(${escapeHtml(JSON.stringify(p))})">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarPropietario(${p.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

// Abre el modal vacío para crear un nuevo propietario
function abrirNuevo() {
  document.getElementById("form-propietario").reset();
  document.getElementById("propietario-id").value = "";
  document.getElementById("tituloModal").textContent = "Nuevo propietario";
}

// Abre el modal con los datos del propietario para editarlo
function abrirEditar(propietario) {
  document.getElementById("propietario-id").value = propietario.id;
  document.getElementById("propietario-name").value = propietario.name ?? "";
  document.getElementById("propietario-email").value = propietario.email ?? "";
  document.getElementById("propietario-cellphone").value = propietario.cellphone ?? "";
  document.getElementById("propietario-cc").value = propietario.cc ?? "";
  document.getElementById("tituloModal").textContent = "Editar propietario";
  modalPropietario.show();
}

// Se ejecuta al enviar el formulario (crear o editar según si hay ID)
async function guardarPropietario(evento) {
  evento.preventDefault();

  const id = document.getElementById("propietario-id").value;
  const datos = {
    name: document.getElementById("propietario-name").value,
    email: document.getElementById("propietario-email").value,
    cellphone: document.getElementById("propietario-cellphone").value,
    cc: document.getElementById("propietario-cc").value,
  };

  try {
    if (id) {
      await apiPatch(`/uptadeOwner/${id}`, datos);
      mostrarAlerta("Propietario actualizado correctamente");
    } else {
      await apiPost("/CREATEowner", datos);
      mostrarAlerta("Propietario creado correctamente");
    }
    modalPropietario.hide();
    cargarPropietarios("todos");
  } catch (error) {
    mostrarError(error);
  }
}

async function eliminarPropietario(id) {
  if (!confirm("¿Seguro que deseas eliminar este propietario?")) return;

  try {
    await apiDelete(`/KILLowner/${id}`);
    mostrarAlerta("Propietario eliminado");
    cargarPropietarios("todos");
  } catch (error) {
    mostrarError(error);
  }
}