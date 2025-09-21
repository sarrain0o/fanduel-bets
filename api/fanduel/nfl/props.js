// /api/fanduel/nfl/props.js — FanDuel NFL player props (per-event)
export default async function handler(req, res) {
  try {
    const ODDS_API_KEY = process.env.ODDS_API_KEY;
    if (!ODDS_API_KEY) return res.status(500).json({ error: "Missing ODDS_API_KEY env var" });

    const eventId = req.query.eventId;               // REQUIRED
    const markets = req.query.markets || "player_anytime_td"; // e.g. player_anytime_td, player_rush_yds, player_receptions, etc.

    if (!eventId) {
      return res.status(400).json({
        error: "Missing eventId",
        how_to_use: "First call /api/fanduel/nfl/events to pick an eventId, then call /api/fanduel/nfl/props?eventId=...&markets=player_anytime_td"
      });
    }

    const url = new URL(`https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/${eventId}/odds`);
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

    const data = await r.json(); // single-event payload
    const fanduel = (data.bookmakers || []).find(b => b.key === "fanduel");
    const flat = [];
    if (fanduel) {
      for (const m of fanduel.markets || []) {
        for (const o of m.outcomes || []) {
          flat.push({
            eventId,
            commence_time: data.commence_time,
            home_team: data.home_team,
            away_team: data.away_team,
            market: m.key,         // e.g., player_anytime_td
            participant: o.name,   // player
            price: o.price,        // American odds
            line: o.point ?? null  // prop line (if any)
          });
        }
      }
    }
    res.status(200).json(flat);
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown error" });
  }
}
