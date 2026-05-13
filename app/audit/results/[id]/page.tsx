'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PILLAR_LABELS: Record<string, { label: string; max: number }> = {
  lisibilite:    { label: "Lisibilité au premier coup d'œil", max: 20 },
  structure:     { label: 'Structure pour les moteurs IA',    max: 20 },
  clarte:        { label: 'Clarté du message',               max: 20 },
  reponses:      { label: 'Réponses aux vraies questions',    max: 10 },
  images:        { label: 'Images comprises par les IA',      max: 10 },
  accessibilite: { label: 'Accessibilité universelle',        max: 10 },
  vocabulaire:   { label: 'Richesse du vocabulaire',          max:  5 },
  credibilite:   { label: 'Crédibilité et preuves externes',  max: 10 },
}

function getScoreColor(score: number) {
  if (score >= 70) return '#1E7E34'
  if (score >= 40) return '#C96A00'
  return '#C0392B'
}
function getScoreBg(score: number) {
  if (score >= 70) return '#E6F4EA'
  if (score >= 40) return '#FFF3E0'
  return '#FDECEA'
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = getScoreColor(score)
  const bg    = getScoreBg(score)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: bg, border: `3px solid ${color}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto'
      }}>
        <span style={{ fontSize: 28, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 11, color, opacity: 0.8 }}>/100</span>
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{label}</div>
    </div>
  )
}

function PillarBar({ label, score, max, compScore }: { label: string; score: number; max: number; compScore?: number }) {
  const pct     = Math.round(score / max * 100)
  const compPct = compScore !== undefined ? Math.round(compScore / max * 100) : null
  const color   = getScoreColor(pct)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: '#333' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{score}/{max}</span>
      </div>
      <div style={{ height: 8, background: '#eee', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.7s ease' }} />
        {compPct !== null && (
          <div style={{ position: 'absolute', top: -2, bottom: -2, width: 2, background: '#3B82F6', borderRadius: 1, left: `${compPct}%` }} />
        )}
      </div>
    </div>
  )
}

function FindingCard({ type, title, description }: { type: string; title: string; description: string }) {
  const map: Record<string, { bg: string; border: string; icon: string }> = {
    critical: { bg: '#FDECEA', border: '#C0392B', icon: '🔴' },
    warning:  { bg: '#FFF3E0', border: '#C96A00', icon: '🟡' },
    good:     { bg: '#E6F4EA', border: '#1E7E34', icon: '🟢' },
  }
  const s = map[type] || map.warning
  return (
    <div style={{ background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#222', marginBottom: 3 }}>{s.icon} {title}</div>
      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{description}</div>
    </div>
  )
}

function ActionCard({ num, title, impact, effort, priority }: { num: number; title: string; impact: string; effort: string; priority: string }) {
  const colors: Record<string, string> = { critical: '#C0392B', high: '#C96A00', medium: '#1E7E34' }
  const c = colors[priority] || '#888'
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: c, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#888' }}>Impact : {impact} · Effort : {effort}</div>
      </div>
    </div>
  )
}

const TAB_LABELS = [
  { key: 'overview',   label: "Vue d'ensemble" },
  { key: 'piliers',    label: '8 piliers' },
  { key: 'benchmark',  label: 'Benchmark' },
  { key: 'actions',    label: "Plan d'action" },
]

export default function ResultsPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = params?.id as string
  const [audit, setAudit]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('overview')

  useEffect(() => {
    if (!id) { router.push('/audit'); return }
    supabase.from('audits').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { router.push('/audit'); return }
      if (data.status !== 'completed') { router.push(`/audit/loading?id=${id}`); return }
      setAudit(data)
      setLoading(false)
    })
  }, [id, router])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8' }}>
      <p style={{ color: '#666', fontSize: 14 }}>Chargement des résultats...</p>
    </div>
  )

  const results    = audit?.results
  const main       = results?.main
  const scores     = results?.scores
  const findings   = results?.findings || []
  const actions    = results?.actions  || []
  const competitor = results?.competitor
  const domain     = main?.url?.replace(/https?:\/\//, '').split('/')[0] || ''
  const compDomain = competitor?.url?.replace(/https?:\/\//, '').split('/')[0] || ''

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0d8cc', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#4A6B54', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>TI</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 17, color: '#1C2B22' }}>The Impacters</span>
        </div>
        <button onClick={() => router.push('/audit')}
          style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Nouvel audit
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>

        {/* Titre */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C2B22', marginBottom: 4 }}>Audit GEO & SEO</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>{domain} · {audit.sector}</p>

        {/* Scores */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e0d8cc', padding: 24, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <ScoreCircle score={scores?.global || 0} label="Score global" />
          {competitor && (
            <>
              <span style={{ fontSize: 20, color: '#ccc' }}>vs</span>
              <ScoreCircle score={competitor.global || 0} label={compDomain} />
            </>
          )}
          <div style={{ flex: 1, minWidth: 200, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'PageSpeed mobile',  value: `${main?.pagespeed_mobile || 0}/100` },
              { label: 'PageSpeed desktop', value: `${main?.pagespeed_desktop || 0}/100` },
              { label: 'Schema.org',        value: main?.has_schema ? '✅ Présent' : '❌ Absent' },
              { label: 'FAQ',               value: main?.has_faq ? '✅ Présente' : '❌ Absente' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: '#F5F0E8', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{kpi.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2B22' }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e0d8cc', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e0d8cc' }}>
            {TAB_LABELS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '12px 8px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: tab === t.key ? '#E8F0EA' : '#fff',
                  color: tab === t.key ? '#4A6B54' : '#888',
                  borderBottom: tab === t.key ? '2px solid #4A6B54' : '2px solid transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>

            {tab === 'overview' && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2B22', marginBottom: 16 }}>Découvertes clés</h2>
                {findings.length === 0
                  ? <p style={{ color: '#888', fontSize: 13 }}>Aucune découverte.</p>
                  : findings.map((f: any, i: number) => <FindingCard key={i} {...f} />)}
              </div>
            )}

            {tab === 'piliers' && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2B22', marginBottom: 4 }}>Les 8 piliers GEO</h2>
                {competitor && <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>La barre bleue indique le score du concurrent.</p>}
                {Object.entries(PILLAR_LABELS).map(([key, { label, max }]) => (
                  <PillarBar key={key} label={label} score={scores?.[key] || 0} max={max} compScore={competitor?.scores?.[key]} />
                ))}
              </div>
            )}

            {tab === 'benchmark' && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2B22', marginBottom: 16 }}>Benchmark concurrent</h2>
                {!competitor
                  ? <p style={{ color: '#888', fontSize: 13 }}>Aucun concurrent renseigné.</p>
                  : [
                      { label: 'Score global',    main: `${scores?.global}/100`,          comp: `${competitor.global}/100` },
                      { label: 'PageSpeed mobile',main: `${main?.pagespeed_mobile}/100`,   comp: `${competitor.pagespeed_mobile}/100` },
                      { label: 'Schema.org',      main: main?.has_schema ? '✅' : '❌',    comp: competitor.has_schema ? '✅' : '❌' },
                      { label: 'FAQ',             main: main?.has_faq ? '✅' : '❌',       comp: competitor.has_faq ? '✅' : '❌' },
                      { label: 'H1 correct',      main: main?.h1_count === 1 ? '✅' : '❌',comp: competitor.h1_count === 1 ? '✅' : '❌' },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <div style={{ width: 130, fontSize: 12, color: '#888' }}>{row.label}</div>
                        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, background: '#E8F0EA', borderRadius: 6, padding: '4px 8px' }}>{row.main}</div>
                        <div style={{ fontSize: 12, color: '#ccc' }}>vs</div>
                        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, background: '#EFF6FF', borderRadius: 6, padding: '4px 8px' }}>{row.comp}</div>
                      </div>
                    ))
                }
              </div>
            )}

            {tab === 'actions' && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1C2B22', marginBottom: 16 }}>Plan d'action priorisé</h2>
                {actions.length === 0
                  ? <p style={{ color: '#888', fontSize: 13 }}>Aucune action générée.</p>
                  : actions.map((a: any) => <ActionCard key={a.num} {...a} />)}
              </div>
            )}

          </div>
        </div>

        {/* CTA */}
        <div style={{ background: '#4A6B54', borderRadius: 16, padding: '28px 24px', textAlign: 'center', marginTop: 20 }}>
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Vous voulez aller plus loin ?</h3>
          <p style={{ color: '#a8c4b0', fontSize: 13, marginBottom: 20 }}>
            Audit complet avec backlinks, tracking GEO réel et accompagnement à la mise en œuvre.
          </p>
          <a href="https://calendly.com" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', background: '#fff', color: '#4A6B54', fontWeight: 600, fontSize: 14, padding: '12px 24px', borderRadius: 10, textDecoration: 'none' }}>
            Réserver un appel de 30 min →
          </a>
        </div>

      </div>
    </div>
  )
}
