// ============================================================
// SERVICIOS.JS
// Maneja: la tabla de servicios, el modal de crear/editar servicio,
// y el modal de ítems del servicio (mano de obra Y repuestos juntos,
// en una sola tabla, con precio y cantidad siempre editables).
//
// Para que el usuario NUNCA tenga que escribir un ID a mano:
// - El campo "Vehículo" es un <select> mostrando "Placa - Nombre".
// - El campo "Producto" (al agregar un ítem tipo repuesto) es un <select>
//   opcional que autocompleta descripción y precio, pero ambos se pueden
//   cambiar libremente después.
// - La tabla muestra la PLACA del vehículo, no su ID.
// - Hay un buscador que filtra por placa o descripción.
// ============================================================

let modalServicio;
let modalRepuestos;
let servicioActualId = null; // guarda qué servicio está abierto en el modal de ítems

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
  document.getElementById("form-repuesto").addEventListener("submit", guardarItem);
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

// Al elegir un producto en el modal de ítems, autocompleta descripción y precio.
// El usuario puede cambiar cualquiera de los dos después libremente.
function autocompletarDesdeProducto() {
  const productoId = Number(document.getElementById("repuesto-productoid").value);
  const producto = productosMap.get(productoId);
  if (producto) {
    document.getElementById("item-descripcion").value = producto.name;
    document.getElementById("repuesto-unit_price").value = producto.price;
  }
}

// Al cambiar entre "Repuesto" y "Mano de obra", muestra u oculta el select
// de producto (la mano de obra nunca viene de un producto del catálogo).
function alCambiarTipo() {
  const tipo = document.getElementById("item-tipo").value;
  const campoProducto = document.getElementById("campo-producto");

  if (tipo === "mano_obra") {
    campoProducto.style.display = "none";
    document.getElementById("repuesto-productoid").value = "";
  } else {
    campoProducto.style.display = "";
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No hay servicios que coincidan</td></tr>`;
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
      <td><span class="badge bg-info text-dark">${s.status}</span></td>
      <td>${s.fecha ?? ""}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" onclick="abrirRepuestos(${s.id})" title="Ítems del servicio">
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
  document.getElementById("servicio-status").value = servicio.status ?? "pendiente";
  document.getElementById("tituloModal").textContent = "Editar servicio";
  modalServicio.show();
}

async function guardarServicio(evento) {
  evento.preventDefault();

  const id = document.getElementById("servicio-id").value;

  try {
    if (id) {
      // Al editar solo se envían: descripción y estado
      const datos = {
        description: document.getElementById("servicio-description").value,
        status: document.getElementById("servicio-status").value,
      };
      await apiPatch(`/uptadeServicio/${id}`, datos);
      mostrarAlerta("Servicio actualizado correctamente");
    } else {
      // Al crear sí se envía el vehículo
      const datos = {
        vehicleid: Number(document.getElementById("servicio-vehicleid").value),
        description: document.getElementById("servicio-description").value,
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

// ---------------- MODAL DE ÍTEMS (mano de obra + repuestos) ----------------

async function abrirRepuestos(servicioId) {
  servicioActualId = servicioId;

  const servicio = serviciosCache.find((s) => s.id === servicioId);
  const vehiculo = servicio ? vehiculosMap.get(servicio.vehicleid) : null;
  document.getElementById("repuestos-servicio-info").textContent = vehiculo
    ? `${vehiculo.plate} - ${vehiculo.name}`
    : `Servicio #${servicioId}`;

  cancelarEdicionItem(); // deja el formulario limpio y en modo "Agregar"
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-2">Sin ítems agregados aún</td></tr>`;
    return;
  }

  items.forEach((item) => {
    const esManoDeObra = item.tipo === "mano_obra";
    const etiquetaTipo = esManoDeObra ? "Mano de obra" : "Repuesto";
    const subtotal = item.quantity * item.unit_price;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><span class="badge ${esManoDeObra ? "bg-secondary" : "bg-light text-dark border"}">${etiquetaTipo}</span></td>
      <td>${item.descripcion}</td>
      <td class="text-end">${item.quantity}</td>
      <td class="text-end">$${Number(item.unit_price).toLocaleString("es-CO")}</td>
      <td class="text-end">$${subtotal.toLocaleString("es-CO")}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick='editarItem(${JSON.stringify(item)})' title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarRepuesto(${item.id})" title="Quitar">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

// Llena el formulario con los datos del ítem para editarlo, en vez de crear uno nuevo
function editarItem(item) {
  document.getElementById("item-id").value = item.id;
  document.getElementById("item-tipo").value = item.tipo;
  document.getElementById("repuesto-productoid").value = item.productoid ?? "";
  document.getElementById("item-descripcion").value = item.descripcion;
  document.getElementById("repuesto-quantity").value = item.quantity;
  document.getElementById("repuesto-unit_price").value = item.unit_price;

  alCambiarTipo(); // ajusta si se muestra o no el select de producto

  document.getElementById("titulo-form-item").textContent = "Editar ítem";
  document.getElementById("btn-guardar-item").textContent = "Guardar cambios";
  document.getElementById("btn-cancelar-edicion").style.display = "";

  document.getElementById("item-descripcion").scrollIntoView({ behavior: "smooth", block: "center" });
}

// Vuelve el formulario a modo "Agregar ítem nuevo"
function cancelarEdicionItem() {
  document.getElementById("form-repuesto").reset();
  document.getElementById("item-id").value = "";
  document.getElementById("item-tipo").value = "repuesto";
  alCambiarTipo();

  document.getElementById("titulo-form-item").textContent = "Agregar ítem";
  document.getElementById("btn-guardar-item").textContent = "Agregar";
  document.getElementById("btn-cancelar-edicion").style.display = "none";
}

async function eliminarRepuesto(itemId) {
  if (!confirm("¿Quitar este ítem del servicio? Si es un repuesto del catálogo, se devolverá al inventario.")) return;

  try {
    await apiDelete(`/removeServicioItem/${itemId}`);
    mostrarAlerta("Ítem quitado del servicio");
    cargarRepuestos();
  } catch (error) {
    mostrarError(error);
  }
}

async function guardarItem(evento) {
  evento.preventDefault();

  const itemId = document.getElementById("item-id").value;
  const tipo = document.getElementById("item-tipo").value;
  const productoSeleccionado = document.getElementById("repuesto-productoid").value;

  try {
    if (itemId) {
      // Editando un ítem existente: solo se puede cambiar descripción, cantidad y precio
      const datos = {
        descripcion: document.getElementById("item-descripcion").value,
        quantity: Number(document.getElementById("repuesto-quantity").value),
        unit_price: Number(document.getElementById("repuesto-unit_price").value),
      };
      await apiPatch(`/uptadeServicioItem/${itemId}`, datos);
      mostrarAlerta("Ítem actualizado correctamente");
    } else {
      // Agregando un ítem nuevo
      const datos = {
        servicioid: servicioActualId,
        tipo: tipo,
        productoid: tipo === "repuesto" && productoSeleccionado ? Number(productoSeleccionado) : null,
        descripcion: document.getElementById("item-descripcion").value,
        quantity: Number(document.getElementById("repuesto-quantity").value),
        unit_price: Number(document.getElementById("repuesto-unit_price").value),
      };
      await apiPost("/ADDservicioItem", datos);
      mostrarAlerta("Ítem agregado al servicio");
    }

    cancelarEdicionItem();
    cargarRepuestos();
  } catch (error) {
    mostrarError(error);
  }
}