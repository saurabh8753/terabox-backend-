// api/extract.js
// Backend-only Terabox extractor using WORKING API A

export default async function handler(req, res) {
  // simple CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ status: false, message: "Use POST method" });
  }

  try {
    const { url } = req.body || {};

    if (!url)
      return res.status(400).json({ status: false, message: "Missing url" });

    // 🔥 WORKING API A
    const API_ENDPOINT = process.env.API_ENDPOINT || "https://api.teraboxapp.workers.dev";

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    const upstream = await response.json();

    // normalize response
    const result = {
      status: upstream.status !== undefined ? upstream.status : true,
      name: upstream.name || upstream.title || "unknown",
      size: upstream.size || upstream.size_formatted || "",
      thumbnail: upstream.thumbnail || null,
      streams: upstream.streams || upstream.playlist || [],
      files: upstream.files || upstream.list || null,
      raw: upstream
    };

    return res.status(200).json(result);

  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
}
