import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { main_url, competitor_url, sector, email } = body

    // Validation
    if (!main_url || !email || !sector) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    // Vérification basique de l'URL
    try {
      new URL(main_url)
    } catch {
      return NextResponse.json(
        { error: 'URL principale invalide' },
        { status: 400 }
      )
    }

    // Créer l'enregistrement en base
    const { data: audit, error: dbError } = await supabaseAdmin
      .from('audits')
      .insert({
        email,
        sector,
        main_url,
        competitor_url: competitor_url || null,
        status: 'pending',
        current_step: 'Initialisation de l\'audit...',
        progress: 0,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })
      .select('id')
      .single()

    if (dbError || !audit) {
      console.error('Erreur Supabase:', dbError)
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'audit' },
        { status: 500 }
      )
    }

    // Déclencher l'audit en arrière-plan (non-blocking)
    // On utilise fetch vers notre propre endpoint pour ne pas bloquer la réponse
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    fetch(`${appUrl}/api/run-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: audit.id }),
    }).catch(err => {
      console.error('Erreur déclenchement audit:', err)
    })

    return NextResponse.json({ audit_id: audit.id })

  } catch (error) {
    console.error('Erreur start-audit:', error)
    return NextResponse.json(
      { error: 'Erreur serveur inattendue' },
      { status: 500 }
    )
  }
}
