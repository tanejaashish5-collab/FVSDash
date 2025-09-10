
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Replace with your actual Base ID and Table ID
    const baseId = "apptzuMZiEFsfweDU";
    const tableId = "tblb4rePoqPFU5xTl";

    // Make sure AIRTABLE_PAT is set in your environment variables
    const apiKey = process.env.AIRTABLE_PAT;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing AIRTABLE_PAT in environment variables" });
    }

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=1`;

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    const data = await r.json();

    // Return Airtable's raw response so we can see exactly what comes back
    res.status(200).json(data);

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
