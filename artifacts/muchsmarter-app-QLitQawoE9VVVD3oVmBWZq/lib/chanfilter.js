// Channel filters: works out country, language, genre, quality… for each channel from
// what providers actually send (channel name, category name, guide id, M3U tags), plus
// what the player learned while watching (captions, extra audio tracks).

const COUNTRIES = [
  // [code, label, codes used in names, words, default language]
  ['US', 'United States', ['US', 'USA'], ['united states', 'america', 'american'], 'English'],
  ['UK', 'United Kingdom', ['UK', 'GB'], ['united kingdom', 'britain', 'british', 'england', 'scotland', 'wales'], 'English'],
  ['CA', 'Canada', ['CA', 'CAN'], ['canada', 'canadian'], 'English'],
  ['MX', 'Mexico', ['MX', 'MEX'], ['mexico', 'méxico', 'mexican'], 'Spanish'],
  ['LAT', 'Latin America', ['LAT', 'LATAM', 'LATINO'], ['latin america', 'latino', 'latam'], 'Spanish'],
  ['ES', 'Spain', ['ES', 'ESP'], ['spain', 'españa', 'espana'], 'Spanish'],
  ['FR', 'France', ['FR', 'FRA'], ['france', 'french'], 'French'],
  ['DE', 'Germany', ['DE', 'GER', 'DEU'], ['germany', 'deutschland', 'german'], 'German'],
  ['IT', 'Italy', ['IT', 'ITA'], ['italy', 'italia', 'italian'], 'Italian'],
  ['PT', 'Portugal', ['PT', 'POR'], ['portugal'], 'Portuguese'],
  ['BR', 'Brazil', ['BR', 'BRA'], ['brazil', 'brasil'], 'Portuguese'],
  ['AR', 'Arab world', ['AR', 'ARB', 'ARAB'], ['arabic', 'arab', 'mena'], 'Arabic'],
  ['NL', 'Netherlands', ['NL', 'NED'], ['netherlands', 'nederland', 'dutch', 'holland'], 'Dutch'],
  ['BE', 'Belgium', ['BE'], ['belgium', 'belgique'], 'Dutch'],
  ['IE', 'Ireland', ['IE', 'IRL'], ['ireland', 'irish'], 'English'],
  ['AU', 'Australia', ['AU', 'AUS'], ['australia', 'australian'], 'English'],
  ['NZ', 'New Zealand', ['NZ'], ['new zealand'], 'English'],
  ['IN', 'India', ['IN', 'IND'], ['india', 'indian', 'hindi'], 'Hindi'],
  ['PK', 'Pakistan', ['PK'], ['pakistan'], 'Urdu'],
  ['BD', 'Bangladesh', ['BD'], ['bangladesh', 'bangla'], 'Bengali'],
  ['PH', 'Philippines', ['PH'], ['philippines', 'pinoy', 'filipino'], 'Filipino'],
  ['TR', 'Turkey', ['TR', 'TUR'], ['turkey', 'türkiye', 'turkish'], 'Turkish'],
  ['GR', 'Greece', ['GR'], ['greece', 'greek'], 'Greek'],
  ['PL', 'Poland', ['PL'], ['poland', 'polska', 'polish'], 'Polish'],
  ['RO', 'Romania', ['RO'], ['romania'], 'Romanian'],
  ['AL', 'Albania', ['AL'], ['albania', 'shqip'], 'Albanian'],
  ['EXYU', 'Ex-Yugoslavia', ['EXYU', 'EX-YU', 'YU'], ['ex-yu', 'balkan', 'serbia', 'croatia', 'bosnia'], 'Serbo-Croatian'],
  ['RU', 'Russia', ['RU', 'RUS'], ['russia', 'russian'], 'Russian'],
  ['UA', 'Ukraine', ['UA'], ['ukraine'], 'Ukrainian'],
  ['SE', 'Sweden', ['SE', 'SWE'], ['sweden', 'swedish', 'sverige'], 'Swedish'],
  ['NO', 'Norway', ['NO', 'NOR'], ['norway', 'norsk'], 'Norwegian'],
  ['DK', 'Denmark', ['DK'], ['denmark', 'danish', 'dansk'], 'Danish'],
  ['FI', 'Finland', ['FI', 'FIN'], ['finland', 'suomi'], 'Finnish'],
  ['IL', 'Israel', ['IL'], ['israel', 'hebrew'], 'Hebrew'],
  ['IR', 'Iran', ['IR'], ['iran', 'persian', 'farsi'], 'Persian'],
  ['AF', 'Afghanistan', ['AF'], ['afghan'], 'Pashto'],
  ['ZA', 'South Africa', ['ZA'], ['south africa'], 'English'],
  ['NG', 'Nigeria', ['NG'], ['nigeria'], 'English'],
  ['AFR', 'Africa', ['AFR'], ['africa'], 'English'],
  ['CARIB', 'Caribbean', ['CARIB'], ['caribbean', 'jamaica', 'trinidad'], 'English'],
  ['KR', 'South Korea', ['KR', 'KOR'], ['korea', 'korean'], 'Korean'],
  ['JP', 'Japan', ['JP', 'JPN'], ['japan', 'japanese'], 'Japanese'],
  ['CN', 'China', ['CN', 'CHN'], ['china', 'chinese', 'mandarin', 'cantonese'], 'Chinese'],
  ['VN', 'Vietnam', ['VN'], ['vietnam', 'vietnamese'], 'Vietnamese'],
];
const BY_CODE = new Map();
for (const c of COUNTRIES) for (const code of c[2]) BY_CODE.set(code, c);

const LANGS = [
  ['English', ['english', 'eng']], ['Spanish', ['spanish', 'español', 'espanol', 'castellano', 'latino']],
  ['French', ['french', 'français', 'francais']], ['German', ['german', 'deutsch']], ['Italian', ['italian', 'italiano']],
  ['Portuguese', ['portuguese', 'português', 'portugues']], ['Arabic', ['arabic', 'عربي']], ['Hindi', ['hindi']],
  ['Urdu', ['urdu']], ['Punjabi', ['punjabi']], ['Tamil', ['tamil']], ['Telugu', ['telugu']], ['Bengali', ['bengali', 'bangla']],
  ['Turkish', ['turkish', 'türkçe']], ['Russian', ['russian']], ['Polish', ['polish', 'polski']], ['Dutch', ['dutch']],
  ['Greek', ['greek']], ['Korean', ['korean']], ['Japanese', ['japanese']], ['Chinese', ['chinese', 'mandarin', 'cantonese']],
  ['Filipino', ['filipino', 'tagalog']], ['Persian', ['persian', 'farsi']], ['Hebrew', ['hebrew']], ['Vietnamese', ['vietnamese']],
];

// US states (name + 2-letter code) and big cities, for local channels.
const STATES = { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington DC' };
const CITIES = [
  ['New York', 'NY'], ['Los Angeles', 'CA'], ['Chicago', 'IL'], ['Houston', 'TX'], ['Phoenix', 'AZ'], ['Philadelphia', 'PA'], ['San Antonio', 'TX'],
  ['San Diego', 'CA'], ['Dallas', 'TX'], ['San Jose', 'CA'], ['Austin', 'TX'], ['San Francisco', 'CA'], ['Boston', 'MA'], ['Seattle', 'WA'],
  ['Denver', 'CO'], ['Atlanta', 'GA'], ['Miami', 'FL'], ['Detroit', 'MI'], ['Minneapolis', 'MN'], ['Tampa', 'FL'], ['Orlando', 'FL'],
  ['Portland', 'OR'], ['Las Vegas', 'NV'], ['Baltimore', 'MD'], ['Cleveland', 'OH'], ['Pittsburgh', 'PA'], ['St. Louis', 'MO'], ['St Louis', 'MO'],
  ['Sacramento', 'CA'], ['Charlotte', 'NC'], ['Nashville', 'TN'], ['Indianapolis', 'IN'], ['Columbus', 'OH'], ['Kansas City', 'MO'],
  ['Milwaukee', 'WI'], ['Salt Lake City', 'UT'], ['Raleigh', 'NC'], ['New Orleans', 'LA'], ['Cincinnati', 'OH'], ['Oklahoma City', 'OK'],
  ['Memphis', 'TN'], ['Louisville', 'KY'], ['Jacksonville', 'FL'], ['Buffalo', 'NY'], ['Albuquerque', 'NM'], ['Tucson', 'AZ'], ['Fresno', 'CA'],
  ['Honolulu', 'HI'], ['Anchorage', 'AK'], ['Richmond', 'VA'], ['Hartford', 'CT'], ['Providence', 'RI'], ['Birmingham', 'AL'], ['Omaha', 'NE'],
  ['Des Moines', 'IA'], ['Boise', 'ID'], ['Spokane', 'WA'], ['El Paso', 'TX'], ['Fort Worth', 'TX'], ['Toronto', 'ON'], ['Vancouver', 'BC'],
  ['Montreal', 'QC'], ['Calgary', 'AB'], ['London', 'UK'],
].map(([city, st]) => [city, st, new RegExp(`\\b${city.replace('.', '\\.')}\\b`, 'i')]);
const STATE_RX = Object.entries(STATES).map(([code, name]) => [code, name, new RegExp(`\\b${name}\\b`, 'i')]);

// Genre → keywords; subgenres hang off a genre.
const GENRES = [
  ['News', /\bnews\b|cnn|msnbc|fox news|newsmax|\bcnbc\b|bloomberg|sky news|bbc news|bbc world|euronews|al ?jazeera|france ?24|\bdw\b|cbsn|\bnbc news|abc news|cspan|c-span|\bhln\b|i24|\brt\b|\bnhk world|cgtn|\bnewsnation|weather/i],
  ['Sports', /sport|espn|\bfs1\b|\bfs2\b|\bnfl\b|\bnba\b|\bmlb\b|\bnhl\b|bein|dazn|golf|tennis|\bufc\b|\bwwe\b|\bf1\b|formula ?1|nascar|racing|motorsport|soccer|football|premier league|la ?liga|bundesliga|serie a|ligue 1|\bmls\b|cricket|rugby|boxing|\bppv\b|tnt sports|arena sport|eurosport|sportsnet|\btsn\b|\bacc\b network|big ten|sec network|pac-?12|olympic|fight/i],
  ['Movies', /movie|cinema|\bfilm|\bhbo\b|showtime|starz|cinemax|\btcm\b|\bmgm\b|epix|sky cinema|\bmax\b|flix|\bamc\b|fx ?movie|hallmark movie|\bifc\b|sundance|lifetime movie|\bcine\b|kino|\bpelicula/i],
  ['Comedy', /comedy|\blaff\b|sitcom|\bfunny|comedia|\btbs\b|\bcomedy central/i],
  ['Drama', /drama|novela|telenovela|\btnt\b|lifetime|\bcrime|\bion\b|\bid\b|investigation discovery|oxygen|soap/i],
  ['Documentaries', /documentar|discovery|nat ?geo|national geographic|history|smithsonian|animal planet|science|curiosity|\bpbs\b|love nature|\bnature|military|\bviceland|\bdocu/i],
  ['Kids', /\bkids?\b|cartoon|disney|nick|nickelodeon|boomerang|\bbaby|junior|cbeebies|\btoon|\bpbs kids|universal kids|\bteen|family|\bniños|infantil|\bjeunesse/i],
  ['Music', /music|\bmtv\b|\bvh1\b|\bcmt\b|\bbet\b|\bhits\b|\bradio\b|concert|vevo|stingray|\bfm\b|\bjukebox|\bmusica/i],
  ['Lifestyle', /lifestyle|food|cook|kitchen|chef|travel|\bhgtv\b|\btlc\b|\bhome\b|garden|\bdiy\b|fashion|\be!\b|bravo|oprah|\bown\b|magnolia|\bstyle|\bhealth|\bfitness|\bauto|motor ?trend|outdoor|hunting|fishing/i],
  ['Entertainment', /entertainment|\busa network|\bfx\b|\bfxx\b|\ba&e\b|\bsyfy\b|\btru ?tv\b|paramount|\bwe tv\b|\bcw\b|\babc\b|\bnbc\b|\bcbs\b|\bfox\b|\bitv\b|\bbbc ?(one|two|three|four)?\b|channel 4|\bsky one|\bvariety/i],
  ['Religion', /religio|church|\bgod\b|\btbn\b|ewtn|faith|gospel|daystar|\bjesus|\bcatholic|\bislam|quran|\bchristian/i],
  ['Shopping', /\bqvc\b|\bhsn\b|shop|jewelry ?tv/i],
  ['Adult', /\badult|\bxxx|18\+/i],
];
const SUBGENRES = [
  ['Business news', /cnbc|bloomberg|business|fox business|\bfinance|\bmarket/i],
  ['Weather', /weather/i],
  ['Football (American)', /\bnfl\b|redzone|college football|\bncaa ?f/i],
  ['Soccer', /soccer|premier league|la ?liga|bundesliga|serie a|ligue 1|\bmls\b|champions league|\bfutbol|\bfútbol|\bliga\b|\buefa|\bfifa|\bfootball\b(?!.*nfl)/i],
  ['Basketball', /\bnba\b|basketball|\bncaa ?b/i], ['Baseball', /\bmlb\b|baseball/i], ['Hockey', /\bnhl\b|hockey/i],
  ['Golf', /golf/i], ['Tennis', /tennis/i], ['Motorsport', /\bf1\b|formula|nascar|racing|motogp|indycar/i],
  ['Fighting', /\bufc\b|boxing|\bwwe\b|\bmma\b|wrestling|fight/i], ['Cricket', /cricket/i], ['Rugby', /rugby/i],
  ['Classic movies', /\btcm\b|classic|retro|\bmgm\b|movies!|\bthis tv|\bgrit\b|western/i],
  ['Action movies', /action/i], ['Horror', /horror|\bscream|\bchiller/i], ['Romance', /romance|hallmark|\blove/i],
  ['Cooking', /food|cook|kitchen|chef|\btastemade/i], ['Travel', /travel|\btravelxp|\bdestination/i],
  ['Home & garden', /\bhgtv\b|\bdiy\b|\bhome\b|garden|magnolia/i], ['Fashion & beauty', /fashion|beauty|\bstyle/i],
  ['Nature & animals', /nature|animal|\bwild|\bnat ?geo wild/i], ['History', /history|military|\bahc\b/i], ['Science & tech', /science|\btech\b|\bspace/i],
  ['True crime', /\bcrime|investigation|\bid\b|oxygen|court/i], ['Reality', /reality|\bbravo|\btlc\b|\bwe tv/i],
  ['Cartoons & animation', /cartoon|\btoon|anime|boomerang|nick|animation/i],
];

const PROVIDERS = [
  ['DIRECTV', /direc ?tv|\bdtv\b/i], ['DISH', /\bdish\b/i], ['Sling TV', /\bsling\b/i], ['fuboTV', /\bfubo/i], ['YouTube TV', /youtube ?tv|\byttv/i],
  ['Hulu + Live TV', /\bhulu/i], ['Xfinity / Comcast', /xfinity|comcast/i], ['Spectrum', /spectrum|charter/i], ['Cox', /\bcox\b/i],
  ['Optimum', /optimum|\balti/i], ['Verizon Fios', /\bfios|verizon/i], ['AT&T U-verse', /u-?verse|at&t/i], ['Philo', /\bphilo/i],
  ['Pluto TV', /pluto/i], ['Samsung TV Plus', /samsung ?tv|samsung\+/i], ['Plex', /\bplex\b/i], ['Xumo', /xumo/i], ['Tubi', /\btubi/i],
  ['The Roku Channel', /\broku/i], ['Stirr', /stirr/i], ['LG Channels', /\blg channels?/i], ['Peacock', /peacock/i], ['Paramount+', /paramount ?\+|paramount plus/i],
  ['Sky', /\bsky\b/i], ['Virgin Media', /virgin/i], ['BT', /\bbt sport|\bbt tv/i], ['Freeview', /freeview/i], ['Bell / Fibe', /\bbell\b|\bfibe/i], ['Rogers', /rogers/i],
  ['Antenna (over-the-air)', /\bota\b|antenna|over[- ]the[- ]air|\blocals?\b/i], ['Cable', /\bcable\b/i],
];
const FAST = /pluto|samsung ?tv|\bplex\b|xumo|\btubi|\broku|stirr|\blg channels?|\bfast\b|\bfree\b/i;
const INTERNATIONAL = /international|\bworld\b|global|\bbbc world|cnn int|al ?jazeera|euronews|france ?24|\bdw\b|\bcgtn|nhk world|\bi24|\brt\b/i;

const FACETS = [
  ['country', 'Country / region'], ['region', 'State / city (local)'], ['language', 'Language'], ['genre', 'Genre'], ['subgenre', 'Subgenre'],
  ['coverage', 'Coverage'], ['provider', 'Provider / service'], ['quality', 'Video quality'], ['audience', 'Audience / rating'],
  ['ctype', 'Channel type'], ['features', 'Features'], ['personal', 'Personal choices'],
];
export { FACETS };

// What playback taught us about channels (captions found, more than one audio track).
const TRAITS_KEY = 'ms-chan-traits';
export function learnTrait(pl, id, trait) {
  try {
    const t = JSON.parse(localStorage.getItem(TRAITS_KEY) || '{}');
    const k = `${pl}|${id}`;
    const set = new Set(t[k] || []);
    if (set.has(trait)) return;
    set.add(trait);
    t[k] = [...set];
    localStorage.setItem(TRAITS_KEY, JSON.stringify(t));
  } catch (_) { /* storage full */ }
}
function traits() { try { return JSON.parse(localStorage.getItem(TRAITS_KEY) || '{}'); } catch (_) { return {}; } }

// Country from "US:", "US |", "[US]", "|US|", "US-", ".us" guide ids, M3U tvg-country, or words.
function findCountry(name, cat, epgId, tvg) {
  const out = new Set();
  const add = (code) => { const c = BY_CODE.get(String(code).toUpperCase()); if (c) out.add(c[1]); };
  if (tvg) String(tvg).split(/[;,|]/).forEach((x) => add(x.trim()));
  for (const s of [name, cat]) {
    const m = s.match(/^\s*[[(|]?\s*([A-Za-z]{2,7})\s*(?:[\]):|]|-\s|\s\|)/) || s.match(/[[(|]\s*([A-Za-z]{2,7})\s*[\])|]/);
    if (m) add(m[1]);
  }
  const em = String(epgId || '').match(/\.([a-z]{2})$/i);
  if (em && !out.size) add(em[1]);
  if (!out.size) {
    const text = `${name} ${cat}`.toLowerCase();
    for (const c of COUNTRIES) if (c[3].some((w) => text.includes(w))) { out.add(c[1]); break; }
  }
  return [...out];
}

const cache = new Map();
export function clearClassifyCache() { cache.clear(); }

// Facet values for one channel. ctx: { catName, favs:Set, recents:Set, hidden:Set, pl }
export function classify(ch, ctx) {
  const ck = `${ctx.pl}|${ch.id}`;
  let base = cache.get(ck);
  if (!base) {
    const name = ch.name || '';
    const cat = ctx.catName || '';
    const text = `${name} | ${cat}`;
    const country = findCountry(name, cat, ch.epgId, ch.country);
    const countryRec = COUNTRIES.find((c) => country.includes(c[1]));
    // Local: US call signs (WABC, KTLA-DT), city or state names, or "local" in the category.
    const region = new Set();
    for (const [city, st, rx] of CITIES) if (rx.test(text)) { region.add(`${city}${STATES[st] ? `, ${st}` : ''}`); if (STATES[st]) region.add(STATES[st]); }
    for (const [, st, rx] of STATE_RX) if (rx.test(text)) region.add(st);
    const callSign = /\b[KW][A-Z]{2,3}(-?(TV|DT|LD|CD))?\b/.test(name);
    const local = region.size > 0 || callSign || /\blocals?\b/i.test(text);
    // Language.
    const lang = new Set();
    if (ch.language) String(ch.language).split(/[;,|]/).forEach((l) => l.trim() && lang.add(l.trim()[0].toUpperCase() + l.trim().slice(1)));
    for (const [l, words] of LANGS) if (words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(text))) lang.add(l);
    if (/\bmulti|dual audio|\bvo\b|\bvost/i.test(text)) lang.add('Multilingual');
    if (!lang.size && countryRec) lang.add(countryRec[4]);
    // Genre / subgenre.
    const genre = GENRES.filter(([, rx]) => rx.test(text)).map(([g]) => g);
    const sub = SUBGENRES.filter(([, rx]) => rx.test(text)).map(([g]) => g);
    if (sub.includes('Weather') && !genre.includes('News')) genre.push('News');
    // Quality.
    const quality = /\b(4k|uhd|2160p?)\b/i.test(text) ? '4K / UHD' : /\b(fhd|1080[pi]?)\b/i.test(text) ? 'Full HD' : /\b(hd|720p?|hevc|h\.?265)\b/i.test(text) ? 'HD' : /\b(sd|480p?|576p?|lq)\b/i.test(text) ? 'SD' : 'Not stated';
    // Audience.
    const audience = ch.adult || genre.includes('Adult') ? ['Adult (18+)']
      : /\bbaby|preschool|junior|cbeebies|nick ?jr|pbs kids|\bbabyfirst|\bduck ?tv/i.test(text) ? ['Preschool']
        : genre.includes('Kids') ? (/\bteen|\btween/i.test(text) ? ['Teen'] : ['Kids', 'Family'])
          : /\bteen|\bmtv\b/i.test(text) ? ['Teen'] : /family|hallmark|\bup ?tv|\bgac\b/i.test(text) ? ['Family'] : ['General'];
    // Channel type.
    const ctype = [];
    if (/24\/7|24-7|\b247\b/i.test(text)) ctype.push('Single-show / 24-7 channel');
    if (FAST.test(text)) ctype.push('Streaming-only (FAST)');
    if (/\bppv\b|pay[- ]per[- ]view|\bevent\b|\bgame ?pass|\bmatch ?day/i.test(text)) ctype.push('Event / pay-per-view');
    if (/\bradio\b|\bfm\b/i.test(text)) ctype.push('Radio');
    if (/\b(east|west|pacific|mountain|central)\b|\+1\b/i.test(name)) ctype.push('Regional / time-zone feed');
    if (/backup|\balt\b|\bbk\b|\b(2|ii)$/i.test(name)) ctype.push('Backup / alternate feed');
    if (!ctype.length || (ctype.length === 1 && ctype[0].startsWith('Regional'))) ctype.push('Traditional network');
    base = {
      country: country.length ? country : ['Not stated'],
      region: [...region],
      language: lang.size ? [...lang] : ['Not stated'],
      genre: genre.length ? genre : ['Other / general'],
      subgenre: sub,
      coverage: [local ? 'Local' : INTERNATIONAL.test(text) ? 'International' : country.length ? 'National' : 'Not stated'],
      provider: PROVIDERS.filter(([, rx]) => rx.test(text)).map(([p]) => p).concat(callSign ? ['Antenna (over-the-air)'] : []).filter((v, i, a) => a.indexOf(v) === i),
      quality: [quality],
      audience,
      ctype,
    };
    cache.set(ck, base);
  }
  const t = traits()[ck] || [];
  const features = ['Recordable (DVR)'];
  if (ch.catchup) features.push('Catch-up / rewind TV');
  if (ch.epgId) features.push('Has TV guide');
  if (t.includes('cc') || /\bcc\b|\[cc\]/i.test(ch.name)) features.push('Closed captions');
  if (t.includes('audio') || /\bmulti|dual audio/i.test(ch.name)) features.push('Alternate audio');
  const personal = [];
  if (ctx.favs && ctx.favs.has(ch.id)) personal.push('Favorites');
  if (ctx.recents && ctx.recents.has(ch.id)) personal.push('Recently watched');
  if (ctx.hidden && ctx.hidden.has(ck)) personal.push('Hidden channels');
  return { ...base, features, personal };
}

// filters: { facet: [values] } — values in one facet = any of them; facets together = all.
export function matches(vals, filters) {
  for (const [f, wanted] of Object.entries(filters)) {
    if (!wanted || !wanted.length) continue;
    const have = vals[f] || [];
    if (!wanted.some((w) => have.includes(w))) return false;
  }
  return true;
}

// Value → count for every facet over a list (for the filter panel).
export function facetCounts(list, facets = FACETS) {
  const out = {};
  for (const [f] of facets) out[f] = new Map();
  for (const v of list) for (const [f] of facets) for (const x of v[f] || []) out[f].set(x, (out[f].get(x) || 0) + 1);
  return out;
}

// ---- Movies & Series ----------------------------------------------------------------
export const VOD_FACETS = [
  ['genre', 'Genre'], ['decade', 'Release year'], ['rating', 'Rating'], ['added', 'Added'], ['watch', 'Watched'],
  ['country', 'Country / region'], ['language', 'Language'], ['service', 'Streaming service'], ['quality', 'Video quality'],
  ['audience', 'Audience / rating'], ['personal', 'Personal choices'],
];

const VOD_GENRES = [
  ['Action', /action|martial arts|superhero|marvel|\bdc\b/i], ['Adventure', /adventure/i], ['Animation', /animat|cartoon|pixar|dreamworks|anime/i],
  ['Anime', /anime/i], ['Comedy', /comed|comedia|sitcom|stand[- ]?up|humou?r/i], ['Crime', /crime|gangster|mafia|heist|policia|cops?\b/i],
  ['Documentary', /documentar|docu|true story|nature|history channel/i], ['Drama', /drama/i], ['Family', /family|familia/i],
  ['Fantasy', /fantasy|fantas[ií]a|magic/i], ['Horror', /horror|terror|scary|zombie|slasher/i], ['Mystery', /mystery|misterio|detective/i],
  ['Romance', /romanc|romant|love/i], ['Sci-Fi', /sci[- ]?fi|science fiction|ciencia ficci|space|alien/i], ['Thriller', /thriller|suspense|suspenso/i],
  ['War', /\bwar\b|guerra|military|ww2|wwii/i], ['Western', /western/i], ['Music & musicals', /music|musical|concert/i],
  ['Biography & history', /biograph|biopic|historical|history/i], ['Sports', /sport|football|soccer|boxing|wrestling|nba|nfl/i],
  ['Kids', /\bkids?\b|children|niños|infantil|disney junior|nick ?jr/i], ['Holiday & Christmas', /christmas|navidad|holiday|halloween/i],
  ['Reality & talk', /reality|talk show|game show|\btalk\b/i], ['Bollywood & Indian', /bollywood|hindi|tamil|telugu|punjabi|indian/i],
  ['Telenovela', /telenovela|novela/i], ['Faith', /faith|christian|religio|bible/i], ['Adult', /\badult|\bxxx|18\+/i],
];
const SERVICES = [
  ['Netflix', /netflix|\bnf\b/i], ['Disney+', /disney ?\+|disney plus/i], ['Prime Video', /amazon|prime video|\bamzn\b/i], ['HBO / Max', /\bhbo\b|\bmax\b/i],
  ['Apple TV+', /apple ?tv/i], ['Hulu', /\bhulu/i], ['Paramount+', /paramount/i], ['Peacock', /peacock/i], ['Showtime', /showtime/i],
  ['Starz', /starz/i], ['AMC+', /\bamc\b/i], ['Discovery+', /discovery/i], ['BritBox', /britbox/i], ['Crunchyroll', /crunchyroll/i],
  ['Hallmark', /hallmark/i], ['Lionsgate', /lionsgate/i], ['Tubi / Pluto (free)', /\btubi|pluto/i], ['Cinema / new releases', /cinema|\bcam\b|in theaters|estrenos|new release/i],
];

const vodCache = new Map();
export function classifyVod(it, ctx) {
  const ck = `${ctx.pl}|${it.id}`;
  let base = vodCache.get(ck);
  if (!base) {
    const name = it.name || '';
    const cat = ctx.catName || '';
    const text = `${name} | ${cat} | ${it.genre || ''}`;
    const country = findCountry(name, cat, '', it.country);
    const countryRec = COUNTRIES.find((c) => country.includes(c[1]));
    const lang = new Set();
    for (const [l, words] of LANGS) if (words.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(text))) lang.add(l);
    if (/\bmulti|dual audio|\bvost|subbed|subtitulad/i.test(text)) lang.add('Multilingual / subtitled');
    if (!lang.size && countryRec) lang.add(countryRec[4]);
    const genre = VOD_GENRES.filter(([, rx]) => rx.test(text)).map(([g]) => g);
    const y = Number(it.year || (name.match(/\((\d{4})\)/) || [])[1]) || 0;
    const decade = y > 1900 ? (y >= 2020 ? ['2020s'] : y >= 2010 ? ['2010s'] : y >= 2000 ? ['2000s'] : y >= 1990 ? ['1990s'] : y >= 1980 ? ['1980s'] : ['Before 1980']) : ['Year not stated'];
    const r = Number(it.rating) || 0;
    const rating = r ? [r >= 8 ? '★ 8 and up' : r >= 7 ? '★ 7 – 8' : r >= 6 ? '★ 6 – 7' : r >= 5 ? '★ 5 – 6' : '★ under 5'] : ['Not rated'];
    const quality = /\b(4k|uhd|2160p?)\b/i.test(text) ? '4K / UHD' : /\b(fhd|1080p?)\b/i.test(text) ? 'Full HD' : /\b(hd|720p?|hevc|h\.?265)\b/i.test(text) ? 'HD' : /\b(sd|480p?|cam|ts)\b/i.test(text) ? 'SD / cam' : 'Not stated';
    const audience = genre.includes('Adult') ? ['Adult (18+)'] : genre.includes('Kids') || genre.includes('Animation') || genre.includes('Family') ? ['Kids & family'] : /\bteen/i.test(text) ? ['Teen'] : ['General'];
    base = {
      genre: genre.length ? genre : ['Other / not stated'],
      decade,
      rating,
      country: country.length ? country : ['Not stated'],
      language: lang.size ? [...lang] : ['Not stated'],
      service: SERVICES.filter(([, rx]) => rx.test(cat) || rx.test(name)).map(([s]) => s),
      quality: [quality],
      audience,
    };
    vodCache.set(ck, base);
  }
  const age = it.added ? (Date.now() - it.added) / 86400000 : null;
  const added = age == null ? ['Date not stated'] : age <= 7 ? ['Last 7 days', 'Last 30 days', 'Last 90 days'] : age <= 30 ? ['Last 30 days', 'Last 90 days'] : age <= 90 ? ['Last 90 days'] : ['Older'];
  const w = ctx.watch && ctx.watch[it.id];
  const watch = it.type === 'series'
    ? [w ? 'Started watching' : 'Not started']
    : [w && w.watched ? 'Watched' : w && w.position > 0 ? 'In progress' : 'Not watched'];
  const personal = [];
  if (ctx.favs && ctx.favs.has(it.id)) personal.push('Favorites');
  if (ctx.recents && ctx.recents.has(it.id)) personal.push('Recently watched');
  return { ...base, added, watch, personal };
}
