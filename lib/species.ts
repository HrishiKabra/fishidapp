import { supabase } from "./supabase/client"

export interface Species {
  id: string
  common_name: string
  scientific_name: string
  image_url?: string
  habitat?: string
  distribution?: string
  max_length_cm?: string
  conservation_status?: string
  description?: string
  region?: string
}

export interface SpeciesQuery {
  search?: string
  region?: string
  habitat?: string
  status?: string
  page: number
  limit: number
}

export async function fetchSpecies(q: SpeciesQuery): Promise<{
  species: Species[]
  total: number
  totalPages: number
}> {
  let query = supabase.from("species").select("*", { count: "exact" })

  if (q.search) {
    const safe = q.search.replace(/[,()]/g, " ").trim()
    if (safe) query = query.or(`common_name.ilike.%${safe}%,scientific_name.ilike.%${safe}%`)
  }
  if (q.region && q.region !== "all") query = query.ilike("location", `%${q.region}%`)
  if (q.habitat && q.habitat !== "all") query = query.ilike("habitat", `%${q.habitat}%`)
  if (q.status && q.status !== "all") query = query.eq("iucn_status", q.status)

  const from = (q.page - 1) * q.limit
  const { data, count, error } = await query.order("common_name").range(from, from + q.limit - 1)
  if (error) throw new Error("Failed to load species. Please try again.")

  const total = count ?? 0
  return {
    species: (data ?? []).map((row: any) => ({
      id: row.id,
      scientific_name: row.scientific_name,
      common_name: row.common_name,
      image_url: row.image_url ?? undefined,
      habitat: row.habitat ?? undefined,
      distribution: row.location ?? undefined,
      max_length_cm: row.size ?? undefined,
      conservation_status: row.iucn_status ?? undefined,
      description: row.description ?? undefined,
      region: row.location ?? undefined,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / q.limit)),
  }
}
