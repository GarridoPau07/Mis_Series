// Renderizado. Todo el texto entra por textContent (sin innerHTML).
const $ = s => document.querySelector(s);
const PALETA = ['#2F6B5E', '#6B1E2A', '#2A3B6B', '#4B2A6B', '#7A3B2A', '#2A5B7A'];
const colorDe = t => PALETA[[...t].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETA.length];

function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}

function crearIconoSVG(tipo) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '26');
  svg.setAttribute('height', '26');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const trazos = {
    lupa: ['<circle cx="11" cy="11" r="8"/>', '<path d="m21 21-4.3-4.3"/>'],
    offline: ['<line x1="2" y1="2" x2="22" y2="22"/>', '<path d="M8.5 16.5a5 5 0 0 1 7 0"/>', '<path d="M2 8.82a15 15 0 0 1 4.17-2.65"/>', '<path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/>', '<path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/>', '<path d="M5 12.86a10 10 0 0 1 5.17-2.89"/>', '<line x1="12" y1="20" x2="12.01" y2="20"/>'],
    llave: ['<circle cx="7.5" cy="15.5" r="5.5"/>', '<path d="m21 2-9.6 9.6"/>', '<path d="m15.5 7.5 3 3L22 7l-3-3"/>']
  };
  const circ = el('div', 'circulo-icono');
  if (tipo === 'lupa') {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '11'); c.setAttribute('cy', '11'); c.setAttribute('r', '8');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'm21 21-4.3-4.3');
    svg.append(c, p);
  } else if (tipo === 'llave') {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '7.5'); c.setAttribute('cy', '15.5'); c.setAttribute('r', '5.5');
    const p1 = document.createElementNS(ns, 'path'); p1.setAttribute('d', 'm21 2-9.6 9.6');
    const p2 = document.createElementNS(ns, 'path'); p2.setAttribute('d', 'm15.5 7.5 3 3L22 7l-3-3');
    svg.append(c, p1, p2);
  } else {
    const l1 = document.createElementNS(ns, 'line');
    l1.setAttribute('x1', '2'); l1.setAttribute('y1', '2'); l1.setAttribute('x2', '22'); l1.setAttribute('y2', '22');
    const p1 = document.createElementNS(ns, 'path'); p1.setAttribute('d', 'M8.5 16.5a5 5 0 0 1 7 0');
    const p2 = document.createElementNS(ns, 'path'); p2.setAttribute('d', 'M5 12.86a10 10 0 0 1 14 0');
    const l2 = document.createElementNS(ns, 'line');
    l2.setAttribute('x1', '12'); l2.setAttribute('y1', '20'); l2.setAttribute('x2', '12.01'); l2.setAttribute('y2', '20');
    svg.append(l1, p1, p2, l2);
  }
  circ.appendChild(svg);
  return circ;
}

function crearCaratula(titulo, caratula, claseExtra = '') {
  const car = el('div', 'caratula ' + claseExtra);
  car.style.background = colorDe(titulo);
  car.appendChild(el('span', 'inicial', (titulo[0] || '?').toUpperCase()));
  if (caratula) {
    const img = new Image();
    img.src = caratula;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    car.appendChild(img);
  }
  return car;
}

export function mostrarVista(n) {
  document.querySelectorAll('.vista').forEach(v => v.classList.toggle('activa', v.id === 'vista-' + n));
  const tabActiva = n === 'detalle' ? 'series' : n;
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('activa', b.dataset.vista === tabActiva));
}

export function marcarActivo(contenedor, attr, valor) {
  document.querySelectorAll(contenedor + ' button').forEach(b => b.classList.toggle('activa', b.dataset[attr] === valor));
}

export function pintarContadores(c) {
  document.querySelectorAll('#pestanas-lista button').forEach(b => {
    b.querySelector('span').textContent = c[b.dataset.lista] ?? 0;
  });
}

// --- VISTA 01: LISTA DE SERIES ---
export function crearTarjeta(s) {
  const art = el('article', 'tarjeta');
  art.dataset.id = s.id;

  const car = crearCaratula(s.titulo, s.caratula);
  const info = el('div', 'info');
  info.appendChild(el('h3', 'titulo', s.titulo));

  const et = el('div', 'etiquetas');
  const pl = el('span', 'insignia');
  pl.append(el('i', 'punto ' + s.plataforma.toLowerCase()), s.plataforma);
  et.appendChild(pl);
  if (s.enEmision) {
    const em = el('span', 'insignia emision');
    em.append(el('i', 'punto'), 'En emisión');
    et.appendChild(em);
  }

  const pista = el('div', 'pista');
  const barra = el('div', 'barra');
  barra.style.width = (s.totalEpisodios ? Math.min(100, Math.round(100 * s.capituloActual / s.totalEpisodios)) : 0) + '%';
  pista.appendChild(barra);

  const total = s.totalEpisodios ?? '?';
  const textoProg = `${s.estado === 'completada' ? 'Completada · ' : 'Cap. '}${s.capituloActual} / ${total}`;
  info.append(et, pista, el('p', 'progreso', textoProg));
  art.append(car, info);

  if (s.estado !== 'completada') {
    const b = el('button', 'mas', '+1');
    b.dataset.accion = 'mas';
    b.setAttribute('aria-label', 'Sumar un capítulo a ' + s.titulo);
    art.appendChild(b);
  }
  return art;
}

export function pintarLista(series) {
  $('#lista').replaceChildren(...series.map(crearTarjeta));
  $('#vacio').hidden = series.length > 0;
}

// --- VISTA 02 / 07 / 08 / 09: BÚSQUEDA ---
export function pintarEstadoBusqueda(config) {
  const cont = $('#buscar-estado');
  const wrap = $('#buscar-resultados-wrap');
  if (!config) {
    cont.replaceChildren();
    return;
  }
  wrap.hidden = true;
  const box = el('div', 'vacio estado-busqueda');
  if (config.icono) box.appendChild(crearIconoSVG(config.icono));
  box.appendChild(el('h2', '', config.titulo));
  if (config.texto) box.appendChild(el('p', '', config.texto));
  if (config.boton) {
    const btn = el('button', 'primario btn-centrado', config.boton);
    btn.dataset.accionEstado = config.accion;
    box.appendChild(btn);
  }
  cont.replaceChildren(box);
}

export function pintarResultadosBusqueda(resultados, fuenteLabel, idsGuardados) {
  $('#buscar-estado').replaceChildren();
  const wrap = $('#buscar-resultados-wrap');
  wrap.hidden = false;
  $('#buscar-fuente-label').textContent = fuenteLabel;

  const tarjetas = resultados.map(r => {
    const art = el('article', 'tarjeta tarjeta-busqueda');
    const car = crearCaratula(r.titulo, r.caratula);
    const info = el('div', 'info');
    info.appendChild(el('h3', 'titulo', r.titulo));

    const partes = [];
    if (r.totalEpisodios) partes.push(r.totalEpisodios + ' episodios');
    else if (r.enEmision) partes.push('En emisión');
    if (r.anio) partes.push(String(r.anio));
    info.appendChild(el('p', 'progreso', partes.join(' · ') || 'Sin datos de episodios'));

    const yaEsta = idsGuardados.has(r.id);
    const btn = el('button', yaEsta ? 'btn-anadir ya-anadido' : 'btn-anadir', yaEsta ? 'Añadido' : 'Añadir');
    btn.disabled = yaEsta;
    btn.dataset.idResultado = r.id;

    art.append(car, info, btn);
    return art;
  });

  $('#buscar-resultados').replaceChildren(...tarjetas);
}

// --- VISTA 03: MODAL AÑADIR SERIE ---
export function abrirModalAnadir(serie, plataformaInicial, capInicial) {
  const res = $('#modal-resumen');
  const car = crearCaratula(serie.titulo, serie.caratula, 'caratula-mini');
  const info = el('div', 'info');
  info.appendChild(el('h3', 'titulo', serie.titulo));
  const origen = serie.fuente === 'anilist' ? 'AniList' : 'TMDB';
  const eps = serie.totalEpisodios ? `${serie.totalEpisodios} episodios` : (serie.enEmision ? 'En emisión' : 'Episodios desconocidos');
  info.appendChild(el('p', 'progreso', `${origen} · ${eps}`));
  res.replaceChildren(car, info);

  marcarActivo('#modal-plataformas', 'plataforma', plataformaInicial);
  $('#modal-cap').textContent = String(capInicial);
  $('#modal-anadir').hidden = false;
}

export function cerrarModalAnadir() {
  $('#modal-anadir').hidden = true;
}

// --- VISTA 04: DETALLE DE SERIE ---
export function pintarDetalle(s) {
  const cont = $('#detalle-contenido');
  const cab = el('div', 'detalle-cabecera-serie');
  cab.appendChild(crearCaratula(s.titulo, s.caratula, 'caratula-grande'));
  cab.appendChild(el('h1', 'detalle-titulo', s.titulo));

  const et = el('div', 'etiquetas etiquetas-centradas');
  const pl = el('span', 'insignia');
  pl.append(el('i', 'punto ' + s.plataforma.toLowerCase()), s.plataforma);
  et.appendChild(pl);
  if (s.enEmision) {
    const em = el('span', 'insignia emision');
    em.append(el('i', 'punto'), 'En emisión');
    et.appendChild(em);
  }
  cab.appendChild(et);

  const pct = s.totalEpisodios ? Math.min(100, Math.round(100 * s.capituloActual / s.totalEpisodios)) : 0;
  const progBox = el('div', 'panel detalle-progreso');
  const progTop = el('div', 'detalle-progreso-top');
  progTop.append(
    el('span', '', `Capítulo ${s.capituloActual} de ${s.totalEpisodios ?? '?'}`),
    el('span', 'pct-texto', s.totalEpisodios ? `${pct} %` : '—')
  );
  const pista = el('div', 'pista');
  const barra = el('div', 'barra');
  barra.style.width = pct + '%';
  pista.appendChild(barra);
  progBox.append(progTop, pista);

  const botonesDelta = el('div', 'detalle-botones-cap');
  const btnMenos = el('button', 'secundario', '−1');
  btnMenos.id = 'det-menos';
  const btnMas = el('button', 'primario', '+1');
  btnMas.id = 'det-mas';
  botonesDelta.append(btnMenos, btnMas);

  const panelManual = el('div', 'panel fila-manual');
  panelManual.appendChild(el('label', '', 'Editar capítulo manualmente'));
  const inputCap = el('input', 'input-cap-manual');
  inputCap.id = 'det-input-cap';
  inputCap.type = 'number';
  inputCap.min = '0';
  if (s.totalEpisodios != null) inputCap.max = String(s.totalEpisodios);
  inputCap.value = String(s.capituloActual);
  panelManual.appendChild(inputCap);

  const estadosWrap = el('div', 'pestanas');
  estadosWrap.id = 'det-estados';
  [
    ['viendo', 'Viendo'],
    ['pendiente', 'Pendiente'],
    ['completada', 'Completada']
  ].forEach(([val, texto]) => {
    const b = el('button', s.estado === val ? 'activa' : '', texto);
    b.dataset.estado = val;
    estadosWrap.appendChild(b);
  });

  const btnBorrar = el('button', 'btn-peligro', 'Eliminar de mi lista');
  btnBorrar.id = 'det-eliminar';

  cont.replaceChildren(cab, progBox, botonesDelta, panelManual, estadosWrap, btnBorrar);
}