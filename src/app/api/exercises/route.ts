import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Cache for 1 hour
export const revalidate = 3600

/**
 * GET /api/exercises
 * 
 * Fetches exercises with optional field selection for optimized payloads.
 * 
 * Query params:
 * - fields: 'minimal' | 'full' | 'llm' | 'validation' (default: 'minimal')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fields = searchParams.get('fields') || 'minimal'
    
    // Define field sets based on use case
    const fieldSets: Record<string, string> = {
      // For UI grid display (no heavy fields)
      minimal: 'exercise_id, name, category, difficulty_level, image_url',
      
      // For exercise detail modal
      full: '*',
      
      // For LLM program generation
      llm: 'exercise_id, name, category, muscle_groups, difficulty_level, equipment_needed',
      
      // For validation only
      validation: 'exercise_id'
    }
    
    const selectFields = fieldSets[fields] || fieldSets.minimal
    
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .select(selectFields)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching exercises:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data, {
      headers: {
        // Cache at CDN edge for 1 hour, serve stale for 24 hours while revalidating
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    })
  } catch (error: any) {
    console.error('Error in exercises API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
