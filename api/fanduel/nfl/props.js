// /api/fanduel/nfl/props.js — FanDuel NFL player props
export default async function handler(req, res) {
  try {
    const ODDS_API_KEY = process.env.ODDS_API_KEY;
    if (!ODDS_API_KEY) return res.status(500).json({ error: "Missing ODDS_API_KEY env var" });

    const sport = "americanfootball_nfl";
    const markets =
      req.query.markets ||
      "player_rushing_yards,player_receiving_receptions,player_anytime_td";

    const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
    url.searchParams.set("apiKey", ODDS_API_KEY);
    url.searchParams.set("regions", "us");
    url.searchParams.set("oddsFormat", "american");
    url.searchParams.set("bookmakers", "fanduel");
    url.searchParams.set("markets", markets);

    const r = await fetch(url.toString());
    if (!r.ok) {
      const body = await r.text().catch(()=> "");
      return res.status(r.status).json({ error: `Upstream ${r.status}`, body });
    }

    const data = await r.json();
    const flat = [];
    for (const g of data) {
      const bm = (g.bookmakers || []).find(b => b.key === "fanduel");
      if (!bm) continue;
      for (const m of bm.markets || []) {
        for (const o of m.outcomes || []) {
          flat.push({
            commence_time: g.commence_time,
            home_team: g.home_team,
            away_team: g.away_team,
            market: m.key,          // e.g., player_rushing_yards
            participant: o.name,    // player
            price: o.price,         // odds
            line: o.point ?? null   // prop line (e.g., 62.5)
          });
        }
      }
    }
    res.status(200).json(flat);
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown error" });
  }
}
