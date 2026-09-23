let productos = [];
let categorias = ["Sublimación", "Textil", "Promocionales", "Accesorios"];
let banners = [];
let configContacto = {
  whatsapp: "529990000000",
  direccion: "Holcá, Yucatán, México",
  mapaUrl: "",
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  facebookUrl: "https://www.facebook.com/facebook"
};
let configApariencia = {
  logoHeight: "50",
  colorPrincipal: "#ffffff",
  colorHeaderTexto: "#1e293b",
  colorSecundario: "#1e293b"
};

let imagenesProductoTemporales = [];

function execCmd(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById("editor-descripcion").focus();
}

document.addEventListener("DOMContentLoaded", async () => {
  // Cargar Categorías
  const catGuardadas = localStorage.getItem("mis_categorias_admin");
  if (catGuardadas) categorias = JSON.parse(catGuardadas);

  // Cargar Banners
  const bannersGuardados = localStorage.getItem("mis_banners_admin");
  if (bannersGuardados) banners = JSON.parse(bannersGuardados);

  // Cargar Contacto / WhatsApp / Video / Redes
  const contactoGuardado = localStorage.getItem("mi_config_contacto_admin");
  if (contactoGuardado) configContacto = JSON.parse(contactoGuardado);

  // Cargar Apariencia
  const aparienciaGuardada = localStorage.getItem("mi_config_apariencia_admin");
  if (aparienciaGuardada) configApariencia = JSON.parse(aparienciaGuardada);

  // Cargar Productos
  const guardados = localStorage.getItem("mis_productos_admin");
  if (guardados !== null) {
    productos = JSON.parse(guardados);
  } else {
    try {
      const res = await fetch("productos.json");
      if (res.ok) productos = await res.json();
    } catch (e) {
      console.log("Iniciando catálogo vacío.");
    }
  }

  // Renderizar Vistas Iniciales
  actualizarDesplegableCategorias();
  renderizarTagsCategorias();
  renderizarBannersPreview();
  cargarFormularioContacto();
  cargarFormularioApariencia();
  renderizarTabla();
  renderizarPreviewFotosProducto();

  // Listeners de Formularios
  document.getElementById("form-categoria").addEventListener("submit", agregarNuevaCategoria);
  document.getElementById("input-banner-file").addEventListener("change", cargarBannersDesdePC);
  document.getElementById("input-prod-files").addEventListener("change", cargarFotosProductoDesdePC);
  document.getElementById("form-producto").addEventListener("submit", guardarProducto);
  document.getElementById("btn-cancelar").addEventListener("click", resetearFormulario);
  document.getElementById("btn-exportar").addEventListener("click", exportarJSON);
  document.getElementById("form-contacto").addEventListener("submit", guardarContacto);
  document.getElementById("form-apariencia").addEventListener("submit", guardarApariencia);

  // Slider de logo en vivo
  document.getElementById("logo-height").addEventListener("input", (e) => {
    document.getElementById("logo-height-val").textContent = e.target.value + "px";
  });

  document.getElementById("en_oferta").addEventListener("change", (e) => {
    document.getElementById("group-precio-oferta").style.display = e.target.checked ? "flex" : "none";
  });
});

// --- GESTIÓN DE CONTACTO, WHATSAPP, VIDEO Y MAPA ---
function cargarFormularioContacto() {
  document.getElementById("tel-whatsapp").value = configContacto.whatsapp || "";
  document.getElementById("direccion-texto").value = configContacto.direccion || "";
  document.getElementById("mapa-embed").value = configContacto.mapaUrl || "";
  
  const inputVideo = document.getElementById("url-video");
  if (inputVideo) inputVideo.value = configContacto.videoUrl || "";

  const inputFb = document.getElementById("url-facebook");
  if (inputFb) inputFb.value = configContacto.facebookUrl || "";
}

function guardarContacto(e) {
  e.preventDefault();
  
  let rawVideoUrl = document.getElementById("url-video") ? document.getElementById("url-video").value.trim() : "";
  
  if (rawVideoUrl.includes("watch?v=")) {
    rawVideoUrl = rawVideoUrl.replace("watch?v=", "embed/");
  } else if (rawVideoUrl.includes("youtu.be/")) {
    rawVideoUrl = rawVideoUrl.replace("youtu.be/", "www.youtube.com/embed/");
  }

  // Extraer automáticamente la URL limpia si pegan el <iframe> completo de Google Maps
  let rawMapaUrl = document.getElementById("mapa-embed").value.trim();
  if (rawMapaUrl.includes('src="')) {
    const match = rawMapaUrl.match(/src="([^"]+)"/);
    if (match && match[1]) rawMapaUrl = match[1];
  }

  configContacto.whatsapp = document.getElementById("tel-whatsapp").value.trim().replace(/\+/g, '');
  configContacto.direccion = document.getElementById("direccion-texto").value.trim();
  configContacto.mapaUrl = rawMapaUrl; // Guardado limpio
  configContacto.videoUrl = rawVideoUrl;
  configContacto.facebookUrl = document.getElementById("url-facebook") ? document.getElementById("url-facebook").value.trim() : "";

  localStorage.setItem("mi_config_contacto_admin", JSON.stringify(configContacto));
  alert("¡Datos guardados correctamente!");
}

// --- GESTIÓN DE APARIENCIA Y COLORES ---
function cargarFormularioApariencia() {
  document.getElementById("logo-height").value = configApariencia.logoHeight || "50";
  document.getElementById("logo-height-val").textContent = (configApariencia.logoHeight || "50") + "px";
  
  document.getElementById("color-principal").value = configApariencia.colorPrincipal || "#ffffff";
  document.getElementById("color-principal-hex").textContent = configApariencia.colorPrincipal || "#ffffff";

  document.getElementById("color-header-text").value = configApariencia.colorHeaderTexto || "#1e293b";
  document.getElementById("color-header-text-hex").textContent = configApariencia.colorHeaderTexto || "#1e293b";

  document.getElementById("color-secundario").value = configApariencia.colorSecundario || "#1e293b";
  document.getElementById("color-secundario-hex").textContent = configApariencia.colorSecundario || "#1e293b";
}

function guardarApariencia(e) {
  e.preventDefault();
  configApariencia = {
    logoHeight: document.getElementById("logo-height").value,
    colorPrincipal: document.getElementById("color-principal").value,
    colorHeaderTexto: document.getElementById("color-header-text").value,
    colorSecundario: document.getElementById("color-secundario").value
  };

  localStorage.setItem("mi_config_apariencia_admin", JSON.stringify(configApariencia));
  alert("¡Diseño y colores del catálogo actualizados!");
}

// --- BANNERS Y FOTOS ---
function cargarBannersDesdePC(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  let procesados = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      banners.push(evt.target.result);
      procesados++;
      if (procesados === files.length) {
        localStorage.setItem("mis_banners_admin", JSON.stringify(banners));
        renderizarBannersPreview();
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderizarBannersPreview() {
  const container = document.getElementById("lista-banners-preview");
  container.innerHTML = "";

  if (banners.length === 0) {
    container.innerHTML = `<p style="font-size: 0.8rem; color: #888;">No hay banners agregados.</p>`;
    return;
  }

  banners.forEach((url, index) => {
    const item = document.createElement("div");
    item.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: #f9fafb; padding: 6px 10px; border-radius: 6px; border: 1px solid #e5e7eb;";
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="${url}" style="width: 60px; height: 30px; object-fit: cover; border-radius: 4px;" onerror="this.onerror=null; this.src='img/logo.png';">
        <span style="font-size: 0.78rem;">Banner ${index + 1}</span>
      </div>
      <button type="button" class="btn-danger-icon" onclick="eliminarBanner(${index})">🗑️</button>
    `;
    container.appendChild(item);
  });
}

function eliminarBanner(index) {
  banners.splice(index, 1);
  localStorage.setItem("mis_banners_admin", JSON.stringify(banners));
  renderizarBannersPreview();
}

function cargarFotosProductoDesdePC(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  let procesados = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      imagenesProductoTemporales.push(evt.target.result);
      procesados++;
      if (procesados === files.length) {
        renderizarPreviewFotosProducto();
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderizarPreviewFotosProducto() {
  const container = document.getElementById("producto-imgs-preview");
  container.innerHTML = "";

  if (imagenesProductoTemporales.length === 0) {
    container.innerHTML = `<small style="color: #888; width: 100%; text-align: center;">No hay imágenes cargadas aún.</small>`;
    return;
  }

  imagenesProductoTemporales.forEach((url, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position: relative; display: inline-block; width: 65px; height: 65px;";
    
    wrapper.innerHTML = `
      <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: ${index === 0 ? '2px solid #3483fa' : '1px solid #ccc'}; padding: 2px;" onerror="this.onerror=null; this.src='img/logo.png';">
      ${index === 0 ? '<span style="position: absolute; bottom: 2px; left: 2px; background: #3483fa; color: white; font-size: 0.6rem; padding: 1px 3px; border-radius: 3px;">Portada</span>' : ''}
      <button type="button" onclick="eliminarFotoProducto(${index})" style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; cursor: pointer;" title="Eliminar">&times;</button>
    `;
    
    container.appendChild(wrapper);
  });
}

function eliminarFotoProducto(index) {
  imagenesProductoTemporales.splice(index, 1);
  renderizarPreviewFotosProducto();
}

// --- CATEGORÍAS ---
function actualizarDesplegableCategorias() {
  const select = document.getElementById("categoria");
  const valorActual = select.value;
  select.innerHTML = '<option value="">-- Selecciona categoría --</option>';

  categorias.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
  select.value = valorActual;
}

function renderizarTagsCategorias() {
  const container = document.getElementById("lista-categorias-tags");
  container.innerHTML = "";

  categorias.forEach((cat, index) => {
    const tag = document.createElement("span");
    tag.style.cssText = "background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;";
    tag.innerHTML = `${cat} <span onclick="eliminarCategoria(${index})" style="cursor: pointer; color: #ef4444;">&times;</span>`;
    container.appendChild(tag);
  });
}

function agregarNuevaCategoria(e) {
  e.preventDefault();
  const input = document.getElementById("nueva-categoria");
  const nombre = input.value.trim();

  if (nombre && !categorias.some(c => c.toLowerCase() === nombre.toLowerCase())) {
    categorias.push(nombre);
    localStorage.setItem("mis_categorias_admin", JSON.stringify(categorias));
    actualizarDesplegableCategorias();
    renderizarTagsCategorias();
    input.value = "";
  }
}

function eliminarCategoria(index) {
  if (confirm(`¿Eliminar la categoría "${categorias[index]}"?`)) {
    categorias.splice(index, 1);
    localStorage.setItem("mis_categorias_admin", JSON.stringify(categorias));
    actualizarDesplegableCategorias();
    renderizarTagsCategorias();
  }
}

// --- PRODUCTOS ---
function renderizarTabla() {
  const tbody = document.getElementById("tabla-body");
  tbody.innerHTML = "";

  if (productos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #777; padding: 20px;">No hay productos registrados.</td></tr>`;
    return;
  }

  productos.forEach((p, index) => {
    const portada = (p.imagenes && p.imagenes.length > 0) ? p.imagenes[0] : (p.imagen || 'img/logo.png');
    const mayoreoTexto = (p.precio_mayoreo && p.precio_mayoreo > 0) ? `$${p.precio_mayoreo} (${p.min_mayoreo || 1} pzs)` : 'N/A';

    tbody.innerHTML += `
      <tr>
        <td><img src="${portada}" class="img-thumb" onerror="this.onerror=null; this.src='img/logo.png';"></td>
        <td><strong>${p.nombre}</strong><br><small style="color: #6b7280;">📁 ${p.categoria || 'Sin categoría'}</small></td>
        <td>$${p.precio_menudeo}</td>
        <td>${mayoreoTexto}</td>
        <td>${p.en_oferta ? `$${p.precio_oferta}` : '-'}</td>
        <td style="text-align: right;">
          <button type="button" class="btn-edit-icon" onclick="editarProducto(${index})" title="Editar">✏️</button>
          <button type="button" class="btn-danger-icon" onclick="eliminarProducto(${index})" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  });

  localStorage.setItem("mis_productos_admin", JSON.stringify(productos));
}

function guardarProducto(e) {
  e.preventDefault();

  if (imagenesProductoTemporales.length === 0) {
    alert("Por favor selecciona al menos una imagen para el producto.");
    return;
  }

  const id = document.getElementById("prod-id").value;
  const pMayoreoVal = parseFloat(document.getElementById("precio_mayoreo").value);
  const minMayoreoVal = parseInt(document.getElementById("min_mayoreo").value);

  const nuevoProducto = {
    id: id ? id : "PROD-" + Date.now().toString().slice(-5),
    nombre: document.getElementById("nombre").value.trim(),
    categoria: document.getElementById("categoria").value,
    imagen: imagenesProductoTemporales[0],
    imagenes: [...imagenesProductoTemporales],
    descripcion: document.getElementById("editor-descripcion").innerHTML.trim(),
    precio_menudeo: parseFloat(document.getElementById("precio_menudeo").value) || 0,
    precio_mayoreo: !isNaN(pMayoreoVal) ? pMayoreoVal : 0,
    min_mayoreo: !isNaN(minMayoreoVal) ? minMayoreoVal : 0,
    en_oferta: document.getElementById("en_oferta").checked,
    precio_oferta: parseFloat(document.getElementById("precio_oferta").value || 0)
  };

  if (id) {
    const index = productos.findIndex(p => p.id === id);
    if (index !== -1) productos[index] = nuevoProducto;
  } else {
    productos.unshift(nuevoProducto);
  }

  resetearFormulario();
  renderizarTabla();
}

function editarProducto(index) {
  const p = productos[index];

  document.getElementById("form-title").textContent = "✏️ Editar Producto";
  document.getElementById("prod-id").value = p.id;
  document.getElementById("nombre").value = p.nombre;
  document.getElementById("categoria").value = p.categoria || "";
  
  imagenesProductoTemporales = (p.imagenes && p.imagenes.length > 0) ? [...p.imagenes] : (p.imagen ? [p.imagen] : []);
  renderizarPreviewFotosProducto();

  document.getElementById("editor-descripcion").innerHTML = p.descripcion || "";
  document.getElementById("precio_menudeo").value = p.precio_menudeo;
  document.getElementById("precio_mayoreo").value = (p.precio_mayoreo && p.precio_mayoreo > 0) ? p.precio_mayoreo : "";
  document.getElementById("min_mayoreo").value = (p.min_mayoreo && p.min_mayoreo > 0) ? p.min_mayoreo : "";
  
  const chkOferta = document.getElementById("en_oferta");
  chkOferta.checked = p.en_oferta;
  document.getElementById("group-precio-oferta").style.display = p.en_oferta ? "flex" : "none";
  document.getElementById("precio_oferta").value = p.precio_oferta || "";

  document.getElementById("btn-guardar").textContent = "💾 Actualizar Producto";
  document.getElementById("btn-cancelar").style.display = "inline-block";

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function eliminarProducto(index) {
  if (confirm(`¿Estás seguro de que deseas eliminar "${productos[index].nombre}"?`)) {
    productos.splice(index, 1);
    localStorage.setItem("mis_productos_admin", JSON.stringify(productos));
    renderizarTabla();
  }
}

function resetearFormulario() {
  document.getElementById("form-producto").reset();
  document.getElementById("prod-id").value = "";
  document.getElementById("editor-descripcion").innerHTML = "";
  imagenesProductoTemporales = [];
  renderizarPreviewFotosProducto();

  document.getElementById("form-title").textContent = "➕ Agregar Nuevo Producto";
  document.getElementById("btn-guardar").textContent = "💾 Guardar Producto";
  document.getElementById("btn-cancelar").style.display = "none";
  document.getElementById("group-precio-oferta").style.display = "none";
}

function exportarJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(productos, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "productos.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}