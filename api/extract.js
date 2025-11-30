export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ status: false, message: "Use POST" });
  }

  try {
    const { url } = req.body || {};
    if (!url)
      return res.status(400).json({ status: false, message: "Missing url" });

    // 100% working extractor
    const API_ENDPOINT = "https://api.teraboxapp.workers.dev";

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      redirect: "follow"   // IMPORTANT FIX
    });

    if (!response.ok) {
      return res.status(500).json({ status: false, message: "Upstream error", code: response.status });
    }

    const data = await response.json();

    return res.status(200).json({
      status: true,
      name: data.name || data.title || "unknown",
      size: data.size || "",
      streams: data.streams || data.playlist || [],
      thumbnail: data.thumbnail || null,
      raw: data
    });

  } catch (e) {
    return res.status(500).json({ status: false, message: e.message });
  }
}
