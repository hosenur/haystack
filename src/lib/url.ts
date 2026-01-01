export function cleanUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    
    parsed.hash = "";
    
    const paramsToRemove = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref", "source", "mc_cid", "mc_eid"
    ];
    paramsToRemove.forEach(param => parsed.searchParams.delete(param));
    
    let cleanedUrl = parsed.toString();
    
    if (cleanedUrl.endsWith("/")) {
      cleanedUrl = cleanedUrl.slice(0, -1);
    }
    
    return cleanedUrl;
  } catch {
    return url;
  }
}
