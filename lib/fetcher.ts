// lib/fetcher.ts
export const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Error fetching ${url}: ${res.statusText}`)
    return res.json()
  })
