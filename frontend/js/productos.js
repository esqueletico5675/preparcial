// ============================================================
// PRODUCTOS.JS
// Maneja la tabla y el formulario (modal) de productos/repuestos.
// ============================================================

let modalProducto;
let productosCache = []; // última lista cargada, para filtrar sin volver a pedirla al backend

document.addEventListener("DOMContentLoaded", () => {
  modalProducto = new bootstrap.Modal(document.getElementById("modalProducto"));
  cargarProductos();

  document.getElementById("form-producto").addEventListener("submit", guardarProducto);
});

async function cargarProductos() {
  try {
    productosCache = await apiGet("/showproductos");
    aplicarBusqueda();
  } catch (error) {
    mostrarError(error);
  }
}

// Filtra productosCache por nombre o SKU
function aplicarBusqueda() {
  const texto = (document.getElementById("buscador")?.value || "").toLowerCase().trim();

  if (!texto) {
    pintarTabla(productosCache);
    return;
  }

  const filtrados = productosCache.filter((p) => {
    return (
      (p.name ?? "").toLowerCase().includes(texto) ||
      (p.sku ?? "").toLowerCase().includes(texto)
    );
  });

  pintarTabla(filtrados);
}

function pintarTabla(productos) {
  const tbody = document.getElementById("tabla-productos");
  tbody.innerHTML = "";

  if (productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No hay productos registrados</td></tr>`;
    return;
  }

  productos.forEach((p) => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name ?? ""}</td>
      <td>${p.description ?? ""}</td>
      <td>$${Number(p.price).toLocaleString("es-CO")}</td>
      <td>${p.stock}</td>
      <td>${p.sku ?? ""}</td>
      <td>
        <span class="badge ${p.active ? "bg-success" : "bg-secondary"}">
          ${p.active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary" onclick='abrirEditar(${JSON.stringify(p)})'>
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="eliminarProducto(${p.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

function abrirNuevo() {
  document.getElementById("form-producto").reset();
  document.getElementById("producto-id").value = "";
  document.getElementById("tituloModal").textContent = "Nuevo producto";
}

function abrirEditar(producto) {
  document.getElementById("producto-id").value = producto.id;
  document.getElementById("producto-name").value = producto.name ?? "";
  document.getElementById("producto-description").value = producto.description ?? "";
  document.getElementById("producto-price").value = producto.price ?? "";
  document.getElementById("producto-stock").value = producto.stock ?? "";
  document.getElementById("producto-sku").value = producto.sku ?? "";
  document.getElementById("tituloModal").textContent = "Editar producto";
  modalProducto.show();
}

async function guardarProducto(evento) {
  evento.preventDefault();

  const id = document.getElementById("producto-id").value;
  const datos = {
    name: document.getElementById("producto-name").value,
    description: document.getElementById("producto-description").value || null,
    price: Number(document.getElementById("producto-price").value),
    stock: Number(document.getElementById("producto-stock").value),
    sku: document.getElementById("producto-sku").value || null,
  };

  try {
    if (id) {
      await apiPatch(`/uptadeProducto/${id}`, datos);
      mostrarAlerta("Producto actualizado correctamente");
    } else {
      await apiPost("/CREATEproducto", datos);
      mostrarAlerta("Producto creado correctamente");
    }
    modalProducto.hide();
    cargarProductos();
  } catch (error) {
    mostrarError(error);
  }
}

async function eliminarProducto(id) {
  if (!confirm("¿Seguro que deseas desactivar este producto?")) return;

  try {
    await apiDelete(`/KILLproducto/${id}`);
    mostrarAlerta("Producto desactivado");
    cargarProductos();
  } catch (error) {
    mostrarError(error);
  }
}