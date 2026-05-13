// app/api/run-audit/route.ts
// Orchestrateur principal — lance l'analyse complète et met à jour Supabase

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

function computeScores(main: any, competitor: any) {
  // Pilier 1 — Lisibilité au premier coup d'œil (UX) /20
  let lisibilite = 5
  if (main.pagespeed_mobile >= 75) lisibilite += 5
  else if (main.pagespeed_mobile >= 50) lisibilite += 2
  if (main.has_key_facts) lisibilite += 4
  if (main.crawlable_links) lisibilite += 3
  if (main.word_count > 300) lisibilite += 3
  lisibilite = Math.min(20, lisibilite)

  // Pilier 2 — Structure pour les moteurs IA (Conteneurs LLM) /20
  let structure = 5
  if (main.h1_count === 1) structure += 6
  else if (main.h1_count === 0) structure += 1
  if (main.h2_as_questions_pct >= 50) structure += 5
  else if (main.h2_as_questions_pct >= 20) structure += 2
  if (main.h2_count >= 3) structure += 4
  structure = Math.min(20, structure)

  // Pilier 3 — Clarté du message /20
  let clarte = 5
  if (main.has_faq) clarte += 8
  if (main.word_count > 500) clarte += 4
  if (main.meta_description_length >= 120 && main.meta_description_length <= 160) clarte += 3
  clarte = Math.min(20, clarte)

  // Pilier 4 — Réponses aux vraies questions /10
  let reponses = 2
  if (main.has_faq) reponses += 5
  if (main.h2_as_questions_pct >= 30) reponses += 3
  reponses = Math.min(10, reponses)

  // Pilier 5 — Images comprises par les IA (Médias) /10
  let images = 2
  if (main.alt_quality === 'good') images += 6
  else if (main.alt_quality === 'poor') images += 3
  if (main.images_missing_alt === 0) images += 2
  images = Math.min(10, images)

  // Pilier 6 — Accessibilité /10
  let accessibilite = 3
  if (main.lang_tag) accessibilite += 3
  if (main.robots_txt_ok) accessibilite += 2
  if (main.crawlable_links) accessibilite += 2
  accessibilite = Math.min(10, accessibilite)

  // Pilier 7 — Richesse du vocabulaire (Sémantique) /5
  let vocabulaire = 1
  if (main.has_schema) vocabulaire += 2
  if (main.schema_types.length >= 3) vocabulaire += 2
  vocabulaire = Math.min(5, vocabulaire)

  // Pilier 8 — Crédibilité et preuves externes /10
  let credibilite = 2
  if (main.sitemap_ok) credibilite += 2
  if (main.robots_txt_ok) credibilite += 2
  if (main.title_length >= 30 && main.title_length <= 60) credibilite += 2
  if (main.meta_description_length >= 100) credibilite += 2
  credibilite = Math.min(10, credibilite)

  const global = Math.round(
    (lisibilite + structure + clarte + reponses + images + accessibilite + vocabulaire + credibilite) /
    (20 + 20 + 20 + 10 + 10 + 10 + 5 + 10) * 100
  )

  return { lisibilite, structure, clarte, reponses, images, accessibilite, vocabulaire, credibilite, global }
}

function generateFindings(main: any, scores: any) {
  const findings = []

  if (!main.has_schema)
    findings.push({ type: 'critical', title: 'Schema.org totalement absent', description: 'Aucune donnée structurée. Les moteurs IA ne peuvent pas identifier l\'établissement.', pillar: 'Richesse du vocabulaire' })
  if (main.h1_count > 1)
    findings.push({ type: 'critical', title: `${main.h1_count} H1 détectés sur la page`, description: 'Un seul H1 par page est attendu. Les H1 multiples perturbent la compréhension des LLMs.', pillar: 'Structure pour les moteurs IA' })
  if (main.h1_count === 0)
    findings.push({ type: 'critical', title: 'Aucun H1 sur la page', description: 'Le H1 est l\'élément principal que les IA lisent en premier.', pillar: 'Structure pour les moteurs IA' })
  if (!main.has_faq)
    findings.push({ type: 'warning', title: 'Aucune FAQ sur le site', description: 'La FAQ est l\'action GEO la plus rentable. Les IA adorent les formats Q/R structurés.', pillar: 'Réponses aux vraies questions' })
  if (main.alt_quality === 'poor' || main.alt_quality === 'none')
    findings.push({ type: 'warning', title: 'Qualité des ALT images insuffisante', description: `${main.images_missing_alt} images sans ALT, ${main.images_duplicate_alt} ALT dupliqués. Les IA ne peuvent pas comprendre les visuels.`, pillar: 'Images comprises par les IA' })
  if (main.pagespeed_mobile < 60)
    findings.push({ type: 'warning', title: `Performance mobile faible (${main.pagespeed_mobile}/100)`, description: 'LCP élevé = site difficile à crawler. Impact direct sur l\'indexation IA.', pillar: 'Lisibilité au premier coup d\'œil' })
  if (main.h2_as_questions_pct === 0 && main.h2_count > 0)
    findings.push({ type: 'warning', title: 'Aucun H2 formulé en question', description: 'Les H2 en questions augmentent significativement la sélection par les LLMs.', pillar: 'Structure pour les moteurs IA' })
  if (main.has_schema && main.schema_types.length > 0)
    findings.push({ type: 'good', title: `Schema.org présent (${main.schema_types.join(', ')})`, description: 'Bonne base de données structurées. Vérifier que LodgingBusiness et FAQPage sont inclus.', pillar: 'Richesse du vocabulaire' })
  if (main.pagespeed_mobile >= 75)
    findings.push({ type: 'good', title: `Performance mobile solide (${main.pagespeed_mobile}/100)`, description: 'Le site charge correctement sur mobile — bonne base pour le crawl IA.', pillar: 'Lisibilité au premier coup d\'œil' })

  return findings
}

function generateActions(main: any, scores: any) {
  const actions = []
  let num = 1

  if (!main.has_schema)
    actions.push({ num: num++, title: 'Implémenter Schema.org LodgingBusiness + FAQPage', impact: '+15 pts', effort: '2-3 jours dev', priority: 'critical', pillar: 'Richesse du vocabulaire' })
  if (main.h1_count !== 1)
    actions.push({ num: num++, title: 'Corriger la structure H1 (1 seul H1 par page)', impact: '+10 pts', effort: '1-2 jours dev', priority: 'critical', pillar: 'Structure pour les moteurs IA' })
  if (!main.has_faq)
    actions.push({ num: num++, title: 'Créer une page FAQ avec Schema.org FAQPage', impact: '+15 pts', effort: '2j rédaction + 1j dev', priority: 'high', pillar: 'Réponses aux vraies questions' })
  if (main.h2_as_questions_pct < 30)
    actions.push({ num: num++, title: 'Reformuler 50% des H2 en questions', impact: '+8 pts', effort: '1-2 jours rédaction', priority: 'high', pillar: 'Structure pour les moteurs IA' })
  if (!main.has_key_facts)
    actions.push({ num: num++, title: 'Ajouter un bloc "L\'essentiel" avec données chiffrées', impact: '+8 pts', effort: '1 jour', priority: 'high', pillar: 'Lisibilité au premier coup d\'œil' })
  if (main.alt_quality !== 'good')
    actions.push({ num: num++, title: 'Réécrire tous les attributs ALT des images', impact: '+6 pts', effort: '2-3 jours rédaction', priority: 'high', pillar: 'Images comprises par les IA' })
  if (main.pagespeed_mobile < 75)
    actions.push({ num: num++, title: 'Optimiser les performances mobile (WebP, lazy loading, JS)', impact: '+8 pts', effort: '1-2 jours dev', priority: 'medium', pillar: 'Lisibilité au premier coup d\'œil' })

  return actions
}

export async function POST(request: NextRequest) {
  let auditId: string | null = null

  try {
    const body = await request.json()
    auditId = body.audit_id

    if (!auditId) return NextResponse.json({ error: 'audit_id manquant' }, { status: 400 })

    // Récupérer les données de l'audit
    const { data: audit } = await supabaseAdmin.from('audits').select('*').eq('id', auditId).single()
    if (!audit) return NextResponse.json({ error: 'Audit introuvable' }, { status: 404 })

    await updateAudit(auditId, { status: 'running' })

    // ── ÉTAPE 1 : PageSpeed mobile + desktop (site principal) ──
    await setStep(auditId, 'Analyse des performances mobile et desktop...', 8)
    const mainPageSpeed = await getPageSpeedResults(audit.main_url)

    // ── ÉTAPE 2 : Crawl HTML site principal ──
    await setStep(auditId, 'Crawl HTML — Schema.org, titres, images, meta...', 25)
    const mainCrawl = await crawlSite(audit.main_url)

    // ── ÉTAPE 3 : PageSpeed concurrent (si fourni) ──
    let compPageSpeed = null
    let compCrawl = null
    if (audit.competitor_url) {
      await setStep(auditId, 'Analyse du concurrent — performance...', 42)
      compPageSpeed = await getPageSpeedResults(audit.competitor_url)
      await setStep(auditId, 'Crawl HTML du concurrent...', 55)
      compCrawl = await crawlSite(audit.competitor_url)
    }

    // ── ÉTAPE 4 : Compilation des données ──
    await setStep(auditId, 'Compilation des données techniques...', 65)

const mainData = {
  pagespeed_mobile: mainPageSpeed.mobile.score,
  pagespeed_desktop: mainPageSpeed.desktop.score,
  lcp_mobile: mainPageSpeed.mobile.lcp,
  lcp_desktop: mainPageSpeed.desktop.lcp,
  pagespeed_issues: mainPageSpeed.mobile.issues,
  ...mainCrawl,
}

    const compData = compCrawl && compPageSpeed ? {
      pagespeed_mobile: compPageSpeed.mobile.score,
      pagespeed_desktop: compPageSpeed.desktop.score,
      lcp_mobile: compPageSpeed.mobile.lcp,
      lcp_desktop: compPageSpeed.desktop.lcp,
      pagespeed_issues: compPageSpeed.mobile.issues,
      ...compCrawl,
    } : null

    // ── ÉTAPE 5 : Scoring 8 piliers ──
    await setStep(auditId, 'Calcul des scores sur les 8 piliers GEO...', 75)
    const scores = computeScores(mainData, compData)

    // Score concurrent simplifié
    let competitorScore = null
    if (compData) {
      const compScores = computeScores(compData, null)
      competitorScore = {
        global: compScores.global,
        url: audit.competitor_url,
        pagespeed_mobile: compData.pagespeed_mobile,
        has_schema: compData.has_schema,
        has_faq: compData.has_faq,
        h1_count: compData.h1_count,
        schema_types: compData.schema_types,
        scores: compScores,
      }
    }

    // ── ÉTAPE 6 : Génération findings et actions ──
    await setStep(auditId, 'Génération du plan d\'action...', 85)
    const findings = generateFindings(mainData, scores)
    const actions = generateActions(mainData, scores)

    // ── ÉTAPE 7 : Sauvegarde résultats ──
    await setStep(auditId, 'Sauvegarde du rapport...', 93)

    const results = {
      main: mainData,
      competitor: competitorScore,
      scores,
      findings,
      actions,
      global_score: scores.global,
      competitor_score: competitorScore?.global || null,
      generated_at: new Date().toISOString(),
    }

    await updateAudit(auditId, {
      status: 'completed',
      current_step: 'Rapport prêt',
      progress: 100,
      results,
    })

    return NextResponse.json({ success: true, audit_id: auditId })

  } catch (error: any) {
    console.error('run-audit error:', error)
    if (auditId) {
      await supabaseAdmin.from('audits').update({
        status: 'error',
        error_message: error.message || 'Erreur inconnue',
        current_step: 'Erreur lors de l\'analyse',
      }).eq('id', auditId)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
