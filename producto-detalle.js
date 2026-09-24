let productoActual = null;
let todosLosProductos = [];
let imagenesGaleria = [];
let indiceImagenLightbox = 0;
let carrito = JSON.parse(localStorage.getItem("mi_carrito_compras")) || [];

// Variable dinámica de WhatsApp (Sobreescribible por el Admin)
let TELEFONO_WHATSAPP = "529990000000";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Aplicar la configuración dinámica del Admin (Logo, colores, WhatsApp, pie de página)
  await aplicarConfiguracionPersonalizada();

  const urlParams = new URLSearchParams(window.location.search);
  const productoId = urlParams.get("id");

  if (!productoId) {
    document.getElementById("product-detail").innerHTML = "<h2>Producto no encontrado</h2>";
    return;
  }

  // Cargar lista general de productos
  const guardados = localStorage.getItem("mis_productos_admin");

  if (guardados) {
    todosLosProductos = JSON.parse(guardados);
  } else {
    try {
      const res = await fetch("productos.json?v=" + new Date().getTime());
      if (res.ok) todosLosProductos = await res.json();
    } catch (e) {
      console.error("Error al cargar productos:", e);
    }
  }

  productoActual = todosLosProductos.find(p => p.id === productoId);

  if (!productoActual) {
    document.getElementById("product-detail").innerHTML = "<h2>El producto solicitado no existe o fue eliminado.</h2>";
    return;
  }

  registrarProductoVisto(productoActual);
  renderizarDetalle(productoActual);
  generarMenuCategorias();
  cargarProductosRelacionados();
  configurarEventosLightbox();
  actualizarCarrito();
  configurarBotonCompartir(); // <-- NUEVA FUNCIÓN PARA EL BOTÓN DE COMPARTIR

  // Eventos de la barra superior y carrito
  const iconoCarrito = document.querySelector(".carrito-icon");
  if (iconoCarrito) iconoCarrito.addEventListener("click", abrirCarrito);

  const btnCerrarCarrito = document.getElementById("close-cart");
  if (btnCerrarCarrito) btnCerrarCarrito.addEventListener("click", cerrarCarrito);

  const btnWs = document.getElementById("btn-whatsapp");
  if (btnWs) btnWs.addEventListener("click", enviarWhatsApp);

  const buscador = document.getElementById("buscador");
  if (buscador) {
    buscador.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && buscador.value.trim() !== "") {
        window.location.href = `index.html?search=${encodeURIComponent(buscador.value.trim())}`;
      }
    });
  }
});

// Función para sincronizar la configuración del Panel de Control de forma asíncrona mediante config.json
async function aplicarConfiguracionPersonalizada() {
  let configContacto = null;
  let configApariencia = null;

  // Intentar cargar la configuración remota desde config.json evitando la caché
  try {
    const res = await fetch("config.json?v=" + new Date().getTime());
    if (res.ok) {
      const configGeneral = await res.json();
      configContacto = configGeneral.contacto;
      configApariencia = configGeneral.apariencia;
    }
  } catch (e) {
    console.warn("No se pudo cargar config.json, recurriendo a localStorage local:", e);
  }

  // Fallback a localStorage
  if (!configContacto) {
    const contactoStr = localStorage.getItem("mi_config_contacto_admin");
    configContacto = contactoStr ? JSON.parse(contactoStr) : {
      whatsapp: "529990000000",
      direccion: "Holcá, Yucatán, México",
      mapaUrl: "",
      videoUrl: "",
      facebookUrl: ""
    };
  }

  if (!configApariencia) {
    const aparienciaStr = localStorage.getItem("mi_config_apariencia_admin");
    configApariencia = aparienciaStr ? JSON.parse(aparienciaStr) : {
      logoHeight: 48,
      colorPrincipal: "#9acd32",
      colorHeaderTexto: "#2d3277"
    };
  }

  // A. Cargar Datos de Contacto, Ubicación, Mapa, Video y Redes
  if (configContacto) {
    if (configContacto.whatsapp) {
      TELEFONO_WHATSAPP = configContacto.whatsapp;
    }

    const direccionElemento = document.getElementById("direccion-tienda");
    if (direccionElemento && configContacto.direccion) {
      direccionElemento.textContent = configContacto.direccion;
    }

    // Cargar Mapa de Google
    const iframeMapa = document.getElementById("mapa-iframe");
    const colMapa = document.getElementById("columna-mapa");
    if (configContacto.mapaUrl && iframeMapa && colMapa) {
      iframeMapa.src = configContacto.mapaUrl;
      colMapa.style.display = "block";
    }

    // Cargar Video de YouTube
    const iframeVideo = document.getElementById("video-iframe");
    const colVideo = document.getElementById("columna-video");
    if (configContacto.videoUrl && iframeVideo && colVideo) {
      iframeVideo.src = configContacto.videoUrl;
      colVideo.style.display = "block";
    }

    // Cargar Enlace de Facebook
    const linkFb = document.querySelector(".btn-fb");
    if (linkFb && configContacto.facebookUrl) {
      linkFb.href = configContacto.facebookUrl;
    }
  }

  // B. Cargar Configuración de Apariencia (Logo, Header y Carrito)
  if (configApariencia) {
    // Alto del Logo
    const logoImg = document.querySelector(".logo-img");
    if (logoImg && configApariencia.logoHeight) {
      logoImg.style.maxHeight = `${configApariencia.logoHeight}px`;
    }

    // Color Principal del Header
    const header = document.querySelector(".header");
    if (header && configApariencia.colorPrincipal) {
      header.style.backgroundColor = configApariencia.colorPrincipal;
    }

    // Color Texto Encabezado
    if (header && configApariencia.colorHeaderTexto) {
      header.style.color = configApariencia.colorHeaderTexto;
      const links = header.querySelectorAll("a, span, button");
      links.forEach(l => l.style.color = configApariencia.colorHeaderTexto);
    }

    // Color Personalizado para la barra superior del Carrito Modal
    const cartHeader = document.querySelector(".cart-header");
    if (cartHeader && configApariencia.colorPrincipal) {
      cartHeader.style.backgroundColor = configApariencia.colorPrincipal;
    }

    if (cartHeader && configApariencia.colorHeaderTexto) {
      const cartElements = cartHeader.querySelectorAll("h3, .close-btn");
      cartElements.forEach(el => el.style.color = configApariencia.colorHeaderTexto);
    }
  }
}

// Guardar en el historial para "Visto recientemente"
function registrarProductoVisto(producto) {
  let vistos = JSON.parse(localStorage.getItem("productos_vistos")) || [];
  vistos = vistos.filter(p => p.id !== producto.id);
  vistos.unshift(producto);
  if (vistos.length > 10) vistos.pop();
  localStorage.setItem("productos_vistos", JSON.stringify(vistos));
}

// Generar categorías en el menú superior
function generarMenuCategorias() {
  const menuContainer = document.getElementById("categories-menu");
  if (!menuContainer) return;

  const categoriasUnicas = ["todas"];

  const catAdmin = localStorage.getItem("mis_categorias_admin");
  if (catAdmin) {
    JSON.parse(catAdmin).forEach(c => {
      if (c && !categoriasUnicas.includes(c.trim())) categoriasUnicas.push(c.trim());
    });
  }

  todosLosProductos.forEach(p => {
    if (p.categoria && p.categoria.trim() !== "" && !categoriasUnicas.includes(p.categoria.trim())) {
      categoriasUnicas.push(p.categoria.trim());
    }
  });

  menuContainer.innerHTML = "";

  categoriasUnicas.forEach(cat => {
    const btn = document.createElement("button");
    const esCatActual = productoActual.categoria && productoActual.categoria.trim().toLowerCase() === cat.toLowerCase();
    btn.className = `category-btn ${esCatActual ? 'active' : ''}`;
    btn.textContent = cat === "todas" ? "Todas las categorías" : cat;

    btn.onclick = () => {
      window.location.href = `index.html?cat=${encodeURIComponent(cat)}`;
    };
    menuContainer.appendChild(btn);
  });
}

function renderizarDetalle(p) {
  const container = document.getElementById("product-detail");
  const tieneOferta = p.en_oferta;
  const precioFinal = tieneOferta ? p.precio_oferta : p.precio_menudeo;

  imagenesGaleria = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : [p.imagen || 'https://via.placeholder.com/400?text=Sin+Imagen'];

  container.innerHTML = `
    <!-- Galería con Múltiples Imágenes -->
    <div class="gallery-container">
      <div class="thumbnails-list">
        ${imagenesGaleria.map((imgUrl, index) => `
          <img 
            src="${imgUrl}" 
            class="thumb-img ${index === 0 ? 'active' : ''}" 
            onclick="cambiarImagenPrincipal('${imgUrl}',${index}, this)"
            onerror="this.src='https://via.placeholder.com/50?text=Sin+Img'"
          >
        `).join('')}
      </div>

      <div class="main-image-wrapper" onclick="abrirLightbox(${indiceImagenLightbox})" title="Hacer clic para ampliar">
        <img id="main-img" src="${imagenesGaleria[0]}" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/400?text=Sin+Imagen'">
      </div>
    </div>

    <!-- Panel de Información -->
    <div class="info-panel">
      <span class="product-status">Categoría: ${p.categoria || 'General'}</span>
      <h1 class="product-main-title">${p.nombre}</h1>

      <div class="price-box">
        ${tieneOferta ? `<span class="original-price">$${p.precio_menudeo}</span>` : ''}
        <div>
          <span class="current-price">$${precioFinal}</span>
          ${tieneOferta ? `<span class="discount-badge">OFERTA</span>` : ''}
        </div>
      </div>

      ${(p.precio_mayoreo && p.precio_mayoreo > 0) ? `
        <div class="mayoreo-info-box">
          <strong>Precio de Mayoreo:</strong> $${p.precio_mayoreo} c/u<br>
          <small>Aplica a partir de ${p.min_mayoreo || 1} piezas en tu pedido.</small>
        </div>
      ` : ''}

      <div class="qty-selector-container" style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
        <label for="cant-detalle" style="font-weight: bold;">Cantidad:</label>
        <input type="number" id="cant-detalle" value="1" min="1" style="width: 70px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
      </div>

      <button class="btn-buy-now" onclick="agregarAlCarritoDetalle()">
        Agregar al Carrito 🛒
      </button>

      <div class="description-box">
        <h3>Descripción del Producto</h3>
        <div style="color: #444; line-height: 1.6; font-size: 0.95rem; word-break: break-word;">${p.descripcion || 'Sin descripción detallada disponible.'}</div>
      </div>
    </div>
  `;
}

function cambiarImagenPrincipal(src, index, elemento) {
  indiceImagenLightbox = index;
  document.getElementById("main-img").src = src;
  document.querySelectorAll(".thumb-img").forEach(thumb => thumb.classList.remove("active"));
  elemento.classList.add("active");
}

// --- NUEVA FUNCIÓN: BOTÓN DE COMPARTIR ---
function configurarBotonCompartir() {
  const contenedorCompartir = document.getElementById("contenedor-compartir");
  const btnCompartir = document.getElementById("btn-compartir-producto");

  // Mostrar el contenedor solo si el navegador soporta la API de compartir
  if (contenedorCompartir && btnCompartir && navigator.share && productoActual) {
    contenedorCompartir.style.display = "block";

    btnCompartir.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: productoActual.nombre,
          text: `¡Mira este producto que encontré!: ${productoActual.nombre}`,
          url: window.location.href
        });
      } catch (err) {
        console.log("El usuario canceló la acción de compartir o hubo un error:", err);
      }
    });
  }
}

// --- CARRUSEL DE PRODUCTOS RELACIONADOS ---

function cargarProductosRelacionados() {
  const contenedorSeccion = document.getElementById("section-relacionados");
  const gridRelacionados = document.getElementById("grid-relacionados");

  if (!contenedorSeccion || !gridRelacionados) return;

  // Filtrar productos de la misma categoría excluyendo el actual
  const relacionados = todosLosProductos.filter(p =>
    p.id !== productoActual.id &&
    p.categoria && productoActual.categoria &&
    p.categoria.trim().toLowerCase() === productoActual.categoria.trim().toLowerCase()
  );

  if (relacionados.length === 0) {
    contenedorSeccion.style.display = "none";
    return;
  }

  contenedorSeccion.style.display = "block";
  gridRelacionados.innerHTML = "";

  relacionados.forEach(prod => {
    const tieneOferta = prod.en_oferta;
    const precioFinal = tieneOferta ? prod.precio_oferta : prod.precio_menudeo;
    const portada = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes[0] : (prod.imagen || 'https://via.placeholder.com/150');

    let porcentajeDescuento = 0;
    if (tieneOferta && prod.precio_menudeo > 0) {
      porcentajeDescuento = Math.round(((prod.precio_menudeo - prod.precio_oferta) / prod.precio_menudeo) * 100);
    }

    gridRelacionados.innerHTML += `
      <a href="producto.html?id=${prod.id}" class="card-visto">
        <img src="${portada}" alt="${prod.nombre}" class="card-visto-img" onerror="this.src='https://via.placeholder.com/150'">
        <div class="card-visto-title">${prod.nombre}</div>
        <div class="card-visto-price-box">
          ${tieneOferta ? `<span class="card-visto-original">$${prod.precio_menudeo}</span>` : ''}
          <div>
            <span class="card-visto-price">$${precioFinal}</span>
            ${tieneOferta ? `<span class="card-visto-discount">${porcentajeDescuento}% OFF</span>` : ''}
          </div>
        </div>
      </a>
    `;
  });

  configurarFlechasRelacionados();
}

function configurarFlechasRelacionados() {
  const container = document.getElementById("carousel-relacionados");
  const btnPrev = document.getElementById("btn-prev-relacionados");
  const btnNext = document.getElementById("btn-next-relacionados");

  if (!container || !btnPrev || !btnNext) return;

  btnPrev.onclick = () => {
    container.scrollBy({ left: -300, behavior: "smooth" });
  };

  btnNext.onclick = () => {
    container.scrollBy({ left: 300, behavior: "smooth" });
  };
}

// --- CONTROLES DEL LIGHTBOX ---

function abrirLightbox(index) {
  indiceImagenLightbox = index;
  const modal = document.getElementById("lightbox-modal");
  const imgLightbox = document.getElementById("lightbox-img");

  imgLightbox.src = imagenesGaleria[indiceImagenLightbox];
  modal.classList.add("open");
}

function cerrarLightbox() {
  document.getElementById("lightbox-modal").classList.remove("open");
}

function navegarLightbox(direccion) {
  indiceImagenLightbox += direccion;

  if (indiceImagenLightbox < 0) {
    indiceImagenLightbox = imagenesGaleria.length - 1;
  } else if (indiceImagenLightbox >= imagenesGaleria.length) {
    indiceImagenLightbox = 0;
  }

  document.getElementById("lightbox-img").src = imagenesGaleria[indiceImagenLightbox];
}

function configurarEventosLightbox() {
  document.getElementById("lightbox-close").onclick = cerrarLightbox;
  document.getElementById("btn-lightbox-prev").onclick = () => navegarLightbox(-1);
  document.getElementById("btn-lightbox-next").onclick = () => navegarLightbox(1);

  document.getElementById("lightbox-modal").onclick = (e) => {
    if (e.target.id === "lightbox-modal") cerrarLightbox();
  };
}

// --- CARRITO DE COMPRAS ---

function agregarAlCarritoDetalle() {
  if (!productoActual) return;

  const cantidadIngresada = parseInt(document.getElementById("cant-detalle").value) || 1;
  const itemEnCarrito = carrito.find(item => item.id === productoActual.id);

  if (itemEnCarrito) {
    itemEnCarrito.cantidad += cantidadIngresada;
  } else {
    carrito.push({
      id: productoActual.id,
      nombre: productoActual.nombre,
      precio_menudeo: productoActual.precio_menudeo,
      precio_mayoreo: productoActual.precio_mayoreo || 0,
      min_mayoreo: productoActual.min_mayoreo || 0,
      en_oferta: productoActual.en_oferta,
      precio_oferta: productoActual.precio_oferta,
      cantidad: cantidadIngresada
    });
  }

  actualizarCarrito();
  abrirCarrito();
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(i => i.id === id);
  if (!item) return;

  item.cantidad += cambio;

  if (item.cantidad <= 0) {
    carrito = carrito.filter(i => i.id !== id);
  }

  actualizarCarrito();
}

function actualizarCarrito() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");
  const btnWhatsapp = document.getElementById("btn-whatsapp");

  if (!cartItemsContainer) return;

  let totalPiezas = 0;
  let granTotal = 0;

  if (carrito.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-msg">El carrito está vacío.</p>';
    if (btnWhatsapp) btnWhatsapp.disabled = true;
  } else {
    cartItemsContainer.innerHTML = "";
    if (btnWhatsapp) btnWhatsapp.disabled = false;

    carrito.forEach(item => {
      const tieneMayoreo = item.precio_mayoreo && item.precio_mayoreo > 0 && item.min_mayoreo > 0;
      const aplicaMayoreo = tieneMayoreo && (item.cantidad >= item.min_mayoreo);
      let precioUnitario = aplicaMayoreo ? item.precio_mayoreo : (item.en_oferta ? item.precio_oferta : item.precio_menudeo);
      const subtotal = precioUnitario * item.cantidad;

      granTotal += subtotal;
      totalPiezas += item.cantidad;

      cartItemsContainer.innerHTML += `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.nombre}</div>
            <div class="cart-item-price">
              $${precioUnitario} c/u x ${item.cantidad} = <strong>$${subtotal}</strong>
            </div>
            ${aplicaMayoreo ? '<span class="badge-mayoreo-applied">¡Precio de mayoreo aplicado!</span>' : ''}
          </div>
          <div class="qty-controls">
            <button class="btn-qty" onclick="cambiarCantidad('${item.id}', -1)">-</button>
            <span>${item.cantidad}</span>
            <button class="btn-qty" onclick="cambiarCantidad('${item.id}', 1)">+</button>
          </div>
        </div>
      `;
    });
  }

  if (cartCount) cartCount.textContent = totalPiezas;
  if (cartTotal) cartTotal.textContent = `$${granTotal}`;

  localStorage.setItem("mi_carrito_compras", JSON.stringify(carrito));
}

function enviarWhatsApp() {
  if (carrito.length === 0) return;

  let mensaje = "¡Hola! Me gustaría realizar el siguiente pedido desde el catálogo:\n\n";
  let granTotal = 0;

  carrito.forEach(item => {
    const tieneMayoreo = item.precio_mayoreo && item.precio_mayoreo > 0 && item.min_mayoreo > 0;
    const aplicaMayoreo = tieneMayoreo && (item.cantidad >= item.min_mayoreo);
    let precioUnitario = aplicaMayoreo ? item.precio_mayoreo : (item.en_oferta ? item.precio_oferta : item.precio_menudeo);
    let subtotal = precioUnitario * item.cantidad;
    granTotal += subtotal;

    let etiquetaMayoreo = aplicaMayoreo ? " (Mayoreo)" : "";
    mensaje += `• ${item.cantidad}x ${item.nombre} - $${precioUnitario} c/u${etiquetaMayoreo} = $${subtotal}\n`;
  });

  mensaje += `\n*Total Estimado: $${granTotal}*\n`;
  mensaje += "\n¿Tienen disponibilidad para acordar la entrega?";

  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

function abrirCarrito() {
  const modal = document.getElementById("cart-modal");
  if (modal) modal.classList.add("open");
}

function cerrarCarrito() {
  const modal = document.getElementById("cart-modal");
  if (modal) modal.classList.remove("open");
}