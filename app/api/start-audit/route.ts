import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getPageSpeedResults } from '@/lib/pagespeed'
import { crawlSite } from '@/lib/crawler'

async function updateAudit(id: string, data: Record<string, any>) {
  await supabaseAdmin.from('audits').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
}
async function setStep(id: string, step: string, progress: number) {
  await updateAudit(id, { current_step: step, progress })
}

function computeScores(main: any) {
  let lisibilite = 5
  if (main.pagespeed_mobile >= 75) lisibilite += 5
  else if (main.pagespeed_mobile >= 50) lisibilite += 2
  if (main.has_key_facts) lisibilite += 4
  if (main.crawlable_links) lisibilite += 3
  if (main.word_count > 300) lisibilite += 3
  lisibilite = Math.min(20, lisibilite)
  let structure = 5
  if (main.h1_count === 1) structure += 6
  if (main.h2_as_questions_pct >= 50) structure += 5
  else if (main.h2_as_questions_pct >= 20) structure += 2
  if (main.h2_count >= 3) structure += 4
  structure = Math.min(20, structure)
  let clarte = 5
  if (main.has_faq) clarte += 8
  if (main.word_count > 500) clarte += 4
  if (main.meta_description_length >= 120 && main.meta_description_length <= 160) clarte += 3
  clarte = Math.min(20, clarte)
  let reponses = 2
  if (main.has_faq) reponses += 5
  if (main.h2_as_questions_pct >= 30) reponses += 3
  reponses = Math.min(10, reponses)
  let images = 2
  if (main.alt_quality === 'good') images += 6
  else if (main.alt_quality === 'poor') images += 3
  if (main.images_missing_alt === 0) images += 2
  images = Math.min(10, images)
  let accessibilite = 3
  if (main.lang_tag) accessibilite += 3
  if (main.robots_txt_ok) accessibilite += 2
  if (main.crawlable_links) accessibilite += 2
  accessibilite = Math.min(10, accessibilite)
  let vocabulaire = 1
  if (main.has_schema) vocabulaire += 2
  if (main.schema_types && main.schema_types.length >= 3) vocabulaire += 2
  vocabulaire = Math.min(5, vocabulaire)
  let credibilite = 2
  if (main.sitemap_ok) credibilite += 2
  if (main.robots_txt_ok) credibilite += 2
  if (main.title_length >= 30 && main.title_length <= 60) credibilite += 2
  if (main.meta_description_length >= 100) credibilite += 2
  credibilite = Math.min(10, credibilite)
  const total = lisibilite + structure + clarte + reponses + images + accessibilite + vocabulaire + credibilite
  const global = Math.round(total / 105 * 100)
  return { lisibilite, structure, clarte, reponses, images, accessibilite, vocabulaire, credibilite, global }
}

function generateFindings(main: any) {
  const findings: any[] = []
  if (!main.has_schema) findings.push({ type: 'critical', title: 'Schema.org totalement absent', description: 'Aucune donnée structurée. Les moteurs IA ne peuvent pas identifier l\'établissement.', pillar: 'Richesse du vocabulaire' })
  if (main.h1_count > 1) findings.push({ type: 'critical', title: `${main.h1_count} H1 détectés`, description: 'Un seul H1 par page est attendu. Les H1 multiples perturbent les LLMs.', pillar: 'Structure' })
  if (main.h1_count === 0) findings.push({ type: 'critical', title: 'Aucun H1', description: 'Le H1 est le premier élément que les IA lisent.', pillar: 'Structure' })
  if (!main.has_faq) findings.push({ type: 'warning', title: 'Aucune FAQ', description: 'La FAQ est l\'action GEO la plus rentable.', pillar: 'Réponses' })
  if (main.alt_quality === 'poor' || main.alt_quality === 'none') findings.push({ type: 'warning', title: 'ALT images insuffisants', description: `${main.images_missing_alt} manquants, ${main.images_duplicate_alt} dupliqués.`, pillar: 'Images' })
  if (main.pagespeed_mobile < 60) findings.push({ type: 'warning', title: `Performance mobile faible (${main.pagespeed_mobile}/100)`, description: 'LCP élevé = site difficile à crawler.', pillar: 'Lisibilité' })
  if (main.h2_as_questions_pct === 0 && main.h2_count > 0) findings.push({ type: 'warning', title: 'Aucun H2 en question', description: 'Les H2 en questions augmentent la sélection par les LLMs.', pillar: 'Structure' })
  if (main.has_schema && main.schema_types && main.schema_types.length > 0) findings.push({ type: 'good', title: `Schema.org présent (${main.schema_types.join(', ')})`, description: 'Bonne base de données structurées.', pillar: 'Vocabulaire' })
  if (main.pagespeed_mobile >= 75) findings.push({ type: 'good', title: `Performance mobile solide (${main.pagespeed_mobile}/100)`, description: 'Le site charge correctement sur mobile.', pillar: 'Lisibilité' })
  return findings
}

function generateActions(main: any) {
  const actions: any[] = []
  let num = 1
  if (!main.has_schema) actions.push({ num: num++, title: 'Implémenter Schema.org LodgingBusiness + FAQPage', impact: '+15 pts', effort: '2-3j dev', priority: 'critical', pillar: 'Vocabulaire' })
  if (main.h1_count !== 1) actions.push({ num: num++, title: 'Corriger la structure H1 (1 seul H1 par page)', impact: '+10 pts', effort: '1-2j dev', priority: 'critical', pillar: 'Structure' })
  if (!main.has_faq) actions.push({ num: num++, title: 'Créer une page FAQ avec Schema.org FAQPage', impact: '+15 pts', effort: '2j rédaction + 1j dev', priority: 'high', pillar: 'Réponses' })
  if (main.h2_as_questions_pct < 30) actions.push({ num: num++, title: 'Reformuler 50% des H2 en questions', impact: '+8 pts', effort: '1-2j rédaction', priority: 'high', pillar: 'Structure' })
  if (!main.has_key_facts) actions.push({ num: num++, title: 'Ajouter un bloc données chiffrées', impact: '+8 pts', effort: '1j', priority: 'high', pillar: 'Lisibilité' })
  if (main.alt_quality !== 'good') actions.push({ num: num++, title: 'Réécrire tous les attributs ALT', impact: '+6 pts', effort: '2-3j rédaction', priority: 'high', pillar: 'Images' })
  if (main.pagespeed_mobile < 75) actions.push({ num: num++, title: 'Optimiser performances mobile (WebP, JS)', impact: '+8 pts', effort: '1-2j dev', priority: 'medium', pillar: 'Lisibilité' })
  return actions
}

async function runAudit(auditId: string, mainUrl: string, competitorUrl: string | null) {
  try {
    await updateAudit(auditId, { status: 'running' })
    await setStep(auditId, 'Analyse des performances mobile et desktop...', 8)
    const mainPageSpeed = await getPageSpeedResults(mainUrl)
    await setStep(auditId, 'Crawl HTML — Schema.org, titres, images, meta...', 25)
    const mainCrawl = await crawlSite(mainUrl)
    let competitorResult = null
    if (competitorUrl) {
      await setStep(auditId, 'Analyse du concurrent...', 45)
      const compPageSpeed = await getPageSpeedResults(competitorUrl)
      await setStep(auditId, 'Crawl HTML du concurrent...', 60)
      const compCrawl = await crawlSite(competitorUrl)
      const compData = { pagespeed_mobile: compPageSpeed.mobile.score, pagespeed_desktop: compPageSpeed.desktop.score, ...compCrawl }
      const compScores = computeScores(compData)
      competitorResult = { url: competitorUrl, global: compScores.global, scores: compScores, pagespeed_mobile: compData.pagespeed_mobile, has_schema: compData.has_schema, has_faq: compData.has_faq, h1_count: compData.h1_count, schema_types: compData.schema_types }
    }
    await setStep(auditId, 'Calcul des scores 8 piliers GEO...', 78)
    const mainData = { pagespeed_mobile: mainPageSpeed.mobile.score, pagespeed_desktop: mainPageSpeed.desktop.score, lcp_mobile: mainPageSpeed.mobile.lcp, lcp_desktop: mainPageSpeed.desktop.lcp, pagespeed_issues: mainPageSpeed.mobile.issues, ...mainCrawl }
    const scores = computeScores(mainData)
    await setStep(auditId, 'Génération du plan d\'action...', 90)
    const findings = generateFindings(mainData)
    const actions = generateActions(mainData)
    const results = { main: mainData, competitor: competitorResult, scores, findings, actions, global_score: scores.global, competitor_score: competitorResult?.global || null, generated_at: new Date().toISOString() }
    await updateAudit(auditId, { status: 'completed', current_step: 'Rapport prêt', progress: 100, results })
  } catch (error: any) {
    console.error('runAudit error:', error)
    await supabaseAdmin.from('audits').update({ status: 'error', error_message: error.message || 'Erreur inconnue', current_step: 'Erreur lors de l\'analyse' }).eq('id', auditId)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { main_url, competitor_url, sector, email } = body
    if (!main_url || !email || !sector) return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    try { new URL(main_url) } catch { return NextResponse.json({ error: 'URL invalide' }, { status: 400 }) }
    const { data: audit, error: dbError } = await supabaseAdmin.from('audits').insert({ email, sector, main_url, competitor_url: competitor_url || null, status: 'pending', current_step: 'Initialisation...', progress: 0, ip_address: request.headers.get('x-forwarded-for') || 'unknown', user_agent: request.headers.get('user-agent') || 'unknown' }).select('id').single()
    if (dbError || !audit) return NextResponse.json({ error: 'Erreur création audit' }, { status: 500 })
    runAudit(audit.id, main_url, competitor_url || null).catch(console.error)
    return NextResponse.json({ audit_id: audit.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
