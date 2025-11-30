
// api/extract.js
// Vercel serverless (Node 18+). Uses native fetch.

export default async function handler(req, res) {
  // Allow simple CORS for testing
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: false, message: "Method not allowed, use POST" });
  }

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ status: false, message: "Missing or invalid 'url' in body" });
    }

    // Allow override via environment variable, fallback to chosen working endpoint
    const API_ENDPOINT = process.env.API_ENDPOINT || "https://teraboxdl.tixte.co/extract";

    // Build payload for the upstream extractor
    const payload = { url };

    const upstreamRes = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // optional: timeout or other fetch options could go here
    });

    // handle non-JSON / non-2xx responses
    const text = await upstreamRes.text();
    let upstreamData = null;
    try {
      upstreamData = text ? JSON.parse(text) : null;
    } catch (e) {
      // upstream returned non-json
      return res.status(502).json({ status: false, message: "Upstream returned invalid JSON", upstreamText: text });
    }

    if (!upstreamRes.ok) {
      return res.status(502).json({ status: false, message: "Upstream error", code: upstreamRes.status, raw: upstreamData });
    }

    // Normalize response format for the client
    // Many extractors return direct fields or nested structures; adapt common patterns
    const normalized = {
      status: upstreamData.status !== undefined ? upstreamData.status : true,
      name: upstreamData.name || upstreamData.title || upstreamData.filename || upstreamData.file_name || "unknown",
      size: upstreamData.size || upstreamData.size_formatted || upstreamData.file_size || "",
      thumbnail: upstreamData.thumbnail || upstreamData.cover || null,
      streams: [],
      files: upstreamData.files || upstreamData.list || null,
      raw: upstreamData
    };

    // Attempt to extract streams/download urls from common keys
    if (Array.isArray(upstreamData.streams) && upstreamData.streams.length) {
      normalized.streams = upstreamData.streams.map(s => ({
        quality: s.quality || s.label || s.name || null,
        url: s.url || s.play_url || s.playback || s.src || s.fast_stream_url || null,
        raw: s
      })).filter(s => s.url);
    } else if (Array.isArray(upstreamData.playlist) && upstreamData.playlist.length) {
      normalized.streams = upstreamData.playlist.map(s => ({
        quality: s.quality || s.label || null,
        url: s.url || s.src || null,
        raw: s
      })).filter(s => s.url);
    } else if (upstreamData.fast_stream_url) {
      normalized.streams = [{ quality: "direct", url: upstreamData.fast_stream_url, raw: upstreamData }];
    } else if (upstreamData.download_url || upstreamData.url) {
      normalized.streams = [{ quality: "direct", url: upstreamData.download_url || upstreamData.url, raw: upstreamData }];
    }

    return res.status(200).json(normalized);

  } catch (err) {
    console.error("extract error:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
}
