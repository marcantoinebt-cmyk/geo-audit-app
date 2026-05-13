'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PILLAR_LABELS: Record<string, { label: string; max: number }> = {
  lisibilite:   { label: 'Lisibilité au premier coup d\'œil', max: 20 },
  structure:    { label: 'Structure pour les moteurs IA',     max: 20 },
  clarte:       { label: 'Clarté du message',                max: 20 },
  reponses:     { label: 'Réponses aux vraies questions',     max: 10 },
  images:       { label: 'Images comprises par les IA',       max: 10 },
  accessibilite:{ label: 'Accessibilité universelle',         max: 10 },
  vocabulaire:  { label: 'Richesse du vocabulaire',           max:  5 },
  credibilite:  { label: 'Crédibilité et preuves externes',   max: 10 },
}

function ScoreCircle({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const color = score >= 70 ? '#1E7E34' : score >= 40 ? '#C96A00' : '#C0392B'
  const bg    = score >= 70 ? '#E6F4EA' : score >= 40 ? '#FFF3E0' : '#FDECEA'
  const dim   = size === 'lg' ? 'w-28 h-28 text-3xl' : 'w-16 h-16 text-xl'
  return (
    <div className={`${dim} rounded-full flex flex-col items-center justify-center font-bold`}
         style={{ background: bg, color, border: `3px solid ${color}` }}>
      <span>{score}</span>
      <span className="text-xs font-normal opacity-70">/100</span>
    </div>
  )
}

function PillarBar({ label, score, max, compScore }: { label: string; score: number; max: number; compScore?: number }) {
  const pct     = Math.round(score / max * 100)
  const compPct = compScore !== undefined ? Math.round(compScore / max * 100) : null
  const color   = pct >= 70 ? '#1E7E34' : pct >= 40 ? '#C96A00' : '#C0392B'
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium" style={{ color }}>{score}/{max}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, background: color }} />
        {compPct !== null && (
          <div className="absolute top-0 h-full w-0.5 bg-blue-400 opacity-60"
               style={{ left: `${compPct}%` }} />
        )}
      </div>
    </div>
  )
}

function FindingCard({ type, title, description }: { type: string; title: string; description: string }) {
  const styles: Record<string, { bg: string; border: string; icon: string }> = {
    critical: { bg: '#FDECEA', border: '#C0392B', icon: '🔴' },
    warning:  { bg: '#FFF3E0', border: '#C96A00', icon: '🟡' },
    good:     { bg: '#E6F4EA', border: '#1E7E34', icon: '🟢' },
  }
  const s = styles[type] || styles.warning
  return (
    <div className="rounded-lg p-3 mb-3 border-l-4"
         style={{ background: s.bg, borderLeftColor: s.border }}>
      <div className="font-medium text-sm text-gray-800 mb-1">{s.icon} {title}</div>
      <div className="text-xs text-gray-600 leading-relaxed">{description}</div>
    </div>
  )
}

function ActionCard({ num, title, impact, effort, priority }: {
  num: number; title: string; impact: string; effort: string; priority: string
}) {
  const colors: Record<string, string> = { critical: '#C0392B', high: '#C96A00', medium: '#1E7E34' }
  const color = colors[priority] || '#888'
  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
           style={{ background: color }}>{num}</div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-800 mb-1">{title}</div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>Impact : {impact}</span>
          <span>·</span>
          <span>Effort : {effort}</span>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = params?.id as string
  const [audit, setAudit]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'piliers' | 'benchmark' | 'actions'>('overview')

  useEffect(() => {
    if (!id) { router.push('/audit'); return }
    supabase.from('audits').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { router.push('/audit'); return }
      if (data.status !== 'completed') { router.push(`/audit/loading?id=${id}`); return }
      setAudit(data)
      setLoading(false)
    })
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center">
        <div className="text-muted text-sm">Chargement des résultats...</div>
      </div>
    )
  }

  const results   = audit?.results
  const main      = results?.main
  const scores    = results?.scores
  const findings  = results?.findings || []
  const actions   = results?.actions  || []
  const competitor = results?.competitor
  const domain    = main?.url?.replace(/https?:\/\//, '').replace(/\/.*/, '') || ''
  const compDomain = competitor?.url?.replace(/https?:\/\//, '').replace(/\/.*/, '') || ''

  return (
    <div className="min-h-screen bg-beige">
      {/* Header */}
      <header className="border-b border-beige-mid px-6 py-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sage-dark rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-semibold">TI</span>
          </div>
          <span className="font-display text-ink font-medium text-lg">The Impacters</span>
        </div>
        <button onClick={() => router.push('/audit')}
          className="text-xs text-muted hover:text-ink transition-colors">
          ← Nouvel audit
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* Titre */}
        <div className="mb-6">
          <h1 className="font-display text-3xl text-ink mb-1">Audit GEO & SEO</h1>
          <p className="text-muted text-sm">{domain} · Secteur : {audit.sector}</p>
        </div>

        {/* Scores globaux */}
        <div className="bg-white rounded-2xl border border-beige-mid p-6 mb-4 flex items-center gap-6">
          <div className="text-center">
            <ScoreCircle score={scores?.global || 0} />
            <div className="text-xs text-muted mt-2">Score global</div>
          </div>
          {competitor && (
            <>
              <div className="text-2xl text-gray-300">vs</div>
              <div className="text-center">
                <ScoreCircle score={competitor.global || 0} />
                <div className="text-xs text-muted mt-2">{compDomain}</div>
              </div>
            </>
          )}
          <div className="flex-1 grid grid-cols-2 gap-3 ml-4">
            {[
              { label: 'PageSpeed mobile', value: `${main?.pagespeed_mobile || 0}/100` },
              { label: 'PageSpeed desktop', value: `${main?.pagespeed_desktop || 0}/100` },
              { label: 'Schema.org', value: main?.has_schema ? '✅ Présent' : '❌ Absent' },
              { label: 'FAQ', value: main?.has_faq ? '✅ Présente' : '❌ Absente' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-beige rounded-lg p-3">
                <div className="text-xs text-muted mb-1">{kpi.label}</div>
                <div className="text-sm font-medium text-ink">{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-beige-mid overflow-hidden">
          <div className="flex border-b border-beige-mid">
            {(['overview', 'piliers', 'benchmark', 'actions'] as const).map(tab => (
              <button key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-medium transition-colors capitalize
                  ${activeTab === tab
                    ? 'text-sage-dark border-b-2 border-sage-dark bg-sage-light'
                    : 'text-muted hover:text-ink'}`}>
                {tab === 'overview' ? 'Vue d\'ensemble' :
                 tab === 'piliers' ? '8 piliers' :
                 tab === 'benchmark' ? 'Benchmark' : 'Plan d\'action'}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* TAB — Vue d'ensemble */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="font-display text-xl text-ink mb-4">Découvertes clés</h2>
                {findings.length === 0
                  ? <p className="text-muted text-sm">Aucune découverte.</p>
                  : findings.map((f: any, i: number) => (
                    <FindingCard key={i} type={f.type} title={f.title} description={f.description} />
                  ))
                }
              </div>
            )}

            {/* TAB — 8 piliers */}
            {activeTab === 'piliers' && (
              <div>
                <h2 className="font-display text-xl text-ink mb-2">Les 8 piliers GEO</h2>
                {competitor && (
                  <p className="text-xs text-muted mb-4">
                    La barre bleue verticale indique le score du concurrent.
                  </p>
                )}
                {Object.entries(PILLAR_LABELS).map(([key, { label, max }]) => (
                  <PillarBar
                    key={key}
                    label={label}
                    score={scores?.[key] || 0}
                    max={max}
                    compScore={competitor?.scores?.[key]}
                  />
                ))}
              </div>
            )}

            {/* TAB — Benchmark */}
            {activeTab === 'benchmark' && (
              <div>
                <h2 className="font-display text-xl text-ink mb-4">Benchmark concurrent</h2>
                {!competitor ? (
                  <p className="text-muted text-sm">Aucun concurrent renseigné lors de l'audit.</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: 'Score global', main: `${scores?.global}/100`, comp: `${competitor.global}/100` },
                      { label: 'PageSpeed mobile', main: `${main?.pagespeed_mobile}/100`, comp: `${competitor.pagespeed_mobile}/100` },
                      { label: 'Schema.org', main: main?.has_schema ? '✅' : '❌', comp: competitor.has_schema ? '✅' : '❌' },
                      { label: 'FAQ', main: main?.has_faq ? '✅' : '❌', comp: competitor.has_faq ? '✅' : '❌' },
                      { label: 'Structure H1', main: main?.h1_count === 1 ? '✅' : '❌', comp: competitor.h1_count === 1 ? '✅' : '❌' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-4 py-2 border-b border-gray-50">
                        <div className="w-36 text-xs text-muted">{row.label}</div>
                        <div className="flex-1 text-sm font-medium text-ink text-center bg-sage-light rounded px-2 py-1">{row.main}</div>
                        <div className="text-xs text-gray-400">vs</div>
                        <div className="flex-1 text-sm font-medium text-center bg-blue-50 rounded px-2 py-1">{row.comp}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB — Plan d'action */}
            {activeTab === 'actions' && (
              <div>
                <h2 className="font-display text-xl text-ink mb-4">Plan d'action priorisé</h2>
                {actions.length === 0
                  ? <p className="text-muted text-sm">Aucune action générée.</p>
                  : actions.map((a: any) => (
                    <ActionCard key={a.num} num={a.num} title={a.title}
                      impact={a.impact} effort={a.effort} priority={a.priority} />
                  ))
                }
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 bg-sage-dark rounded-2xl p-6 text-center">
          <h3 className="font-display text-xl text-white mb-2">Vous voulez aller plus loin ?</h3>
          <p className="text-sage-light text-sm mb-4">
            Audit complet avec backlinks, tracking GEO réel et accompagnement à la mise en œuvre.
          </p>
          <a href="https://cal.com" target="_blank" rel="noopener noreferrer"
            className="inline-block bg-white text-sage-dark font-medium text-sm px-6 py-3 rounded-lg hover:bg-beige transition-colors">
            Réserver un appel de 30 min →
          </a>
        </div>

      </main>
    </div>
  )
}
