// ============================================================
// VEHICULOS.JS
// Maneja la tabla y el formulario (modal) de vehículos.
//
// Para que el usuario NUNCA tenga que escribir un ID a mano:
// - El campo "Propietario" es un <select> con los nombres de los
//   propietarios (internamente guarda el ID, pero eso no lo ve el usuario).
// - La tabla muestra el NOMBRE del propietario, no su ID.
// - Hay un buscador que filtra por placa, nombre del vehículo o
//   nombre del propietario.
// ============================================================

let modalVehiculo;
let vehiculosCache = [];       // última lista de vehículos cargada
let propietariosMap = new Map(); // id -> nombre del propietario (para mostrar y buscar)

document.addEventListener("DOMContentLoaded", async () => {
  modalVehiculo = new bootstrap.Modal(document.getElementById("modalVehiculo"));

  await cargarPropietariosMap();
  await cargarVehiculos();

  document.getElementById("form-vehiculo").addEventListener("submit", guardarVehiculo);
});

// Carga todos los propietarios una vez y arma un mapa id -> nombre.
// También llena el <select> del formulario.
async function cargarPropietariosMap() {
  try {
    const propietarios = await apiGet("/showowners");
    propietariosMap = new Map(propietarios.map((p) => [p.id, p.name]));

    const select = document.getElementById("vehiculo-ownerid");
    // dejamos la primera opción ("Selecciona un propietario...") y agregamos el resto
    propietarios.forEach((p) => {
      const opcion = document.createElement("option");
      opcion.value = p.id;
      opcion.textContent = `${p.name} (CC ${p.cc ?? "N/A"})`;
      select.appendChild(opcion);
    });
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarVehiculos() {
  try {
    vehiculosCache = await apiGet("/showallvehicle");
    aplicarBusqueda();
  } catch (error) {
    mostrarError(error);
  }
}

// Filtra vehiculosCache por placa, nombre del vehículo o nombre del propietario
function aplicarBusqueda() {
  const texto = (document.getElementById("buscador")?.value || "").toLowerCase().trim();

  if (!texto) {
    pintarTabla(vehiculosCache);
    return;
  }

  const filtrados = vehiculosCache.filter((v) => {
    const nombrePropietario = (propietariosMap.get(v.ownerid) ?? "").toLowerCase();
    return (
      (v.plate ?? "").toLowerCase().includes(texto) ||
      (v.name ?? "").toLowerCase().includes(texto) ||
      (v.marca ?? "").toLowerCase().includes(texto) ||
      nombrePropietario.includes(texto)
    );
  });

  pintarTabla(filtrados);
}

function pintarTabla(vehiculos) {
  const tbody = document.getElementById("tabla-vehiculos");
  tbody.innerHTML = "";

  if (vehiculos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No hay vehículos que coincidan</td></tr>`;
    return;
  }

  vehiculos.forEach((v) => {
    const nombrePropietario = propietariosMap.get(v.ownerid) ?? `ID ${v.ownerid}`;
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${v.id}</td>
      <td>${nombrePropietario}</td>
      <td>${v.name ?? ""}</td>
      <td>${v.marca ?? ""}</td>
      <td>${v.model ?? ""}</td>
      <td><span class="badge bg-light text-dark border">${v.plate ?? ""}</span></td>
      <td>${v.kilometers ?? ""}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick='abrirEditar(${JSON.stringify(v)})'>
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarVehiculo(${v.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

function abrirNuevo() {
  document.getElementById("form-vehiculo").reset();
  document.getElementById("vehiculo-id").value = "";
  document.getElementById("tituloModal").textContent = "Nuevo vehículo";
}

function abrirEditar(vehiculo) {
  document.getElementById("vehiculo-id").value = vehiculo.id;
  document.getElementById("vehiculo-ownerid").value = vehiculo.ownerid ?? "";
  document.getElementById("vehiculo-name").value = vehiculo.name ?? "";
  document.getElementById("vehiculo-marca").value = vehiculo.marca ?? "";
  document.getElementById("vehiculo-model").value = vehiculo.model ?? "";
  document.getElementById("vehiculo-plate").value = vehiculo.plate ?? "";
  document.getElementById("vehiculo-kilometers").value = vehiculo.kilometers ?? "";
  document.getElementById("tituloModal").textContent = "Editar vehículo";
  modalVehiculo.show();
}

async function guardarVehiculo(evento) {
  evento.preventDefault();

  const id = document.getElementById("vehiculo-id").value;
  const datos = {
    ownerid: Number(document.getElementById("vehiculo-ownerid").value),
    name: document.getElementById("vehiculo-name").value,
    marca: document.getElementById("vehiculo-marca").value,
    model: Number(document.getElementById("vehiculo-model").value),
    plate: document.getElementById("vehiculo-plate").value,
    kilometers: Number(document.getElementById("vehiculo-kilometers").value),
  };

  try {
    if (id) {
      await apiPatch(`/VehicleUPTADER/${id}`, datos);
      mostrarAlerta("Vehículo actualizado correctamente");
    } else {
      await apiPost("/CREATEVEHICLE", datos);
      mostrarAlerta("Vehículo creado correctamente");
    }
    modalVehiculo.hide();
    cargarVehiculos();
  } catch (error) {
    mostrarError(error);
  }
}

async function eliminarVehiculo(id) {
  if (!confirm("¿Seguro que deseas eliminar este vehículo?")) return;

  try {
    await apiDelete(`/KILLVEHICLE?id=${id}`);
    mostrarAlerta("Vehículo eliminado");
    cargarVehiculos();
  } catch (error) {
    mostrarError(error);
  }
}