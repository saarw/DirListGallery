import { crc32, ZipWriter } from './zip';

test('crc32 known vectors', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926);
  expect(crc32(new Uint8Array(0))).toBe(0x00000000);
});

test('zip structure of two stored files', async () => {
  const fileA = new TextEncoder().encode('hello world');
  const fileB = new TextEncoder().encode('second file content');
  const writer = new ZipWriter();
  writer.addFile('a.txt', fileA.buffer);
  writer.addFile('b space.txt', fileB.buffer);
  const blob = writer.finish();

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);

  // Starts with a local file header (PK\x03\x04)
  expect(view.getUint32(0, true)).toBe(0x04034B50);

  // End of central directory record is the last 22 bytes (no comment)
  const eocd = bytes.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054B50);
  expect(view.getUint16(eocd + 8, true)).toBe(2);  // entries on this disk
  expect(view.getUint16(eocd + 10, true)).toBe(2); // entries total

  // Central directory position and size are consistent
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  expect(cdOffset + cdSize).toBe(eocd);
  expect(view.getUint32(cdOffset, true)).toBe(0x02014B50);

  // First central record points at the first local header, with correct
  // CRC, sizes, and STORE method
  expect(view.getUint32(cdOffset + 42, true)).toBe(0);
  expect(view.getUint16(cdOffset + 10, true)).toBe(0);
  expect(view.getUint32(cdOffset + 16, true)).toBe(crc32(fileA));
  expect(view.getUint32(cdOffset + 20, true)).toBe(fileA.length);
  expect(view.getUint32(cdOffset + 24, true)).toBe(fileA.length);

  // Second central record's local header offset points at a PK\x03\x04
  const secondRecord = cdOffset + 46 + 'a.txt'.length;
  expect(view.getUint32(secondRecord, true)).toBe(0x02014B50);
  const secondLocal = view.getUint32(secondRecord + 42, true);
  expect(view.getUint32(secondLocal, true)).toBe(0x04034B50);

  // Filenames present as UTF-8 bytes
  const text = new TextDecoder().decode(bytes);
  expect(text).toContain('a.txt');
  expect(text).toContain('b space.txt');

  // Stored file data is byte-for-byte intact after each local header
  const nameLenA = view.getUint16(26, true);
  const dataStartA = 30 + nameLenA;
  expect(new TextDecoder().decode(bytes.slice(dataStartA, dataStartA + fileA.length))).toBe('hello world');
});
