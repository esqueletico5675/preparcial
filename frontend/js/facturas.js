// ============================================================
// FACTURAS.JS
// Maneja la tabla de facturas y el formulario para generar una nueva.
//
// Para que el usuario NUNCA tenga que escribir un ID a mano:
// - El campo "Servicio" es un <select> mostrando "Placa - Descripción".
// - La tabla muestra la PLACA del vehículo, no el ID del servicio.
// - Hay un buscador que filtra por placa.
// ============================================================

let modalFactura;
let modalVerFactura;
let facturasCache = [];
let vehiculosMap = new Map();  // id vehículo -> objeto vehículo completo
let serviciosMap = new Map();  // id servicio -> { vehicleid, description, status }
let ownersMap = new Map();     // id propietario -> objeto owner completo
let productosMap = new Map();  // id producto -> objeto producto completo

document.addEventListener("DOMContentLoaded", async () => {
  modalFactura = new bootstrap.Modal(document.getElementById("modalFactura"));
  modalVerFactura = new bootstrap.Modal(document.getElementById("modalVerFactura"));

  await cargarVehiculosMap();
  await cargarServiciosMap();
  await cargarOwnersMap();
  await cargarProductosMap();
  await cargarFacturas();

  document.getElementById("form-factura").addEventListener("submit", generarFactura);
});

async function cargarVehiculosMap() {
  try {
    const vehiculos = await apiGet("/showallvehicle");
    vehiculosMap = new Map(vehiculos.map((v) => [v.id, v]));
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarOwnersMap() {
  try {
    const owners = await apiGet("/showowners");
    ownersMap = new Map(owners.map((o) => [o.id, o]));
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarProductosMap() {
  try {
    const productos = await apiGet("/showproductos");
    productosMap = new Map(productos.map((p) => [p.id, p]));
  } catch (error) {
    mostrarError(error);
  }
}

async function cargarServiciosMap() {
  try {
    const servicios = await apiGet("/showservicios");
    serviciosMap = new Map(servicios.map((s) => [s.id, s]));
  } catch (error) {
    mostrarError(error);
  }
}

// Se llama justo antes de mostrar el modal: refresca el select de servicios
// para no ofrecer servicios que ya tienen factura.
async function prepararModalFactura() {
  await cargarServiciosMap();

  const select = document.getElementById("factura-servicioid");
  select.innerHTML = `<option value="">Selecciona un servicio...</option>`;

  serviciosMap.forEach((servicio, id) => {
    if (servicio.status === "facturado") return; // ya tiene factura, no lo mostramos

    const placa = vehiculosMap.get(servicio.vehicleid)?.plate ?? `Vehículo ${servicio.vehicleid}`;
    const opcion = document.createElement("option");
    opcion.value = id;
    opcion.textContent = `${placa} - ${servicio.description}`;
    select.appendChild(opcion);
  });
}

async function cargarFacturas() {
  try {
    facturasCache = await apiGet("/showfacturas");
    aplicarBusqueda();
  } catch (error) {
    mostrarError(error);
  }
}

// Filtra facturasCache por placa del vehículo asociado
function aplicarBusqueda() {
  const texto = (document.getElementById("buscador")?.value || "").toLowerCase().trim();

  if (!texto) {
    pintarTabla(facturasCache);
    return;
  }

  const filtradas = facturasCache.filter((f) => {
    const servicio = serviciosMap.get(f.servicioid);
    const vehiculo = servicio ? vehiculosMap.get(servicio.vehicleid) : null;
    const placa = vehiculo?.plate ?? "";
    return placa.toLowerCase().includes(texto);
  });

  pintarTabla(filtradas);
}

function pintarTabla(facturas) {
  const tbody = document.getElementById("tabla-facturas");
  tbody.innerHTML = "";

  if (facturas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No hay facturas que coincidan</td></tr>`;
    return;
  }

  facturas.forEach((f) => {
    const servicio = serviciosMap.get(f.servicioid);
    const vehiculo = servicio ? vehiculosMap.get(servicio.vehicleid) : null;
    const placa = vehiculo?.plate ?? `Servicio ${f.servicioid}`;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${f.id}</td>
      <td>${placa}</td>
      <td>$${Number(f.subtotal).toLocaleString("es-CO")}</td>
      <td>$${Number(f.iva).toLocaleString("es-CO")}</td>
      <td><strong>$${Number(f.total).toLocaleString("es-CO")}</strong></td>
      <td>${f.fecha ?? ""}</td>
      <td><span class="badge bg-info text-dark">${f.status}</span></td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="verFactura(${f.id})">
          <i class="bi bi-eye"></i> Ver / Imprimir
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

// ============================================================
// VER / IMPRIMIR FACTURA
// ============================================================

let facturaAbiertaId = null;

async function verFactura(facturaId) {
  try {
    const factura = facturasCache.find((f) => f.id === facturaId) ?? await apiGet(`/FindOneFactura?id=${facturaId}`);
    const servicio = serviciosMap.get(factura.servicioid) ?? await apiGet(`/FindOneServicio?id=${factura.servicioid}`);
    const vehiculo = vehiculosMap.get(servicio.vehicleid);
    const owner = vehiculo ? ownersMap.get(vehiculo.ownerid) : null;
    const items = await apiGet(`/showServicioItems?servicio_id=${servicio.id ?? factura.servicioid}`);

    document.getElementById("f-id").textContent = factura.id;
    document.getElementById("f-fecha").textContent = factura.fecha ?? "";
    document.getElementById("f-estado").textContent = factura.status;

    document.getElementById("f-cliente").textContent = owner?.name ?? "N/D";
    document.getElementById("f-cc").textContent = owner?.cc ?? "N/D";
    document.getElementById("f-tel").textContent = owner?.cellphone ?? "N/D";

    document.getElementById("f-vehiculo").textContent = vehiculo
      ? `${vehiculo.marca ?? ""} ${vehiculo.name ?? ""} - Placa ${vehiculo.plate ?? ""}`
      : "N/D";

    document.getElementById("f-servicio").textContent = servicio.description ?? "";

    const tbodyItems = document.getElementById("f-items");
    tbodyItems.innerHTML = "";
    if (!items || items.length === 0) {
      tbodyItems.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Sin repuestos asociados</td></tr>`;
    } else {
      items.forEach((item) => {
        const producto = productosMap.get(item.productoid);
        const subtotalItem = item.quantity * item.unit_price;
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${producto?.name ?? `Producto ${item.productoid}`}</td>
          <td class="text-end">${item.quantity}</td>
          <td class="text-end">$${Number(item.unit_price).toLocaleString("es-CO")}</td>
          <td class="text-end">$${Number(subtotalItem).toLocaleString("es-CO")}</td>
        `;
        tbodyItems.appendChild(fila);
      });
    }

    document.getElementById("f-manoobra").textContent = `$${Number(servicio.labor_cost ?? 0).toLocaleString("es-CO")}`;
    document.getElementById("f-subtotal").textContent = `$${Number(factura.subtotal).toLocaleString("es-CO")}`;
    document.getElementById("f-iva").textContent = `$${Number(factura.iva).toLocaleString("es-CO")}`;
    document.getElementById("f-total").textContent = `$${Number(factura.total).toLocaleString("es-CO")}`;

    // Guardamos el id para poder marcarla como pagada, y ocultamos el botón
    // si la factura ya está pagada o anulada (no tiene sentido volver a marcarla)
    facturaAbiertaId = factura.id;
    document.getElementById("btn-marcar-pagada").style.display =
      factura.status === "pendiente" ? "inline-block" : "none";

    modalVerFactura.show();
  } catch (error) {
    mostrarError(error);
  }
}

// Abre el diálogo de impresión del navegador. Ahí mismo el usuario puede
// elegir una impresora física o "Guardar como PDF" para quedarse con una
// copia archivada de la factura en su computador.
function imprimirFactura() {
  window.print();
}

async function marcarComoPagada() {
  if (facturaAbiertaId === null) return;

  try {
    await apiPatch(`/uptadeFactura/${facturaAbiertaId}`, { status: "pagada" });
    mostrarAlerta("Factura marcada como pagada");
    document.getElementById("f-estado").textContent = "pagada";
    document.getElementById("btn-marcar-pagada").style.display = "none";
    cargarFacturas(); // refresca la tabla de fondo para que se vea el nuevo estado
  } catch (error) {
    mostrarError(error);
  }
}

async function generarFactura(evento) {
  evento.preventDefault();

  const servicioId = document.getElementById("factura-servicioid").value;

  try {
    await apiPost(`/GENERARfactura?servicio_id=${servicioId}`);
    mostrarAlerta("Factura generada correctamente");
    document.getElementById("form-factura").reset();
    modalFactura.hide();
    cargarServiciosMap();
    cargarFacturas();
  } catch (error) {
    mostrarError(error);
  }
}