// lib/crawler.ts
// Crawl HTML du site — extraction des signaux GEO & SEO

export interface CrawlResult {
  url: string
  // Schema.org
  has_schema: boolean
  schema_types: string[]
  // Headings
  h1_count: number
  h2_count: number
  h2_as_questions: number
  h2_as_questions_pct: number
  heading_issues: string[]
  // Images
  images_total: number
  images_missing_alt: number
  images_duplicate_alt: number
  alt_quality: 'none' | 'poor' | 'good'
  // Meta
  title: string
  title_length: number
  meta_description: string
  meta_description_length: number
  // Robots & indexation
  robots_txt_ok: boolean
  sitemap_ok: boolean
  robots_tag: string
  // Contenu
  has_faq: boolean
  has_key_facts: boolean
  word_count: number
  // Accessibilité
  lang_tag: string
  // Liens
  crawlable_links: boolean
  // Errors
  error?: string
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GEOAuditBot/1.0)',
        'Accept': 'text/html',
      }
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractSchemas(html: string): { has_schema: boolean; schema_types: string[] } {
  const types: string[] = []
  // JSON-LD
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const json = JSON.parse(match[1])
      const extractType = (obj: any) => {
        if (obj['@type']) types.push(Array.isArray(obj['@type']) ? obj['@type'][0] : obj['@type'])
        if (obj['@graph']) obj['@graph'].forEach(extractType)
      }
      extractType(json)
    } catch { /* ignore malformed JSON */ }
  }
  // Microdata
  const microdataMatches = html.matchAll(/itemtype=["']https?:\/\/schema\.org\/([^"'\s]+)["']/gi)
  for (const match of microdataMatches) {
    if (!types.includes(match[1])) types.push(match[1])
  }
  return { has_schema: types.length > 0, schema_types: [...new Set(types)] }
}

function extractHeadings(html: string): {
  h1_count: number; h2_count: number;
  h2_as_questions: number; h2_as_questions_pct: number; issues: string[]
} {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim())
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim())

  const questionWords = ['comment', 'pourquoi', 'quand', 'quel', 'quelle', 'quels', 'quelles', 'est-ce', 'où', 'qui', 'how', 'why', 'what', 'when', 'where', 'which', 'who']
  const h2Questions = h2s.filter(h2 =>
    h2.endsWith('?') || questionWords.some(w => h2.toLowerCase().startsWith(w))
  )

  const issues: string[] = []
  if (h1s.length === 0) issues.push('Aucun H1 sur la page')
  if (h1s.length > 1) issues.push(`${h1s.length} H1 détectés sur la page — 1 seul attendu`)
  if (h2s.length === 0) issues.push('Aucun H2 détecté')
  if (h2Questions.length === 0 && h2s.length > 0) issues.push('Aucun H2 formulé en question')

  const pct = h2s.length > 0 ? Math.round(h2Questions.length / h2s.length * 100) : 0

  return { h1_count: h1s.length, h2_count: h2s.length, h2_as_questions: h2Questions.length, h2_as_questions_pct: pct, issues }
}

function extractImages(html: string): {
  images_total: number; images_missing_alt: number;
  images_duplicate_alt: number; alt_quality: 'none' | 'poor' | 'good'
} {
  const imgMatches = [...html.matchAll(/<img[^>]+>/gi)]
  const alts: string[] = []
  let missing = 0

  for (const match of imgMatches) {
    const altMatch = match[0].match(/alt=["']([^"']*)["']/i)
    if (!altMatch || altMatch[1].trim() === '') {
      missing++
    } else {
      alts.push(altMatch[1].trim().toLowerCase())
    }
  }

  const altCounts = alts.reduce((acc: Record<string, number>, alt) => {
    acc[alt] = (acc[alt] || 0) + 1
    return acc
  }, {})
  const duplicates = Object.values(altCounts).filter(c => c > 1).reduce((s, c) => s + c - 1, 0)

  const total = imgMatches.length
  let quality: 'none' | 'poor' | 'good' = 'good'
  if (missing > total * 0.5) quality = 'none'
  else if (duplicates > total * 0.3 || missing > total * 0.2) quality = 'poor'

  return { images_total: total, images_missing_alt: missing, images_duplicate_alt: duplicates, alt_quality: quality }
}

function extractMeta(html: string): { title: string; title_length: number; meta_description: string; meta_description_length: number } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
  const meta_description = metaMatch ? metaMatch[1].trim() : ''
  return { title, title_length: title.length, meta_description, meta_description_length: meta_description.length }
}

function extractLang(html: string): string {
  const match = html.match(/<html[^>]*lang=["']([^"']*)["']/i)
  return match ? match[1] : ''
}

function extractRobotsTag(html: string): string {
  const match = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i)
  return match ? match[1] : 'missing'
}

function hasFaq(html: string): boolean {
  const faqPatterns = [
    /faq/i,
    /questions?\s+fr[eé]quentes?/i,
    /foire\s+aux\s+questions?/i,
    /frequently\s+asked/i,
    /schema\.org.*FAQPage/i,
    /@type.*FAQPage/i,
  ]
  return faqPatterns.some(p => p.test(html))
}

function hasKeyFacts(html: string): boolean {
  const patterns = [/\d+\s*(m²|m2|km|€|\$|personnes?|chambres?|suites?)/gi]
  const matches = html.match(patterns[0])
  return (matches?.length || 0) >= 3
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.split(' ').filter(w => w.length > 2).length
}

async function checkRobotsTxt(baseUrl: string): Promise<boolean> {
  try {
    const url = new URL(baseUrl)
    const res = await fetch(`${url.origin}/robots.txt`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch { return false }
}

async function checkSitemap(baseUrl: string): Promise<boolean> {
  try {
    const url = new URL(baseUrl)
    const res = await fetch(`${url.origin}/sitemap.xml`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch { return false }
}

export async function crawlSite(url: string): Promise<CrawlResult> {
  const html = await fetchHtml(url)

  if (!html) {
    return {
      url, has_schema: false, schema_types: [], h1_count: 0, h2_count: 0,
      h2_as_questions: 0, h2_as_questions_pct: 0, heading_issues: ['Site inaccessible'],
      images_total: 0, images_missing_alt: 0, images_duplicate_alt: 0, alt_quality: 'none',
      title: '', title_length: 0, meta_description: '', meta_description_length: 0,
      robots_txt_ok: false, sitemap_ok: false, robots_tag: 'missing',
      has_faq: false, has_key_facts: false, word_count: 0,
      lang_tag: '', crawlable_links: false, error: 'Site inaccessible ou timeout'
    }
  }

  const [schema, headings, images, meta, robots_txt_ok, sitemap_ok] = await Promise.all([
    Promise.resolve(extractSchemas(html)),
    Promise.resolve(extractHeadings(html)),
    Promise.resolve(extractImages(html)),
    Promise.resolve(extractMeta(html)),
    checkRobotsTxt(url),
    checkSitemap(url),
  ])

  // Vérification liens crawlables (présence d'ancres avec href)
  const linkCount = (html.match(/<a[^>]+href=["'][^"']+["']/gi) || []).length
  const crawlable_links = linkCount > 3

  return {
    url,
    ...schema,
    h1_count: headings.h1_count,
    h2_count: headings.h2_count,
    h2_as_questions: headings.h2_as_questions,
    h2_as_questions_pct: headings.h2_as_questions_pct,
    heading_issues: headings.issues,
    ...images,
    ...meta,
    robots_txt_ok,
    sitemap_ok,
    robots_tag: extractRobotsTag(html),
    has_faq: hasFaq(html),
    has_key_facts: hasKeyFacts(html),
    word_count: countWords(html),
    lang_tag: extractLang(html),
    crawlable_links,
  }
}
