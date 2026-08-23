export class CLIPTokenizer {
  private vocab: Map<string, number>;
  private merges: Map<string, number>;
  private cache: Map<string, string[]> = new Map();
  private static BYTE_ENCODER: Map<number, string> | null = null;
  private static SOT = 49406;
  private static EOT = 49407;
  private static PAD = 0;

  constructor(vocabJson: Record<string, number>, mergesText: string) {
    this.vocab = new Map(Object.entries(vocabJson));
    this.merges = new Map();
    const lines = mergesText.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#version')) continue;
      const parts = line.split(' ');
      if (parts.length === 2) {
        this.merges.set(parts[0] + ',' + parts[1], i - 1);
      }
    }
  }

  private static getByteEncoder(): Map<number, string> {
    if (CLIPTokenizer.BYTE_ENCODER) return CLIPTokenizer.BYTE_ENCODER;
    const bs: number[] = [
      ...Array.from({ length: 94 }, (_, i) => i + 33),
      ...Array.from({ length: 12 }, (_, i) => i + 161),
      ...Array.from({ length: 82 }, (_, i) => i + 174)
    ];
    const cs: number[] = [...bs];
    let n = 0;
    for (let b = 0; b < 256; b++) {
      if (!bs.includes(b)) {
        bs.push(b);
        cs.push(256 + n);
        n++;
      }
    }
    const encoder = new Map<number, string>();
    for (let i = 0; i < bs.length; i++) {
      encoder.set(bs[i], String.fromCharCode(cs[i]));
    }
    CLIPTokenizer.BYTE_ENCODER = encoder;
    return encoder;
  }

  private byteEncode(token: string): string {
    const encoder = CLIPTokenizer.getByteEncoder();
    const bytes = new TextEncoder().encode(token);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += encoder.get(bytes[i])!;
    }
    return out;
  }

  private bpe(word: string): string[] {
    if (this.cache.has(word)) return this.cache.get(word)!;
    const symbols = word.split('');
    if (symbols.length > 0) {
      symbols[symbols.length - 1] += '</w>';
    }
    let parts = symbols;
    if (parts.length < 2) {
      this.cache.set(word, parts);
      return parts;
    }
    while (true) {
      let bestRank = Infinity;
      let bestIdx = -1;
      for (let i = 0; i < parts.length - 1; i++) {
        const rank = this.merges.get(parts[i] + ',' + parts[i + 1]);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      parts = [
        ...parts.slice(0, bestIdx),
        parts[bestIdx] + parts[bestIdx + 1],
        ...parts.slice(bestIdx + 2)
      ];
    }
    this.cache.set(word, parts);
    return parts;
  }

  encode(text: string, maxLength: number = 77): Int32Array {
    const cleaned = text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
    const pattern = /'s|'t|'re|'ve|'m|'ll|'d|[^\W\d_]+|\d|[^\s\w]+/gu;
    const words = cleaned.match(pattern) || [];

    const ids: number[] = [CLIPTokenizer.SOT];
    for (const word of words) {
      const encoded = this.byteEncode(word);
      for (const piece of this.bpe(encoded)) {
        const id = this.vocab.get(piece);
        if (id !== undefined) ids.push(id);
      }
    }

    if (ids.length >= maxLength) {
      const trimmed = ids.slice(0, maxLength - 1);
      trimmed.push(CLIPTokenizer.EOT);
      return Int32Array.from(trimmed);
    }
    const padded = [...ids, CLIPTokenizer.EOT];
    while (padded.length < maxLength) padded.push(CLIPTokenizer.PAD);
    return Int32Array.from(padded);
  }
}
