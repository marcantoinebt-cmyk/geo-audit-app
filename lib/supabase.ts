import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client public (côté navigateur)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin (côté serveur uniquement - avec service role)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type AuditStatus = 'pending' | 'running' | 'completed' | 'error'

export interface Audit {
  id: string
  created_at: string
  email: string
  sector: string
  main_url: string
  competitor_url?: string
  status: AuditStatus
  current_step: string
  progress: number
  error_message?: string
  results?: AuditResults
}

export interface AuditResults {
  main: SiteAnalysis
  competitor?: SiteAnalysis
  scores: PillarScores
  findings: Finding[]
  actions: Action[]
  global_score: number
  competitor_score?: number
}

export interface SiteAnalysis {
  url: string
  pagespeed_mobile: number
  pagespeed_desktop: number
  lcp_mobile: number
  lcp_desktop: number
  has_schema: boolean
  schema_types: string[]
  h1_count_issues: number
  triple_h1_pages: number
  h2_as_questions_pct: number
  alt_total: number
  alt_missing: number
  alt_duplicate_pct: number
  has_faq: boolean
  has_key_facts: boolean
  robots_txt_ok: boolean
  sitemap_ok: boolean
  accessibility_score: number
  title_optimized: boolean
  meta_description_optimized: boolean
}

export interface PillarScores {
  lisibilite: number       // UX & Scannabilité /20
  structure: number        // Conteneurs LLM /20
  clarte: number          // Lisibilité LLM /20
  reponses: number        // SEO & Position zéro /10
  images: number          // Médias /10
  accessibilite: number   // Accessibilité /10
  vocabulaire: number     // Richesse sémantique /5
  credibilite: number     // Transparence & qualité /10
}

export interface Finding {
  type: 'critical' | 'warning' | 'good'
  title: string
  description: string
  pillar: string
}

export interface Action {
  num: number
  title: string
  impact: string
  effort: string
  priority: 'critical' | 'high' | 'medium'
  pillar: string
}
