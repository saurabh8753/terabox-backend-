import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed, use POST" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ status: false, message: "Missing URL" });
  }

  const API_ENDPOINT = process.env.API_ENDPOINT;
  const API_TOKEN = process.env.API_TOKEN;

  try {
    const upstream = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        token: API_TOKEN,
        t: Math.floor(Date.now() / 1000)
      })
    });

    const data = await upstream.json();

    return res.status(200).json({
      status: true,
      name: data.name || data.title || "unknown",
      size: data.size || "",
      streams: data.streams || data.playlist || [],
      raw: data
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message
    });
  }
}
