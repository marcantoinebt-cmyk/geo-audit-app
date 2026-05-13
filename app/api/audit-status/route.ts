import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, status, current_step, progress, error_message')
    .eq('id', id)
    .single()

  if (error || !audit) {
    return NextResponse.json({ error: 'Audit introuvable' }, { status: 404 })
  }

  return NextResponse.json(audit)
}
