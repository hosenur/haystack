// Direct Firecrawl v2 API client to avoid SDK's zod v3 dependency issues with Turbopack

type Format = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'summary' | 'images';

interface ScrapeOptions {
  formats?: Format[];
}

interface ScrapeResult {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
  summary?: string;
  images?: string[];
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
    [key: string]: unknown;
  };
}

class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v2';

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
  }

  async scrape(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: options.formats || ['markdown'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data as ScrapeResult;
  }
}

export const firecrawl = new FirecrawlClient({ 
  apiKey: process.env.FIRECRAWL_API_KEY || '' 
});
