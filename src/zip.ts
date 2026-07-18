// Minimal client-side ZIP writer (STORE method only, no compression).
// JPGs are already compressed, so storing them uncompressed keeps this
// dependency-free while producing archives every extractor can open.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const MAX_ZIP32 = 0xFFFFFFFF;

function dosDateTime(date: Date): { time: number, date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

// File data is kept as individual Blob parts rather than copied into one big
// buffer, so browsers can spill it to disk — this is what lets a phone zip
// hundreds of megabytes of images without running out of memory.
export class ZipWriter {
  private parts: Array<BlobPart> = [];
  private central: Array<Uint8Array> = [];
  private offset = 0;
  private fileCount = 0;

  addFile(name: string, data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    const crc = crc32(bytes);
    const nameBytes = new TextEncoder().encode(name);
    const { time, date } = dosDateTime(new Date());

    if (this.offset + 30 + nameBytes.length + bytes.length > MAX_ZIP32) {
      throw new Error('Archive too large (over 4GB)');
    }

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034B50, true);  // local file header signature
    lv.setUint16(4, 20, true);          // version needed to extract
    lv.setUint16(6, 0x0800, true);      // flags: UTF-8 filenames
    lv.setUint16(8, 0, true);           // method: STORE
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, bytes.length, true); // compressed size (= uncompressed for STORE)
    lv.setUint32(22, bytes.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);          // extra field length
    local.set(nameBytes, 30);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014B50, true);  // central directory signature
    cv.setUint16(4, 20, true);          // version made by
    cv.setUint16(6, 20, true);          // version needed
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, bytes.length, true);
    cv.setUint32(24, bytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    // extra/comment lengths, disk number, internal/external attrs: all zero
    cv.setUint32(42, this.offset, true); // offset of local header
    cd.set(nameBytes, 46);

    this.parts.push(local, new Blob([bytes]));
    this.central.push(cd);
    this.offset += local.length + bytes.length;
    this.fileCount++;
  }

  finish(): Blob {
    const cdOffset = this.offset;
    let cdSize = 0;
    for (const record of this.central) {
      this.parts.push(record);
      cdSize += record.length;
    }

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);  // end of central directory signature
    ev.setUint16(8, this.fileCount, true);  // entries on this disk
    ev.setUint16(10, this.fileCount, true); // entries total
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdOffset, true);
    this.parts.push(eocd);

    return new Blob(this.parts, { type: 'application/zip' });
  }
}

export interface ZipResult {
  blob: Blob;
  failed: Array<string>;
}

// Fetches each URL sequentially (only one file's buffer in memory at a time)
// and zips them. Files that fail to fetch are skipped and reported in
// `failed`; the whole operation only rejects if every file failed.
export async function zipUrls(
  urls: Array<string>,
  entryName: (url: string) => string,
  onProgress: (done: number, total: number) => void,
): Promise<ZipResult> {
  const writer = new ZipWriter();
  const failed: Array<string> = [];
  const usedNames = new Set<string>();
  let added = 0;

  onProgress(0, urls.length);
  for (let i = 0; i < urls.length; i++) {
    let name = entryName(urls[i]);
    try {
      const rsp = await fetch(urls[i]);
      if (rsp.status !== 200) throw new Error('HTTP ' + rsp.status);
      const data = await rsp.arrayBuffer();
      // Avoid duplicate entry names, which confuse extractors
      let unique = name;
      for (let suffix = 2; usedNames.has(unique); suffix++) {
        const dot = name.lastIndexOf('.');
        unique = dot > 0 ? name.substring(0, dot) + '-' + suffix + name.substring(dot) : name + '-' + suffix;
      }
      usedNames.add(unique);
      writer.addFile(unique, data);
      added++;
    } catch (err) {
      console.log('Error fetching ' + urls[i], err);
      failed.push(name);
    }
    onProgress(i + 1, urls.length);
  }

  if (added === 0) {
    throw new Error('Could not download any files');
  }
  return { blob: writer.finish(), failed };
}
