// Persistencia local con IndexedDB + copia de seguridad .json
const NOMBRE = 'mis-series-db';
const VERSION = 1;
let _db;

export function abrirDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const r = indexedDB.open(NOMBRE, VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      const s = db.createObjectStore('series', { keyPath: 'id' });
      s.createIndex('plataforma', 'plataforma');
      s.createIndex('estado', 'estado');
      s.createIndex('titulo', 'titulo');
      db.createObjectStore('ajustes', { keyPath: 'clave' });
    };
    r.onsuccess = () => { _db = r.result; res(_db); };
    r.onerror = () => rej(r.error);
  });
}

const pedir = (store, modo, fn) => abrirDB().then(db => new Promise((res, rej) => {
  const t = db.transaction(store, modo);
  const r = fn(t.objectStore(store));
  t.oncomplete = () => res(r && r.result);
  t.onerror = t.onabort = () => rej(t.error);
}));

/* Serie: { id, titulo, plataforma:'Netflix'|'Crunchyroll', fuente:'anilist'|'tmdb',
   caratula, capituloActual, totalEpisodios|null, estado:'viendo'|'pendiente'|'completada',
   enEmision:boolean, creadoEn, actualizadoEn } */
function normalizar(s) {
  const ahora = new Date().toISOString();
  return {
    caratula: null, totalEpisodios: null, capituloActual: 0,
    estado: 'viendo', enEmision: false, creadoEn: ahora, ...s, actualizadoEn: ahora
  };
}

export const guardarSerie = s => pedir('series', 'readwrite', st => st.put(normalizar(s)));
export const obtenerSeries = () => pedir('series', 'readonly', st => st.getAll());
export const obtenerSerie = id => pedir('series', 'readonly', st => st.get(id));
export const eliminarSerie = id => pedir('series', 'readwrite', st => st.delete(id));

export async function actualizarSerie(id, cambios) {
  const s = await obtenerSerie(id);
  if (!s) return null;
  const nueva = { ...s, ...cambios };
  await guardarSerie(nueva);
  return nueva;
}

// +1 / -1 con límites; marca "completada" al llegar al final si ya no se emite.
export async function sumarCapitulo(id, delta = 1) {
  const s = await obtenerSerie(id);
  if (!s) return null;
  let cap = Math.max(0, s.capituloActual + delta);
  if (s.totalEpisodios != null) cap = Math.min(cap, s.totalEpisodios);
  let estado = s.estado;
  if (s.totalEpisodios != null && cap >= s.totalEpisodios && !s.enEmision) estado = 'completada';
  else if (estado === 'completada') estado = 'viendo';
  return actualizarSerie(id, { capituloActual: cap, estado });
}

// Ajustes (p. ej. API Key de TMDB)
export const guardarAjuste = (clave, valor) => pedir('ajustes', 'readwrite', st => st.put({ clave, valor }));
export const leerAjuste = clave => pedir('ajustes', 'readonly', st => st.get(clave)).then(r => r?.valor ?? null);

// Copia de seguridad (la API Key NO se exporta)
export async function exportarJSON() {
  const series = await obtenerSeries();
  return JSON.stringify({ app: 'mis-series', esquema: VERSION, exportadoEn: new Date().toISOString(), series }, null, 2);
}
export async function importarJSON(texto) {
  const datos = JSON.parse(texto);
  if (datos.app !== 'mis-series' || !Array.isArray(datos.series)) throw new Error('Archivo no válido');
  const db = await abrirDB();
  await new Promise((res, rej) => {
    const t = db.transaction('series', 'readwrite');
    datos.series.forEach(s => s?.id && s?.titulo && t.objectStore('series').put(s));
    t.oncomplete = res; t.onerror = t.onabort = () => rej(t.error);
  });
  return datos.series.length;
}
