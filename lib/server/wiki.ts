export interface WikiSummary {
  intro: string | null
  image_url: string | null
  common_name: string | null
  url: string | null
}

export async function fetchWikiSummary(scientificName: string): Promise<WikiSummary | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName.replace(/ /g, "_"))}`,
      { headers: { accept: "application/json" }, next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const j = await res.json()
    return {
      intro: j.extract ?? null,
      image_url: j.thumbnail?.source ?? null,
      common_name: j.title && j.title !== scientificName ? j.title : null,
      url: j.content_urls?.desktop?.page ?? null,
    }
  } catch {
    return null
  }
}
