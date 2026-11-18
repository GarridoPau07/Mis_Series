import * as db from './db.js';
import * as api from './api.js';
import * as ui from './ui.js';

const $ = s => document.querySelector(s);
const estado = {
  lista: 'viendo',
  plataforma: 'todas',
  plataformaBuscar: 'Crunchyroll',
  resultados: [],
  serieModal: null,
  plataformaModal: 'Crunchyroll',
  estadoModal: 'viendo',
  capModal: 0,
  detalleId: null
};

const FILTROS = {
  viendo: s => s.estado === 'viendo',
  'ver-mas-tarde': s => s.estado === 'ver-mas-tarde' || s.estado === 'pendiente',
  emision: s => s.enEmision && s.estado !== 'completada',
  completadas: s => s.estado === 'completada'
};

const EJEMPLOS = [
  { id: 'demo:1', titulo: "Frieren: Beyond Journey's End", plataforma: 'Crunchyroll', fuente: 'anilist', capituloActual: 18, totalEpisodios: 28, enEmision: true },
  { id: 'demo:2', titulo: 'Stranger Things', plataforma: 'Netflix', fuente: 'tmdb', capituloActual: 6, totalEpisodios: 8 },
  { id: 'demo:3', titulo: 'Arcane', plataforma: 'Netflix', fuente: 'tmdb', capituloActual: 18, totalEpisodios: 18, estado: 'completada' }
];

async function refrescar() {
  const todas = await db.obtenerSeries();
  const base = todas
    .filter(s => estado.plataforma === 'todas' || s.plataforma.toLowerCase() === estado.plataforma)
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
  ui.pintarContadores(Object.fromEntries(Object.entries(FILTROS).map(([k, f]) => [k, base.filter(f).length])));
  ui.pintarLista(base.filter(FILTROS[estado.lista]));
}

function actualizarBannerOffline() {
  $('#banner-offline').hidden = navigator.onLine;
}

async function prepararVistaBuscar() {
  actualizarBannerOffline();
  const clave = await db.leerAjuste('tmdbKey');

  if (estado.plataformaBuscar === 'Netflix' && !clave) {
    estado.resultados = [];
    ui.pintarEstadoBusqueda({
      icono: 'llave',
      titulo: 'Falta tu API Key de TMDB',
      texto: 'Para buscar series de Netflix necesitas una clave gratuita de TMDB. Pégala en Ajustes.',
      boton: 'Ir a Ajustes',
      accion: 'ir-ajustes'
    });
    return;
  }

  if (!navigator.onLine) {
    estado.resultados = [];
    ui.pintarEstadoBusqueda({
      icono: 'offline',
      titulo: 'No se puede buscar ahora',
      texto: 'La búsqueda necesita internet. Puedes seguir viendo y actualizando tus series.',
      boton: 'Reintentar',
      accion: 'reintentar'
    });
    return;
  }

  if (!estado.resultados.length && !$('#input-buscar').value.trim()) {
    $('#buscar-resultados-wrap').hidden = true;
    ui.pintarEstadoBusqueda(null);
  }
}

async function ejecutarBusqueda() {
  const termino = $('#input-buscar').value.trim();
  const clave = await db.leerAjuste('tmdbKey');
  actualizarBannerOffline();

  if (estado.plataformaBuscar === 'Netflix' && !clave) {
    await prepararVistaBuscar();
    return;
  }

  if (!termino) {
    estado.resultados = [];
    $('#buscar-resultados-wrap').hidden = true;
    ui.pintarEstadoBusqueda(null);
    return;
  }

  if (!navigator.onLine) {
    await prepararVistaBuscar();
    return;
  }

  ui.pintarEstadoBusqueda({
    titulo: `Buscando en ${estado.plataformaBuscar === 'Crunchyroll' ? 'AniList' : 'TMDB'}...`
  });

  try {
    const res = await api.buscar(termino, estado.plataformaBuscar, clave);
    estado.resultados = res;

    if (!res.length) {
      ui.pintarEstadoBusqueda({
        icono: 'lupa',
        titulo: 'Sin resultados',
        texto: `No hemos encontrado "${termino}". Prueba con otro título o cambia de plataforma.`
      });
      return;
    }

    const guardadas = new Set((await db.obtenerSeries()).map(s => s.id));
    const fuente = estado.plataformaBuscar === 'Crunchyroll' ? 'Resultados de AniList' : 'Resultados de TMDB';
    ui.pintarResultadosBusqueda(res, fuente, guardadas);
  } catch (err) {
    if (err.message === 'TMDB_SIN_KEY' || err.message === 'TMDB_KEY_INVALIDA') {
      ui.pintarEstadoBusqueda({
        icono: 'llave',
        titulo: err.message === 'TMDB_KEY_INVALIDA' ? 'API Key de TMDB no válida' : 'Falta tu API Key de TMDB',
        texto: 'Revisa o pega tu clave gratuita de TMDB en Ajustes para buscar series de Netflix.',
        boton: 'Ir a Ajustes',
        accion: 'ir-ajustes'
      });
    } else {
      ui.pintarEstadoBusqueda({
        icono: 'offline',
        titulo: 'No se puede buscar ahora',
        texto: 'Comprueba tu conexión a internet e inténtalo de nuevo.',
        boton: 'Reintentar',
        accion: 'reintentar'
      });
    }
  }
}

async function abrirDetalle(id) {
  const s = await db.obtenerSerie(id);
  if (!s) return;
  estado.detalleId = id;
  ui.pintarDetalle(s);
  ui.mostrarVista('detalle');
}

function conectarEventos() {
  // Bloquear zoom con dos dedos (pinch-to-zoom) en iOS
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  // Navegación inferior y botones de acceso rápido a Buscar
  $('.tabbar').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    ui.mostrarVista(b.dataset.vista);
    if (b.dataset.vista === 'buscar') prepararVistaBuscar();
  });

  $('#btn-ir-buscar').addEventListener('click', () => {
    ui.mostrarVista('buscar');
    prepararVistaBuscar();
    $('#input-buscar').focus();
  });

  $('#btn-vacio-buscar').addEventListener('click', () => {
    ui.mostrarVista('buscar');
    prepararVistaBuscar();
    $('#input-buscar').focus();
  });

  // Pestañas y filtros de Mis series
  $('#pestanas-lista').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    estado.lista = b.dataset.lista;
    ui.marcarActivo('#pestanas-lista', 'lista', estado.lista);
    refrescar();
  });

  $('#filtros-plataforma').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    estado.plataforma = b.dataset.plataforma;
    ui.marcarActivo('#filtros-plataforma', 'plataforma', estado.plataforma);
    refrescar();
  });

  // Tarjetas: botón +1 o abrir Detalle
  $('#lista').addEventListener('click', async e => {
    const mas = e.target.closest('[data-accion="mas"]');
    if (mas) {
      await db.sumarCapitulo(mas.closest('.tarjeta').dataset.id, 1);
      refrescar();
      return;
    }
    const tarjeta = e.target.closest('.tarjeta');
    if (tarjeta) abrirDetalle(tarjeta.dataset.id);
  });

  // Búsqueda
  $('#form-buscar').addEventListener('submit', e => {
    e.preventDefault();
    ejecutarBusqueda();
  });

  $('#input-buscar').addEventListener('input', () => {
    $('#limpiar-buscar').hidden = !$('#input-buscar').value;
  });

  $('#limpiar-buscar').addEventListener('click', () => {
    $('#input-buscar').value = '';
    $('#limpiar-buscar').hidden = true;
    estado.resultados = [];
    $('#buscar-resultados-wrap').hidden = true;
    prepararVistaBuscar();
    $('#input-buscar').focus();
  });

  $('#plataformas-buscar').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    estado.plataformaBuscar = b.dataset.plataforma;
    ui.marcarActivo('#plataformas-buscar', 'plataforma', estado.plataformaBuscar);
    if ($('#input-buscar').value.trim()) ejecutarBusqueda();
    else prepararVistaBuscar();
  });

  $('#buscar-estado').addEventListener('click', e => {
    const btn = e.target.closest('[data-accion-estado]');
    if (!btn) return;
    if (btn.dataset.accionEstado === 'ir-ajustes') {
      ui.mostrarVista('ajustes');
      $('#tmdb-key').focus();
    } else if (btn.dataset.accionEstado === 'reintentar') {
      if ($('#input-buscar').value.trim()) ejecutarBusqueda();
      else prepararVistaBuscar();
    }
  });

  // Abrir modal Añadir desde resultado de búsqueda
  $('#buscar-resultados').addEventListener('click', e => {
    const btn = e.target.closest('[data-id-resultado]');
    if (!btn || btn.disabled) return;
    const serie = estado.resultados.find(r => r.id === btn.dataset.idResultado);
    if (!serie) return;
    estado.serieModal = serie;
    estado.plataformaModal = serie.plataforma;
    estado.estadoModal = 'viendo';
    estado.capModal = 0;
    ui.abrirModalAnadir(serie, estado.plataformaModal, estado.estadoModal, estado.capModal);
  });

  // Controles de la hoja modal Añadir serie
  $('#modal-backdrop').addEventListener('click', ui.cerrarModalAnadir);

  $('#modal-plataformas').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    estado.plataformaModal = b.dataset.plataforma;
    ui.marcarActivo('#modal-plataformas', 'plataforma', estado.plataformaModal);
  });

  $('#modal-estados').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    estado.estadoModal = b.dataset.estado;
    ui.marcarActivo('#modal-estados', 'estado', estado.estadoModal);
  });

  $('#modal-menos').addEventListener('click', () => {
    estado.capModal = Math.max(0, estado.capModal - 1);
    $('#modal-cap').textContent = String(estado.capModal);
  });

  $('#modal-mas').addEventListener('click', () => {
    const max = estado.serieModal?.totalEpisodios;
    estado.capModal = max != null ? Math.min(max, estado.capModal + 1) : estado.capModal + 1;
    $('#modal-cap').textContent = String(estado.capModal);
    if (estado.capModal > 0 && estado.estadoModal === 'ver-mas-tarde') {
      estado.estadoModal = 'viendo';
      ui.marcarActivo('#modal-estados', 'estado', 'viendo');
    }
  });

  $('#modal-confirmar').addEventListener('click', async () => {
    const s = estado.serieModal;
    if (!s) return;
    const completada = s.totalEpisodios != null && estado.capModal >= s.totalEpisodios && !s.enEmision;
    await db.guardarSerie({
      ...s,
      plataforma: estado.plataformaModal,
      capituloActual: estado.capModal,
      estado: completada ? 'completada' : estado.estadoModal
    });
    ui.cerrarModalAnadir();
    await refrescar();
    const guardadas = new Set((await db.obtenerSeries()).map(x => x.id));
    const fuente = estado.plataformaBuscar === 'Crunchyroll' ? 'Resultados de AniList' : 'Resultados de TMDB';
    ui.pintarResultadosBusqueda(estado.resultados, fuente, guardadas);
  });

  // Vista Detalle de serie
  $('#detalle-volver').addEventListener('click', () => ui.mostrarVista('series'));

  const borrarDetalleActual = async () => {
    if (!estado.detalleId) return;
    if (!confirm('¿Eliminar esta serie de tu lista?')) return;
    await db.eliminarSerie(estado.detalleId);
    estado.detalleId = null;
    await refrescar();
    ui.mostrarVista('series');
  };

  $('#detalle-borrar-top').addEventListener('click', borrarDetalleActual);

  $('#detalle-contenido').addEventListener('click', async e => {
    if (!estado.detalleId) return;
    if (e.target.closest('#det-menos')) {
      const s = await db.sumarCapitulo(estado.detalleId, -1);
      if (s) ui.pintarDetalle(s);
      refrescar();
    } else if (e.target.closest('#det-mas')) {
      const s = await db.sumarCapitulo(estado.detalleId, 1);
      if (s) ui.pintarDetalle(s);
      refrescar();
    } else if (e.target.closest('#det-eliminar')) {
      await borrarDetalleActual();
    } else {
      const btnEst = e.target.closest('#det-estados button');
      if (btnEst) {
        const actual = await db.obtenerSerie(estado.detalleId);
        if (!actual) return;
        const nuevoEstado = btnEst.dataset.estado;
        const cambios = { estado: nuevoEstado };
        if (nuevoEstado === 'completada' && actual.totalEpisodios != null) {
          cambios.capituloActual = actual.totalEpisodios;
        }
        const s = await db.actualizarSerie(estado.detalleId, cambios);
        if (s) ui.pintarDetalle(s);
        refrescar();
      }
    }
  });

  $('#detalle-contenido').addEventListener('change', async e => {
    if (e.target.id !== 'det-input-cap' || !estado.detalleId) return;
    const actual = await db.obtenerSerie(estado.detalleId);
    if (!actual) return;
    let val = Math.max(0, parseInt(e.target.value, 10) || 0);
    if (actual.totalEpisodios != null) val = Math.min(val, actual.totalEpisodios);
    let nuevoEstado = actual.estado === 'pendiente' ? 'ver-mas-tarde' : actual.estado;
    if (actual.totalEpisodios != null && val >= actual.totalEpisodios && !actual.enEmision) {
      nuevoEstado = 'completada';
    } else if (nuevoEstado === 'completada') {
      nuevoEstado = 'viendo';
    } else if (nuevoEstado === 'ver-mas-tarde' && val > 0) {
      nuevoEstado = 'viendo';
    }

    const s = await db.actualizarSerie(estado.detalleId, { capituloActual: val, estado: nuevoEstado });
    if (s) ui.pintarDetalle(s);
    refrescar();
  });

  // Ajustes
  $('#guardar-key').addEventListener('click', async () => {
    await db.guardarAjuste('tmdbKey', $('#tmdb-key').value.trim());
    $('#guardar-key').textContent = 'Clave guardada';
    setTimeout(() => { $('#guardar-key').textContent = 'Guardar clave'; }, 1500);
  });

  $('#exportar').addEventListener('click', async () => {
    const blob = new Blob([await db.exportarJSON()], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `mis-series-${new Date().toISOString().slice(0, 10)}.json`
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });

  $('#importar').addEventListener('click', () => $('#archivo-importar').click());

  $('#archivo-importar').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      alert(`Se importaron ${await db.importarJSON(await f.text())} series.`);
      refrescar();
    } catch (err) {
      alert('No se pudo importar: ' + err.message);
    }
    e.target.value = '';
  });

  $('#ejemplos').addEventListener('click', async () => {
    for (const s of EJEMPLOS) await db.guardarSerie(s);
    refrescar();
  });

  window.addEventListener('online', actualizarBannerOffline);
  window.addEventListener('offline', actualizarBannerOffline);
}

async function iniciar() {
  if ('serviceWorker' in navigator) {
    const teniaSW = Boolean(navigator.serviceWorker.controller);
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (teniaSW && !recargando) {
        recargando = true;
        window.location.reload();
      }
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(console.error);
  }
  await db.abrirDB();
  $('#tmdb-key').value = (await db.leerAjuste('tmdbKey')) ?? '';
  conectarEventos();
  refrescar();
}
iniciar();