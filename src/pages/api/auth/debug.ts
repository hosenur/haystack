import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Log all the information
  const debugInfo = {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      cookie: req.headers.cookie,
      referer: req.headers.referer,
    },
    cookies: req.cookies,
  };

  console.log("=== AUTH DEBUG INFO ===");
  console.log(JSON.stringify(debugInfo, null, 2));
  console.log("======================");

  return res.status(200).json(debugInfo);
}
