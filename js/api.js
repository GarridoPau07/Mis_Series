// Catálogos externos: AniList (GraphQL, sin clave) y TMDB (REST, con API Key).
// Formato normalizado devuelto:
// { id, titulo, plataforma, fuente, caratula, totalEpisodios, enEmision, anio }

const ANILIST_URL = 'https://graphql.anilist.co';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

const QUERY_ANILIST = `
query ($search: String) {
  Page(page: 1, perPage: 15) {
    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      id
      title { romaji english native }
      coverImage { large medium }
      episodes
      status
      seasonYear
      startDate { year }
    }
  }
}`;

export async function buscar(termino, plataforma, claveTMDB) {
  const q = termino.trim();
  if (!q) return [];
  if (plataforma === 'Crunchyroll') return buscarAniList(q);
  if (plataforma === 'Netflix') return buscarTMDB(q, claveTMDB);
  throw new Error('Plataforma desconocida');
}

export async function buscarAniList(termino) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY_ANILIST, variables: { search: termino } })
  });
  if (!res.ok) throw new Error('HTTP_' + res.status);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);

  const lista = json.data?.Page?.media ?? [];
  return lista.map(m => ({
    id: 'anilist:' + m.id,
    titulo: m.title?.english || m.title?.romaji || m.title?.native || 'Sin título',
    plataforma: 'Crunchyroll',
    fuente: 'anilist',
    caratula: m.coverImage?.large || m.coverImage?.medium || null,
    totalEpisodios: typeof m.episodes === 'number' ? m.episodes : null,
    enEmision: m.status === 'RELEASING',
    anio: m.seasonYear || m.startDate?.year || null
  }));
}

async function fetchTMDB(ruta, clave) {
  const token = (clave || '').trim();
  if (!token) throw new Error('TMDB_SIN_KEY');

  const esBearer = token.length > 40;
  const url = new URL(TMDB_BASE + ruta);
  url.searchParams.set('language', 'es-ES');
  if (!esBearer) url.searchParams.set('api_key', token);

  const res = await fetch(url.toString(), {
    headers: esBearer
      ? { Accept: 'application/json', Authorization: 'Bearer ' + token }
      : { Accept: 'application/json' }
  });

  if (res.status === 401 || res.status === 403) throw new Error('TMDB_KEY_INVALIDA');
  if (!res.ok) throw new Error('HTTP_' + res.status);
  return res.json();
}

export async function buscarTMDB(termino, clave) {
  const datos = await fetchTMDB('/search/tv?page=1&query=' + encodeURIComponent(termino), clave);
  const primeros = (datos.results ?? []).slice(0, 8);

  const detalles = await Promise.allSettled(
    primeros.map(item => fetchTMDB('/tv/' + item.id, clave))
  );

  return primeros.map((item, i) => {
    const det = detalles[i].status === 'fulfilled' ? detalles[i].value : null;
    const total = det?.number_of_episodes;
    return {
      id: 'tmdb:' + item.id,
      titulo: item.name || item.original_name || 'Sin título',
      plataforma: 'Netflix',
      fuente: 'tmdb',
      caratula: item.poster_path ? TMDB_IMG + item.poster_path : null,
      totalEpisodios: typeof total === 'number' && total > 0 ? total : null,
      enEmision: Boolean(det?.in_production || det?.status === 'Returning Series'),
      anio: item.first_air_date ? Number(item.first_air_date.slice(0, 4)) : null
    };
  });
}