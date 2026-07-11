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
let facturasCache = [];
let vehiculosMap = new Map();  // id vehículo -> placa
let serviciosMap = new Map();  // id servicio -> { vehicleid, description, status }

document.addEventListener("DOMContentLoaded", async () => {
  modalFactura = new bootstrap.Modal(document.getElementById("modalFactura"));

  await cargarVehiculosMap();
  await cargarServiciosMap();
  await cargarFacturas();

  document.getElementById("form-factura").addEventListener("submit", generarFactura);
});

async function cargarVehiculosMap() {
  try {
    const vehiculos = await apiGet("/showallvehicle");
    vehiculosMap = new Map(vehiculos.map((v) => [v.id, v.plate]));
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

    const placa = vehiculosMap.get(servicio.vehicleid) ?? `Vehículo ${servicio.vehicleid}`;
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
    const placa = servicio ? (vehiculosMap.get(servicio.vehicleid) ?? "") : "";
    return placa.toLowerCase().includes(texto);
  });

  pintarTabla(filtradas);
}

function pintarTabla(facturas) {
  const tbody = document.getElementById("tabla-facturas");
  tbody.innerHTML = "";

  if (facturas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">No hay facturas que coincidan</td></tr>`;
    return;
  }

  facturas.forEach((f) => {
    const servicio = serviciosMap.get(f.servicioid);
    const placa = servicio ? (vehiculosMap.get(servicio.vehicleid) ?? `Servicio ${f.servicioid}`) : `Servicio ${f.servicioid}`;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${f.id}</td>
      <td>${placa}</td>
      <td>$${Number(f.subtotal).toLocaleString("es-CO")}</td>
      <td>$${Number(f.iva).toLocaleString("es-CO")}</td>
      <td><strong>$${Number(f.total).toLocaleString("es-CO")}</strong></td>
      <td>${f.fecha ?? ""}</td>
      <td><span class="badge bg-info text-dark">${f.status}</span></td>
    `;
    tbody.appendChild(fila);
  });
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