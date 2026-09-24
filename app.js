// ==========================================
// VARIABLES GLOBALES Y ESTADO INICIAL
// ==========================================
let todosLosProductos = [];
let productosFiltrados = [];
let banners = [];
let carrito = JSON.parse(localStorage.getItem("mi_carrito_compras")) || [];
let bannerIndexActual = 0;
let intervaloBanner = null;

// Número de WhatsApp por defecto (se sobreescribe con lo guardado en el Admin)
let TELEFONO_WHATSAPP = "529990000000";

// ==========================================
// INICIALIZACIÓN AL CARGAR EL DOM
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {

  // 1. Cargar y Aplicar Toda la Configuración (JSON o LocalStorage)
  await cargarConfiguracionGlobal();

  // 2. Cargar Productos (Prioriza localStorage sobre productos.json)
  const productosGuardados = localStorage.getItem("mis_productos_admin");

  if (productosGuardados !== null) {
    todosLosProductos = JSON.parse(productosGuardados);
  } else {
    try {
      const res = await fetch("productos.json?v=" + new Date().getTime());
      if (res.ok) {
        todosLosProductos = await res.json();
      }
    } catch (e) {
      console.error("Error al cargar productos.json:", e);
      todosLosProductos = [];
    }
  }

  productosFiltrados = [...todosLosProductos];

  // 3. Renderizar Interfaz Inicial
  generarMenuCategorias();
  renderizarProductos(productosFiltrados);
  renderizarHistorialVistos();
  actualizarCarrito();

  // 4. Configurar Eventos Generales
  configurarBuscador();
  configurarEventosCarrito();

  // Revisar si el usuario viene buscando un término o categoría (Parámetros URL)
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get("search");
  const catParam = urlParams.get("cat");

  if (searchParam) {
    const inputBuscador = document.getElementById("buscador");
    if (inputBuscador) inputBuscador.value = searchParam;
    filtrarProductos(searchParam, "todas");
  } else if (catParam) {
    filtrarPorCategoria(catParam);
  }
});

// ==========================================
// CARGA UNIFICADA DE CONFIGURACIÓN
// ==========================================
async function cargarConfiguracionGlobal() {
  let configContacto = null;
  let configApariencia = null;
  let configBanners = null;

  // 1. Intentar cargar la configuración remota desde config.json evitando la caché
  try {
    const res = await fetch("config.json?v=" + new Date().getTime());
    if (res.ok) {
      const text = await res.text();
      // Validar que sea un JSON real 
      if (text.trim().startsWith("{")) {
        const configGeneral = JSON.parse(text);
        configContacto = configGeneral.contacto;
        configApariencia = configGeneral.apariencia;
        configBanners = configGeneral.banners;
      }
    }
  } catch (e) {
    console.warn("No se pudo cargar config.json, recurriendo a localStorage.");
  }

  // 2. Fallback a localStorage si falló la carga web
  if (!configContacto) {
    const contactoStr = localStorage.getItem("mi_config_contacto_admin");
    configContacto = contactoStr ? JSON.parse(contactoStr) : null;
  }

  if (!configApariencia) {
    const aparienciaStr = localStorage.getItem("mi_config_apariencia_admin");
    configApariencia = aparienciaStr ? JSON.parse(aparienciaStr) : null;
  }

  if (!configBanners) {
    const bannersGuardados = localStorage.getItem("mis_banners_admin");
    if (bannersGuardados) configBanners = JSON.parse(bannersGuardados);
  }

  // 3. APLICAR BANNERS
  if (configBanners && Array.isArray(configBanners) && configBanners.length > 0) {
    banners = configBanners;
  } else {
    // Fallback de imágenes de prueba si no hay banners
    banners = ["img/banner1.jpg", "img/banner2.jpg"];
  }
  renderizarBanners();

  // 4. APLICAR CONTACTO, REDES, WHATSAPP Y VIDEO
  if (configContacto) {
    if (configContacto.whatsapp) TELEFONO_WHATSAPP = configContacto.whatsapp;

    const direccionElemento = document.getElementById("direccion-tienda");
    if (direccionElemento && configContacto.direccion) {
      direccionElemento.textContent = configContacto.direccion;
    }

    // Mapa
    const iframeMapa = document.getElementById("mapa-iframe");
    const colMapa = document.getElementById("columna-mapa");
    if (configContacto.mapaUrl && iframeMapa && colMapa) {
      iframeMapa.src = configContacto.mapaUrl;
      colMapa.style.display = "block";
    }

    // --- RASTREADOR A PRUEBA DE BALAS DE YOUTUBE ---
    let iframeVideo = document.getElementById("video-iframe") || document.querySelector(".video-container iframe");
    if (!iframeVideo) {
      const allIframes = document.querySelectorAll("iframe");
      for (let frm of allIframes) {
        if (frm.src && frm.src.includes("youtube")) {
          iframeVideo = frm;
          break;
        }
      }
    }

    const colVideo = document.getElementById("columna-video");
    if (configContacto.videoUrl && iframeVideo) {
      let urlProcesada = configContacto.videoUrl;
      if (urlProcesada.includes("watch?v=")) {
        urlProcesada = urlProcesada.replace("watch?v=", "embed/");
      } else if (urlProcesada.includes("youtu.be/")) {
        urlProcesada = urlProcesada.replace("youtu.be/", "www.youtube.com/embed/");
      } else if (urlProcesada.includes("youtube.com/shorts/")) {
        urlProcesada = urlProcesada.replace("youtube.com/shorts/", "www.youtube.com/embed/");
      }
      iframeVideo.src = urlProcesada;
      if (colVideo) colVideo.style.display = "block";
    }

    // --- ENLACES DE REDES SOCIALES EN BOTONES ---
    const btnFb = document.querySelector(".btn-fb");
    if (btnFb && configContacto.facebookUrl) btnFb.href = configContacto.facebookUrl;

    const btnIg = document.querySelector(".btn-ig");
    if (btnIg && configContacto.instagramUrl) btnIg.href = configContacto.instagramUrl;

    // --- RASTREADOR A PRUEBA DE BALAS DE FACEBOOK ---
    if (configContacto.facebookUrl) {
      // Método 1: Si tienes el plugin oficial (.fb-page)
      const fbPlugin = document.querySelector(".fb-page");
      if (fbPlugin) {
        fbPlugin.setAttribute("data-href", configContacto.facebookUrl);
        if (window.FB) {
          window.FB.XFBML.parse(); // Recarga Facebook
        } else {
          // Forzar inyección del script si no existe
          const script = document.createElement("script");
          script.src = "https://connect.facebook.net/es_LA/sdk.js#xfbml=1&version=v18.0";
          script.async = true; script.defer = true; script.crossOrigin = "anonymous";
          document.body.appendChild(script);
        }
      }

      // Método 2: Si tienes un <iframe> de Facebook incrustado a mano
      let iframeFb = document.querySelector("iframe[src*='facebook.com/plugins']");
      if (!iframeFb) {
        const allIframes = document.querySelectorAll("iframe");
        for (let frm of allIframes) {
          if (frm.src && frm.src.includes("facebook.com/plugins")) iframeFb = frm;
        }
      }
      if (iframeFb) {
        iframeFb.src = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(configContacto.facebookUrl)}&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`;
      }
    }
  }

  // 5. APLICAR APARIENCIA (Colores y Logo)
  if (configApariencia) {
    const logoImg = document.querySelector(".logo-img");
    if (logoImg && configApariencia.logoHeight) {
      logoImg.style.maxHeight = `${configApariencia.logoHeight}px`;
    }

    const header = document.querySelector(".header");
    if (header && configApariencia.colorPrincipal) {
      header.style.backgroundColor = configApariencia.colorPrincipal;
    }

    if (header && configApariencia.colorHeaderTexto) {
      header.style.color = configApariencia.colorHeaderTexto;
      const links = header.querySelectorAll("a, span, button");
      links.forEach(l => l.style.color = configApariencia.colorHeaderTexto);
    }

    const cartHeader = document.querySelector(".cart-header");
    if (cartHeader && configApariencia.colorPrincipal) {
      cartHeader.style.backgroundColor = configApariencia.colorPrincipal;
    }

    if (cartHeader && configApariencia.colorHeaderTexto) {
      const cartElements = cartHeader.querySelectorAll("h3, .close-btn");
      cartElements.forEach(el => el.style.color = configApariencia.colorHeaderTexto);
    }
  }

  // 6. CORREGIR CONTRASTE DEL TÍTULO DE REDES SOCIALES
  const tituloRedes = document.querySelector(".social-section h2, .section-title-social");
  const subtituloRedes = document.querySelector(".social-section p, .section-subtitle-social");

  if (tituloRedes) {
    tituloRedes.style.color = "#1e293b"; // Color oscuro garantizado
    tituloRedes.style.fontWeight = "bold";
  }
  if (subtituloRedes) {
    subtituloRedes.style.color = "#475569"; // Color gris oscuro garantizado
  }
}

// ==========================================
// CARRUSEL DE BANNERS PROMOCIONALES
// ==========================================
function renderizarBanners() {
  const track = document.getElementById("banner-track");
  const dotsContainer = document.getElementById("banner-dots");
  const btnPrev = document.getElementById("btn-prev-banner");
  const btnNext = document.getElementById("btn-next-banner");

  if (!track) return;

  track.innerHTML = "";
  if (dotsContainer) dotsContainer.innerHTML = "";

  if (!banners || banners.length === 0) {
    track.innerHTML = `
      <div class="banner-slide">
        <img src="img/logo.png" alt="Bienvenido" onerror="this.onerror=null; this.src='img/logo.png';" style="object-fit: contain; background: #fff;">
      </div>
    `;
    if (btnPrev) btnPrev.style.display = "none";
    if (btnNext) btnNext.style.display = "none";
    return;
  }

  if (btnPrev) btnPrev.style.display = banners.length > 1 ? "flex" : "none";
  if (btnNext) btnNext.style.display = banners.length > 1 ? "flex" : "none";

  banners.forEach((urlBanner, index) => {
    const slide = document.createElement("div");
    slide.className = "banner-slide";
    slide.innerHTML = `<img src="${urlBanner}" alt="Banner ${index + 1}" onerror="this.onerror=null; this.src='img/logo.png';">`;
    track.appendChild(slide);

    if (dotsContainer && banners.length > 1) {
      const dot = document.createElement("span");
      dot.className = `banner-dot ${index === 0 ? 'active' : ''}`;
      dot.onclick = () => irABanner(index);
      dotsContainer.appendChild(dot);
    }
  });

  if (banners.length > 1) {
    iniciarAutoCarrusel();
    if (btnPrev) btnPrev.onclick = () => moverBanner(-1);
    if (btnNext) btnNext.onclick = () => moverBanner(1);
  }
}

function moverBanner(direccion) {
  bannerIndexActual += direccion;
  if (bannerIndexActual < 0) {
    bannerIndexActual = banners.length - 1;
  } else if (bannerIndexActual >= banners.length) {
    bannerIndexActual = 0;
  }
  actualizarPosicionBanner();
  reiniciarAutoCarrusel();
}

function irABanner(index) {
  bannerIndexActual = index;
  actualizarPosicionBanner();
  reiniciarAutoCarrusel();
}

function actualizarPosicionBanner() {
  const track = document.getElementById("banner-track");
  const dots = document.querySelectorAll(".banner-dot");

  if (track) {
    track.style.transform = `translateX(-${bannerIndexActual * 100}%)`;
  }

  dots.forEach((dot, idx) => {
    dot.classList.toggle("active", idx === bannerIndexActual);
  });
}

function iniciarAutoCarrusel() {
  detenerAutoCarrusel();
  intervaloBanner = setInterval(() => {
    moverBanner(1);
  }, 5000);
}

function detenerAutoCarrusel() {
  if (intervaloBanner) clearInterval(intervaloBanner);
}

function reiniciarAutoCarrusel() {
  detenerAutoCarrusel();
  iniciarAutoCarrusel();
}

// ==========================================
// MENÚ DE CATEGORÍAS DINÁMICO
// ==========================================
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

  categoriasUnicas.forEach((cat, idx) => {
    const btn = document.createElement("button");
    btn.className = `category-btn ${idx === 0 ? 'active' : ''}`;
    btn.textContent = cat === "todas" ? "Todas las categorías" : cat;
    btn.onclick = () => {
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filtrarPorCategoria(cat);
    };
    menuContainer.appendChild(btn);
  });
}

function filtrarPorCategoria(cat) {
  const titulo = document.getElementById("catalogo-titulo");
  if (titulo) {
    titulo.textContent = cat === "todas" ? "Todos los productos" : `Categoría: ${cat}`;
  }

  if (cat === "todas") {
    productosFiltrados = [...todosLosProductos];
  } else {
    productosFiltrados = todosLosProductos.filter(p =>
      p.categoria && p.categoria.trim().toLowerCase() === cat.trim().toLowerCase()
    );
  }

  renderizarProductos(productosFiltrados);
}

// ==========================================
// RENDERIZADO DE PRODUCTOS
// ==========================================
function renderizarProductos(lista) {
  const grid = document.getElementById("grid-productos");
  if (!grid) return;

  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `
      <p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px; font-size: 1.1rem;">
        No se encontraron productos disponibles.
      </p>
    `;
    return;
  }

  lista.forEach(prod => {
    const tieneOferta = prod.en_oferta;
    const precioFinal = tieneOferta ? prod.precio_oferta : prod.precio_menudeo;
    const portada = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes[0] : (prod.imagen || 'img/logo.png');

    let porcentajeDescuento = 0;
    if (tieneOferta && prod.precio_menudeo > 0) {
      porcentajeDescuento = Math.round(((prod.precio_menudeo - prod.precio_oferta) / prod.precio_menudeo) * 100);
    }

    const tieneMayoreo = prod.precio_mayoreo && prod.precio_mayoreo > 0;

    const cardHTML = `
      <div class="card">
        <a href="producto.html?id=${prod.id}" style="text-decoration: none; color: inherit;">
          <div class="card-img-wrapper">
            <img src="${portada}" alt="${prod.nombre}" class="card-img" onerror="this.onerror=null; this.src='img/logo.png';">
          </div>
          <div class="card-body">
            <h3 class="card-title">${prod.nombre}</h3>
        </a>

            <div class="price-container">
              ${tieneOferta ? `<span class="original-price">$${prod.precio_menudeo}</span>` : ''}
              <span class="current-price">$${precioFinal}</span>
              ${tieneOferta ? `<span class="discount-badge">${porcentajeDescuento}% OFF</span>` : ''}
            </div>

            ${tieneMayoreo ? `
              <div class="mayoreo-badge">
                Mayoreo: $${prod.precio_mayoreo} (a partir de${prod.min_mayoreo || 1} pzs)
              </div>
            ` : ''}

            <button class="btn-add" onclick="agregarAlCarrito('${prod.id}')">
              Agregar al carrito 🛒
            </button>
          </div>
      </div>
    `;

    grid.innerHTML += cardHTML;
  });
}

// ==========================================
// BUSCADOR EN TIEMPO REAL
// ==========================================
function configurarBuscador() {
  const inputBuscador = document.getElementById("buscador");
  if (!inputBuscador) return;

  inputBuscador.addEventListener("input", (e) => {
    const texto = e.target.value.trim().toLowerCase();

    if (texto === "") {
      productosFiltrados = [...todosLosProductos];
    } else {
      productosFiltrados = todosLosProductos.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(texto)) ||
        (p.categoria && p.categoria.toLowerCase().includes(texto))
      );
    }

    renderizarProductos(productosFiltrados);
  });
}

function filtrarProductos(texto, categoria) {
  let resultado = [...todosLosProductos];

  if (categoria !== "todas") {
    resultado = resultado.filter(p => p.categoria && p.categoria.toLowerCase() === categoria.toLowerCase());
  }

  if (texto) {
    resultado = resultado.filter(p =>
      p.nombre.toLowerCase().includes(texto.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(texto.toLowerCase()))
    );
  }

  renderizarProductos(resultado);
}

// ==========================================
// VISTO RECIENTEMENTE (CARRUSEL INFERIOR)
// ==========================================
function renderizarHistorialVistos() {
  const contenedorSeccion = document.getElementById("section-vistos");
  const gridVistos = document.getElementById("grid-vistos");

  if (!contenedorSeccion || !gridVistos) return;

  const vistos = JSON.parse(localStorage.getItem("productos_vistos")) || [];

  if (vistos.length === 0) {
    contenedorSeccion.style.display = "none";
    return;
  }

  contenedorSeccion.style.display = "block";
  gridVistos.innerHTML = "";

  vistos.forEach(prod => {
    const tieneOferta = prod.en_oferta;
    const precioFinal = tieneOferta ? prod.precio_oferta : prod.precio_menudeo;
    const portada = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes[0] : (prod.imagen || 'img/logo.png');

    let porcentajeDescuento = 0;
    if (tieneOferta && prod.precio_menudeo > 0) {
      porcentajeDescuento = Math.round(((prod.precio_menudeo - prod.precio_oferta) / prod.precio_menudeo) * 100);
    }

    gridVistos.innerHTML += `
      <a href="producto.html?id=${prod.id}" class="card-visto">
        <img src="${portada}" alt="${prod.nombre}" class="card-visto-img" onerror="this.onerror=null; this.src='img/logo.png';">
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

  configurarFlechasVistos();
}

function configurarFlechasVistos() {
  const container = document.getElementById("carousel-vistos");
  const btnPrev = document.getElementById("btn-prev-vistos");
  const btnNext = document.getElementById("btn-next-vistos");

  if (!container || !btnPrev || !btnNext) return;

  btnPrev.onclick = () => container.scrollBy({ left: -300, behavior: "smooth" });
  btnNext.onclick = () => container.scrollBy({ left: 300, behavior: "smooth" });
}

// ==========================================
// CARRITO DE COMPRAS Y WHATSAPP
// ==========================================
function configurarEventosCarrito() {
  const iconoCarrito = document.querySelector(".carrito-icon");
  if (iconoCarrito) iconoCarrito.onclick = abrirCarrito;

  const btnCerrarCarrito = document.getElementById("close-cart");
  if (btnCerrarCarrito) btnCerrarCarrito.onclick = cerrarCarrito;

  const btnWs = document.getElementById("btn-whatsapp");
  if (btnWs) btnWs.onclick = enviarWhatsApp;
}

function agregarAlCarrito(id) {
  const prod = todosLosProductos.find(p => p.id === id);
  if (!prod) return;

  const itemEnCarrito = carrito.find(item => item.id === id);

  if (itemEnCarrito) {
    itemEnCarrito.cantidad += 1;
  } else {
    carrito.push({
      id: prod.id,
      nombre: prod.nombre,
      precio_menudeo: prod.precio_menudeo,
      precio_mayoreo: prod.precio_mayoreo || 0,
      min_mayoreo: prod.min_mayoreo || 0,
      en_oferta: prod.en_oferta,
      precio_oferta: prod.precio_oferta,
      cantidad: 1
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
            ${aplicaMayoreo ? '<span class="badge-mayoreo-applied">¡Mayoreo aplicado!</span>' : ''}
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

  let mensaje = "¡Hola! Me gustaría solicitar el siguiente pedido desde el catálogo web:\n\n";
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
  mensaje += "\n¿Tienen disponibilidad para acordar el pago y la entrega?";

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