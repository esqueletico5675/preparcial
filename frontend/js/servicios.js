// ============================================================
// SERVICIOS.JS
// Maneja: la tabla de servicios, el modal de crear/editar servicio,
// y el modal de ítems del servicio (mano de obra Y repuestos juntos,
// en una sola tabla, con precio y cantidad siempre editables).
// ============================================================

let modalServicio;
let modalRepuestos;
let servicioActualId = null;

const IVA_RATE = 0.19;

let serviciosCache = [];
let vehiculosMap = new Map();
let repuestosMap = new Map();
let manoObraMap = new Map();

document.addEventListener("DOMContentLoaded", async () => {
  modalServicio = new bootstrap.Modal(document.getElementById("modalServicio"));
  modalRepuestos = new bootstrap.Modal(document.getElementById("modalRepuestos"));

  await cargarVehiculosMap();
  await cargarProductosMap();
  await cargarServicios();

  document.getElementById("form-servicio").addEventListener("submit", guardarServicio);
  document.getElementById("form-repuesto").addEventListener("submit", guardarItem);
});

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

    repuestosMap = new Map(
      productos
        .filter((p) => p.active !== false)   // <-- nuevo: excluye inactivos
        .filter((p) => p.tipo !== "mano_obra")
        .map((p) => [p.id, { name: p.name, price: p.price, stock: p.stock }])
    );
    manoObraMap = new Map(
      productos
        .filter((p) => p.active !== false)   // <-- nuevo: excluye inactivos
        .filter((p) => p.tipo === "mano_obra")
        .map((p) => [p.id, { name: p.name, price: p.price }])
    );

    pintarOpcionesProducto();
  } catch (error) {
    mostrarError(error);
  }
}

function pintarOpcionesProducto() {
  const tipo = document.getElementById("item-tipo").value;
  const select = document.getElementById("repuesto-productoid");
  const label = document.getElementById("label-producto");
  const catalogo = tipo === "mano_obra" ? manoObraMap : repuestosMap;

  select.innerHTML = `<option value="">Escribir descripción libremente...</option>`;
  catalogo.forEach((item, id) => {
    const opcion = document.createElement("option");
    opcion.value = id;
    opcion.textContent = tipo === "mano_obra" ? item.name : `${item.name} (stock: ${item.stock})`;
    select.appendChild(opcion);
  });

  label.textContent = tipo === "mano_obra" ? "Mano de obra del catálogo (opcional)" : "Repuesto del catálogo (opcional)";
}

function autocompletarDesdeProducto() {
  const tipo = document.getElementById("item-tipo").value;
  const catalogo = tipo === "mano_obra" ? manoObraMap : repuestosMap;
  const productoId = Number(document.getElementById("repuesto-productoid").value);
  const producto = catalogo.get(productoId);
  if (producto) {
    document.getElementById("item-descripcion").value = producto.name;
    document.getElementById("repuesto-unit_price").value = producto.price;
  }
}

function alCambiarTipo() {
  document.getElementById("repuesto-productoid").value = "";
  pintarOpcionesProducto();
}

async function cargarServicios() {
  try {
    serviciosCache = await apiGet("/showservicios");
    aplicarBusqueda();
  } catch (error) {
    mostrarError(error);
  }
}

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
      <td>${escapeHtml(textoVehiculo)}</td>
      <td>${escapeHtml(s.description ?? "")}</td>
      <td><span class="badge bg-info text-dark">${escapeHtml(s.status)}</span></td>
      <td>${escapeHtml(s.fecha ?? "")}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary" onclick="abrirRepuestos(${s.id})" title="Ítems del servicio">
          <i class="bi bi-box-seam"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary" onclick="abrirEditar(${escapeHtml(JSON.stringify(s))})">
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
  document.getElementById("servicio-vehicleid").disabled = true;
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
      const datos = {
        description: document.getElementById("servicio-description").value,
        status: document.getElementById("servicio-status").value,
      };
      await apiPatch(`/uptadeServicio/${id}`, datos);
      mostrarAlerta("Servicio actualizado correctamente");
    } else {
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

async function abrirRepuestos(servicioId) {
  servicioActualId = servicioId;

  const servicio = serviciosCache.find((s) => s.id === servicioId);
  const vehiculo = servicio ? vehiculosMap.get(servicio.vehicleid) : null;
  document.getElementById("repuestos-servicio-info").textContent = vehiculo
    ? `${vehiculo.plate} - ${vehiculo.name}`
    : `Servicio #${servicioId}`;

  cancelarEdicionItem();
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
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-2">Sin ítems agregados aún</td></tr>`;
    document.getElementById("total-subtotal").textContent = "$0";
    document.getElementById("total-iva").textContent = "$0";
    document.getElementById("total-total").textContent = "$0";
    return;
  }

  let totalSubtotal = 0;
  let totalIva = 0;

  items.forEach((item) => {
    const esManoDeObra = item.tipo === "mano_obra";
    const etiquetaTipo = esManoDeObra ? "Mano de obra" : "Repuesto";
    const subtotal = item.quantity * item.unit_price;
    const iva = item.aplica_iva ? subtotal * IVA_RATE : 0;
    const total = subtotal + iva;

    totalSubtotal += subtotal;
    totalIva += iva;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><span class="badge ${esManoDeObra ? "bg-secondary" : "bg-light text-dark border"}">${etiquetaTipo}</span></td>
      <td>${escapeHtml(item.descripcion)}</td>
      <td class="text-end">${item.quantity}</td>
      <td class="text-end">$${Number(item.unit_price).toLocaleString("es-CO")}</td>
      <td class="text-end">$${subtotal.toLocaleString("es-CO")}</td>
      <td class="text-end">${item.aplica_iva ? `$${iva.toLocaleString("es-CO")}` : "$0"}</td>
      <td class="text-end">$${total.toLocaleString("es-CO")}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="editarItem(${escapeHtml(JSON.stringify(item))})" title="Editar">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarRepuesto(${item.id})" title="Quitar">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });

  document.getElementById("total-subtotal").textContent = `$${totalSubtotal.toLocaleString("es-CO")}`;
  document.getElementById("total-iva").textContent = `$${totalIva.toLocaleString("es-CO")}`;
  document.getElementById("total-total").textContent = `$${(totalSubtotal + totalIva).toLocaleString("es-CO")}`;
}

function editarItem(item) {
  document.getElementById("item-id").value = item.id;
  document.getElementById("item-tipo").value = item.tipo;
  pintarOpcionesProducto();
  document.getElementById("repuesto-productoid").value = item.productoid ?? "";
  document.getElementById("item-descripcion").value = item.descripcion;
  document.getElementById("repuesto-quantity").value = item.quantity;
  document.getElementById("repuesto-unit_price").value = item.unit_price;
  document.getElementById("item-iva").value = item.aplica_iva ? "19" : "0";

  document.getElementById("titulo-form-item").textContent = "Editar ítem";
  document.getElementById("btn-guardar-item").textContent = "Guardar cambios";
  document.getElementById("btn-cancelar-edicion").style.display = "";

  document.getElementById("item-descripcion").scrollIntoView({ behavior: "smooth", block: "center" });
}

function cancelarEdicionItem() {
  document.getElementById("form-repuesto").reset();
  document.getElementById("item-id").value = "";
  document.getElementById("item-tipo").value = "repuesto";
  document.getElementById("item-iva").value = "0";
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
  const aplicaIva = document.getElementById("item-iva").value === "19";

  async function intentarGuardar(forzar) {
    if (itemId) {
      const datos = {
        descripcion: document.getElementById("item-descripcion").value,
        quantity: Number(document.getElementById("repuesto-quantity").value),
        unit_price: Number(document.getElementById("repuesto-unit_price").value),
        aplica_iva: aplicaIva,
      };
      await apiPatch(`/uptadeServicioItem/${itemId}?forzar=${forzar}`, datos);
      mostrarAlerta("Ítem actualizado correctamente");
    } else {
      const datos = {
        servicioid: servicioActualId,
        tipo: tipo,
        productoid: productoSeleccionado ? Number(productoSeleccionado) : null,
        descripcion: document.getElementById("item-descripcion").value,
        quantity: Number(document.getElementById("repuesto-quantity").value),
        unit_price: Number(document.getElementById("repuesto-unit_price").value),
        aplica_iva: aplicaIva,
      };
      await apiPost(`/ADDservicioItem?forzar=${forzar}`, datos);
      mostrarAlerta("Ítem agregado al servicio");
    }
  }

  try {
    await intentarGuardar(false);
    cancelarEdicionItem();
    cargarRepuestos();
  } catch (error) {
    if (error.message === "stock_insuficiente") {
      const continuar = confirm("No hay stock suficiente de este producto. ¿Deseas continuar de todas formas?");
      if (continuar) {
        try {
          await intentarGuardar(true);
          cancelarEdicionItem();
          cargarRepuestos();
        } catch (errorForzado) {
          mostrarError(errorForzado);
        }
      }
      return;
    }
    mostrarError(error);
  }
}