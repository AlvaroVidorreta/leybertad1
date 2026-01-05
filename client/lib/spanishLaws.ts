export interface SpanishLawDoc {
  id: string;
  title: string; // official name
  summary: string; // brief justification / snippet
  url: string; // Official BOE link if possible
  keywords: string[]; // extracted keywords for simple matching
}

// Curated subset of real Spanish laws with BOE references
// Note: URLs point to the BOE (boe.es) for the consolidated text or original publication
export const SPANISH_LAWS: SpanishLawDoc[] = [
  {
    id: "ley-37-1992-iva",
    title:
      "Ley 37/1992, de 28 de diciembre, del Impuesto sobre el Valor Añadido",
    summary:
      "Regula el IVA en España. El artículo 91 contempla los tipos reducidos aplicables a determinados bienes y servicios, entre ellos culturales.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740",
    keywords: [
      "iva",
      "impuesto",
      "valor añadido",
      "tipo reducido",
      "articulo 91",
      "cultural",
      "bienes",
      "servicios",
      "impuestos indirectos",
    ],
  },
  {
    id: "ley-35-2006-irpf",
    title:
      "Ley 35/2006, de 28 de noviembre, del Impuesto sobre la Renta de las Personas Físicas",
    summary:
      "Norma básica del IRPF. Define rendimientos, deducciones y mínimos personales y familiares.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    keywords: [
      "irpf",
      "impuesto renta",
      "deducciones",
      "tipo",
      "tramo",
      "rentas",
      "personas fisicas",
      "base imponible",
    ],
  },
  {
    id: "ley-27-2014-is",
    title: "Ley 27/2014, de 27 de noviembre, del Impuesto sobre Sociedades",
    summary:
      "Regula la tributación de sociedades. Tipos impositivos, bases liquidables, incentivos y regímenes especiales.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328",
    keywords: [
      "impuesto sociedades",
      "is",
      "tipos",
      "sociedades",
      "incentivos",
      "deducciones",
      "regimen especial",
    ],
  },
  {
    id: "lopdgg-3-2018",
    title:
      "Ley Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos digitales",
    summary:
      "Desarrolla el RGPD en España y regula el tratamiento de datos personales y derechos digitales.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673",
    keywords: [
      "proteccion de datos",
      "datos personales",
      "rgpd",
      "privacidad",
      "derechos digitales",
      "consentimiento",
    ],
  },
  {
    id: "lpi-rdl-1-1996",
    title:
      "Real Decreto Legislativo 1/1996, Texto Refundido de la Ley de Propiedad Intelectual",
    summary:
      "Regula los derechos de autor y conexos. Contiene límites, excepciones y gestión de derechos.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-1996-8930",
    keywords: [
      "propiedad intelectual",
      "derechos de autor",
      "obras",
      "licencias",
      "excepciones",
      "lpi",
    ],
  },
  {
    id: "contratos-sector-publico-9-2017",
    title: "Ley 9/2017, de Contratos del Sector Público",
    summary:
      "Establece el régimen de contratación pública: procedimientos, criterios de adjudicación, transparencia y control.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902",
    keywords: [
      "contratos publicos",
      "licitacion",
      "adjudicacion",
      "transparencia",
      "pliegos",
      "sector publico",
    ],
  },
  {
    id: "ley-general-sanidad-14-1986",
    title: "Ley 14/1986, General de Sanidad",
    summary:
      "Marco general del sistema sanitario español: organización, prestaciones y salud pública.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-1986-10499",
    keywords: [
      "sanidad",
      "salud publica",
      "sistema nacional de salud",
      "prestaciones",
      "hospitales",
    ],
  },
  {
    id: "ley-7-1985-bases-regimen-local",
    title: "Ley 7/1985, Reguladora de las Bases del Régimen Local",
    summary:
      "Estructura y competencias de municipios y provincias; organización y funcionamiento de la administración local.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-1985-5392",
    keywords: [
      "regimen local",
      "ayuntamientos",
      "municipios",
      "provincias",
      "competencias",
      "administracion local",
    ],
  },
  {
    id: "ley-49-2002-mecenazgo",
    title:
      "Ley 49/2002, de régimen fiscal de las entidades sin fines lucrativos y de los incentivos fiscales al mecenazgo",
    summary:
      "Regula incentivos fiscales a donaciones y el régimen de entidades sin ánimo de lucro.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2002-24888",
    keywords: [
      "mecenazgo",
      "donaciones",
      "incentivos fiscales",
      "entidades sin fines lucrativos",
      "ongs",
    ],
  },
  {
    id: "ley-cambio-climatico-7-2021",
    title: "Ley 7/2021, de cambio climático y transición energética",
    summary:
      "Fija objetivos de descarbonización, energías renovables, movilidad sostenible y planes de adaptación.",
    url: "https://www.boe.es/buscar/act.php?id=BOE-A-2021-8447",
    keywords: [
      "cambio climatico",
      "transicion energetica",
      "renovables",
      "emisiones",
      "movilidad",
      "energia",
    ],
  },
];

const STOPWORDS = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "y",
  "o",
  "u",
  "un",
  "una",
  "unos",
  "unas",
  "al",
  "del",
  "por",
  "para",
  "con",
  "en",
  "sobre",
  "entre",
  "sin",
  "a",
  "que",
  "se",
  "lo",
  "su",
  "sus",
  "es",
  "son",
  "como",
  "más",
  "menos",
  "ya",
  "no",
  "sí",
  "le",
  "les",
  "las",
  "los",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9ñáéíóúü\s%]/gi, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

export interface AnalyzerMatch {
  law: SpanishLawDoc;
  score: number; // 0..1
  matched: string[];
}

export function analyzeProposal(text: string, max = 6): AnalyzerMatch[] {
  const qTokens = tokenize(text);
  if (qTokens.length === 0) return [];

  // simple TF overlap scoring with small boost for exact phrase hits
  const qSet = new Set(qTokens);
  const results: AnalyzerMatch[] = SPANISH_LAWS.map((law) => {
    const kTokens = new Set(law.keywords.map((k) => tokenize(k)).flat());
    let overlap = 0;
    const matched: string[] = [];
    for (const t of qSet) {
      if (kTokens.has(t)) {
        overlap += 1;
        matched.push(t);
      }
    }

    // phrase boost: if any keyword phrase is contained in text
    const textNorm = tokenize(text).join(" ");
    let phraseBoost = 0;
    for (const kw of law.keywords) {
      const n = tokenize(kw).join(" ");
      if (n && textNorm.includes(n)) phraseBoost += 0.25;
    }

    const denom = Math.max(3, Math.sqrt(kTokens.size));
    let raw = overlap / denom + phraseBoost;
    raw = Math.min(raw, 1);
    return { law, score: raw, matched };
  })
    .filter((r) => r.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return results;
}
