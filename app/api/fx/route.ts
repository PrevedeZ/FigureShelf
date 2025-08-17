// Fetch daily EUR base rates from ECB (XML) and return JSON with the 4 we need.
export const revalidate = 60 * 60; // cache 1h on the server

export async function GET() {
  try {
    const res = await fetch(
      "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
      { next: { revalidate } }
    );
    const xml = await res.text();

    // Example tags: <Cube time='2025-08-15'> <Cube currency='USD' rate='1.0884'/>
    const dateMatch = xml.match(/Cube\s+time=['"]([\d-]+)['"]/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10);

    const map: Record<string, number> = { EUR: 1 };
    const regex = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g;
    for (const m of xml.matchAll(regex)) {
      const ccy = m[1];
      const rate = parseFloat(m[2]); // 1 EUR = rate [ccy]
      map[ccy] = rate;
    }

    // Only return what the app uses
    const rates = {
      EUR: 1,
      USD: map.USD ?? 1.09,
      GBP: map.GBP ?? 0.84,
      JPY: map.JPY ?? 169,
    };

    return new Response(JSON.stringify({ date, rates }), {
      headers: { "content-type": "application/json" },
    });
  } catch {
    // Fallback if ECB fails
    return new Response(
      JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        rates: { EUR: 1, USD: 1.09, GBP: 0.84, JPY: 169 },
      }),
      { headers: { "content-type": "application/json" } }
    );
  }
}
