// lib/pagespeed.ts
// Appel à l'API Google PageSpeed Insights

export interface PageSpeedResult {
  mobile: PageSpeedScore
  desktop: PageSpeedScore
}

export interface PageSpeedScore {
  score: number
  lcp: number
  fcp: number
  tbt: number
  cls: number
  issues: string[]
}

async function fetchPageSpeed(url: string, strategy: 'mobile' | 'desktop'): Promise<PageSpeedScore> {
  const apiKey = process.env.PAGESPEED_API_KEY
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${apiKey}`

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`)
    const data = await res.json()

    const categories = data.lighthouseResult?.categories
    const audits = data.lighthouseResult?.audits

    const score = Math.round((categories?.performance?.score || 0) * 100)
    const lcp = audits?.['largest-contentful-paint']?.numericValue
      ? Math.round(audits['largest-contentful-paint'].numericValue) / 1000
      : 0
    const fcp = audits?.['first-contentful-paint']?.numericValue
      ? Math.round(audits['first-contentful-paint'].numericValue) / 1000
      : 0
    const tbt = audits?.['total-blocking-time']?.numericValue
      ? Math.round(audits['total-blocking-time'].numericValue)
      : 0
    const cls = audits?.['cumulative-layout-shift']?.numericValue || 0

    const issues: string[] = []
    if (audits?.['uses-webp-images']?.score < 0.9)
      issues.push(`Images non converties en WebP — ${audits['uses-webp-images']?.displayValue || ''}`)
    if (audits?.['unused-javascript']?.score < 0.9)
      issues.push(`JavaScript inutilisé — ${audits['unused-javascript']?.displayValue || ''}`)
    if (audits?.['render-blocking-resources']?.score < 0.9)
      issues.push(`Scripts bloquant le rendu — ${audits['render-blocking-resources']?.displayValue || ''}`)
    if (audits?.['uses-optimized-images']?.score < 0.9)
      issues.push(`Images non optimisées — ${audits['uses-optimized-images']?.displayValue || ''}`)
    if (lcp > 2.5)
      issues.push(`LCP trop élevé (${lcp}s) — objectif < 2.5s`)

    return { score, lcp, fcp, tbt, cls, issues }
  } catch (error) {
    console.error(`PageSpeed error (${strategy}):`, error)
    return { score: 0, lcp: 0, fcp: 0, tbt: 0, cls: 0, issues: ['Impossible de récupérer les données PageSpeed'] }
  }
}

export async function getPageSpeedResults(url: string): Promise<PageSpeedResult> {
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeed(url, 'mobile'),
    fetchPageSpeed(url, 'desktop'),
  ])
  return { mobile, desktop }
}
