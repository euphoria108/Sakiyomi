export interface ParsedFeed {
  title: string;
  items: ParsedItem[];
}

export interface ParsedItem {
  title: string;
  url: string;
  publishedAt: number;
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Sakiyomi/1.0' } });
  if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`);
  const text = await res.text();
  return parseFeed(text);
}

function parseFeed(xml: string): ParsedFeed {
  const isAtom = xml.includes('<feed');
  return isAtom ? parseAtom(xml) : parseRss(xml);
}

function getText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>(?:<\\!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
  return match ? match[1].trim() : '';
}

function getAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
  return match ? match[1] : '';
}

function parseRss(xml: string): ParsedFeed {
  const title = getText(xml, 'title');
  const itemsXml = xml.match(/<item[\s>]([\s\S]*?)<\/item>/g) ?? [];
  const items: ParsedItem[] = itemsXml.map((item) => {
    const pubDate = getText(item, 'pubDate');
    return {
      title: getText(item, 'title'),
      url: getText(item, 'link') || getAttr(item, 'link', 'href'),
      publishedAt: pubDate ? new Date(pubDate).getTime() : Date.now(),
    };
  }).filter((i) => i.title && i.url);
  return { title, items };
}

function parseAtom(xml: string): ParsedFeed {
  const title = getText(xml, 'title');
  const entriesXml = xml.match(/<entry[\s>]([\s\S]*?)<\/entry>/g) ?? [];
  const items: ParsedItem[] = entriesXml.map((entry) => {
    const updated = getText(entry, 'updated') || getText(entry, 'published');
    return {
      title: getText(entry, 'title'),
      url: getAttr(entry, 'link', 'href'),
      publishedAt: updated ? new Date(updated).getTime() : Date.now(),
    };
  }).filter((i) => i.title && i.url);
  return { title, items };
}
