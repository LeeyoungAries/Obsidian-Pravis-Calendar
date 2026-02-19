export function parseWikiLinks(text: string): string[] {
  const matches = text.matchAll(/\[\[([^\]#|]+)(?:[#|][^\]]*)?\]\]/g);
  return [...new Set([...matches].map((m) => m[1].trim()))];
}
