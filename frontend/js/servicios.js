// ============================================================
// SERVICIOS.JS
// Maneja: la tabla de servicios, el modal de crear/editar servicio,
// y el modal de repuestos usados en cada servicio.
//
// Para que el usuario NUNCA tenga que escribir un ID a mano:
// - El campo "Vehículo" es un <select> mostrando "Placa - Nombre".
// - El campo "Producto" (al agregar un repuesto) es un <select>
//   mostrando el nombre del producto, y autocompleta el precio.
// - La tabla muestra la PLACA del vehículo, no su ID.
// - Hay un buscador que filtra por placa o descripción.
// ============================================================

let modalServicio;
let modalRepuestos;
let servicioActualId = null; // guarda qué servicio está abierto en el modal de repuestos

let serviciosCache = [];
let vehiculosMap = new Map();  // id -> { plate, name }
let productosMap = new Map();  // id -> { name, price }

document.addEventListener("DOMContentLoaded", async () => {
  modalServicio = new bootstrap.Modal(document.getElementById("modalServicio"));
  modalRepuestos = new bootstrap.Modal(document.getElementById("modalRepuestos"));

  await cargarVehiculosMap();
  await cargarProductosMap();
  await cargarServicios();

  document.getElementById("form-servicio").addEventListener("submit", guardarServicio);
  document.getElementById("form-repuesto").addEventListener("submit", agregarRepuesto);
});

// ---------------- DATOS DE APOYO (para mostrar nombres en vez de IDs) ----------------

async function cargarVehiculosMap() {
  try {
    const vehiculos = await apiGet("/showallvehicle");
    vehiculosMap = new Map(vehiculos.map((v) => [v.id, { plate: v.plate, name: v.name }]));

    const select = document.getElementById("servicio-vehicleid");
    vehiculos.forEach((v) => {
      const opcion = document.createElement("option");
      opcion.value = v.id;
      opcion.textContent = `${v.plate} - ${v.name}`;
      select.appendChild(opcion);
    });
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarProductosMap() {
  try {
    const productos = await apiGet("/showproductos");
    productosMap = new Map(productos.map((p) => [p.id, { name: p.name, price: p.price }]));

    const select = document.getElementById("repuesto-productoid");
    productos.forEach((p) => {
      const opcion = document.createElement("option");
      opcion.value = p.id;
      opcion.textContent = `${p.name} (stock: ${p.stock})`;
      select.appendChild(opcion);
    });
  } catch (error) {
    mostrarError(error);
  }
}

// Al elegir un producto en el modal de repuestos, autocompleta su precio actual
function autocompletarPrecio() {
  const productoId = Number(document.getElementById("repuesto-productoid").value);
  const producto = productosMap.get(productoId);
  if (producto) {
    document.getElementById("repuesto-unit_price").value = producto.price;
  }
}

// ---------------- TABLA PRINCIPAL DE SERVICIOS ----------------

async function cargarServicios() {
  try {
    serviciosCache = await apiGet("/showservicios");
    aplicarBusqueda();
  } catch (error) {
    mostrarError(error);
  }
}

// Filtra serviciosCache por placa del vehículo o descripción del servicio
function aplicarBusqueda() {
  const texto = (document.getElementById("buscador")?.value || "").toLowerCase().trim();

  if (!texto) {
    pintarTabla(serviciosCache);
    return;
  }

  const filtrados = serviciosCache.filter((s) => {
    const vehiculo = vehiculosMap.get(s.vehicleid);
    const placa = (vehiculo?.plate ?? "").toLowerCase();
    return placa.includes(texto) || (s.description ?? "").toLowerCase().includes(texto);
  });

  pintarTabla(filtrados);
}

function pintarTabla(servicios) {
  const tbody = document.getElementById("tabla-servicios");
  tbody.innerHTML = "";

  if (servicios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No hay servicios que coincidan</td></tr>`;
    return;
  }

  servicios.forEach((s) => {
    const vehiculo = vehiculosMap.get(s.vehicleid);
    const textoVehiculo = vehiculo ? `${vehiculo.plate} - ${vehiculo.name}` : `ID ${s.vehicleid}`;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${s.id}</td>
      <td>${textoVehiculo}</td>
      <td>${s.description ?? ""}</td>
      <td>$${Number(s.labor_cost).toLocaleString("es-CO")}</td>
      <td><span class="badge bg-info text-dark">${s.status}</span></td>
      <td>${s.fecha ?? ""}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" onclick="abrirRepuestos(${s.id})" title="Repuestos usados">
          <i class="bi bi-box-seam"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary" onclick='abrirEditar(${JSON.stringify(s)})'>
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

function abrirNuevo() {
  document.getElementById("form-servicio").reset();
  document.getElementById("servicio-id").value = "";
  document.getElementById("servicio-vehicleid").disabled = false;
  document.getElementById("tituloModal").textContent = "Nuevo servicio";
}

function abrirEditar(servicio) {
  document.getElementById("servicio-id").value = servicio.id;
  document.getElementById("servicio-vehicleid").value = servicio.vehicleid;
  document.getElementById("servicio-vehicleid").disabled = true; // el vehículo no se cambia al editar
  document.getElementById("servicio-description").value = servicio.description ?? "";
  document.getElementById("servicio-labor_cost").value = servicio.labor_cost ?? 0;
  document.getElementById("servicio-status").value = servicio.status ?? "pendiente";
  document.getElementById("tituloModal").textContent = "Editar servicio";
  modalServicio.show();
}

async function guardarServicio(evento) {
  evento.preventDefault();

  const id = document.getElementById("servicio-id").value;

  try {
    if (id) {
      // Al editar solo se envían: descripción, mano de obra y estado
      const datos = {
        description: document.getElementById("servicio-description").value,
        labor_cost: Number(document.getElementById("servicio-labor_cost").value),
        status: document.getElementById("servicio-status").value,
      };
      await apiPatch(`/uptadeServicio/${id}`, datos);
      mostrarAlerta("Servicio actualizado correctamente");
    } else {
      // Al crear sí se envía el vehículo
      const datos = {
        vehicleid: Number(document.getElementById("servicio-vehicleid").value),
        description: document.getElementById("servicio-description").value,
        labor_cost: Number(document.getElementById("servicio-labor_cost").value),
        status: document.getElementById("servicio-status").value,
      };
      await apiPost("/CREATEservicio", datos);
      mostrarAlerta("Servicio creado correctamente");
    }
    modalServicio.hide();
    cargarServicios();
  } catch (error) {
    mostrarError(error);
  }
}

// ---------------- MODAL DE REPUESTOS USADOS ----------------

async function abrirRepuestos(servicioId) {
  servicioActualId = servicioId;

  const servicio = serviciosCache.find((s) => s.id === servicioId);
  const vehiculo = servicio ? vehiculosMap.get(servicio.vehicleid) : null;
  document.getElementById("repuestos-servicio-info").textContent = vehiculo
    ? `${vehiculo.plate} - ${vehiculo.name}`
    : `Servicio #${servicioId}`;

  document.getElementById("form-repuesto").reset();
  await cargarRepuestos();
  modalRepuestos.show();
}

async function cargarRepuestos() {
  try {
    const items = await apiGet(`/showServicioItems?servicio_id=${servicioActualId}`);
    pintarRepuestos(items);
  } catch (error) {
    mostrarError(error);
  }
}

function pintarRepuestos(items) {
  const tbody = document.getElementById("tabla-repuestos");
  tbody.innerHTML = "";

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-2">Sin repuestos agregados aún</td></tr>`;
    return;
  }

  items.forEach((item) => {
    const producto = productosMap.get(item.productoid);
    const nombreProducto = producto ? producto.name : `ID ${item.productoid}`;
    const subtotal = item.quantity * item.unit_price;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${nombreProducto}</td>
      <td>${item.quantity}</td>
      <td>$${Number(item.unit_price).toLocaleString("es-CO")}</td>
      <td>$${subtotal.toLocaleString("es-CO")}</td>
    `;
    tbody.appendChild(fila);
  });
}

async function agregarRepuesto(evento) {
  evento.preventDefault();

  const datos = {
    servicioid: servicioActualId,
    productoid: Number(document.getElementById("repuesto-productoid").value),
    quantity: Number(document.getElementById("repuesto-quantity").value),
    unit_price: Number(document.getElementById("repuesto-unit_price").value),
  };

  try {
    await apiPost("/ADDproductoServicio", datos);
    mostrarAlerta("Repuesto agregado al servicio");
    document.getElementById("form-repuesto").reset();
    cargarRepuestos();
  } catch (error) {
    mostrarError(error);
  }
}