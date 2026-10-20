import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildZip, crc32, uniqueName } from '../../src/shared/utils/zip.ts';

const bytes = (s) => new TextEncoder().encode(s);
const u32 = (z, at) => new DataView(z.buffer, z.byteOffset, z.byteLength).getUint32(at, true);
const u16 = (z, at) => new DataView(z.buffer, z.byteOffset, z.byteLength).getUint16(at, true);

test('crc32: 표준 검증 벡터', () => {
  assert.equal(crc32(bytes('123456789')), 0xcbf43926);
  assert.equal(crc32(bytes('')), 0);
  assert.equal(crc32(bytes('a')), 0xe8b7be43);
});

test('로컬 헤더 + 중앙 디렉터리 + EOCD 구조', () => {
  const a = bytes('hello');
  const b = bytes('world!!');
  const z = buildZip([
    { name: 'a.txt', data: a },
    { name: 'b.txt', data: b },
  ]);

  assert.equal(u32(z, 0), 0x04034b50); // 첫 로컬 헤더
  assert.equal(u16(z, 8), 0); // method = store
  assert.equal(u32(z, 14), crc32(a));
  assert.equal(u32(z, 18), a.length); // compressed == uncompressed
  assert.equal(u32(z, 22), a.length);

  // EOCD 는 마지막 22바이트
  const eocd = z.length - 22;
  assert.equal(u32(z, eocd), 0x06054b50);
  assert.equal(u16(z, eocd + 8), 2); // 엔트리 수
  assert.equal(u16(z, eocd + 10), 2);
  const cdOffset = u32(z, eocd + 16);
  const cdSize = u32(z, eocd + 12);
  assert.equal(cdOffset + cdSize, eocd); // 중앙 디렉터리가 EOCD 직전에서 끝난다
  assert.equal(u32(z, cdOffset), 0x02014b50);

  // 중앙 디렉터리의 두 번째 항목이 가리키는 오프셋에 실제로 로컬 헤더가 있다
  const second = cdOffset + 46 + 'a.txt'.length;
  assert.equal(u32(z, second), 0x02014b50);
  assert.equal(u32(z, u32(z, second + 42)), 0x04034b50);
});

test('비ASCII 파일명: UTF-8 플래그(bit 11) + UTF-8 바이트', () => {
  const name = '사전문진 ไทย.pdf';
  const z = buildZip([{ name, data: bytes('x') }]);
  assert.equal(u16(z, 6) & 0x0800, 0x0800); // 로컬 헤더 플래그
  const encoded = new TextEncoder().encode(name);
  assert.equal(u16(z, 26), encoded.length); // 바이트 길이(글자 수 아님)
  assert.deepEqual(z.slice(30, 30 + encoded.length), encoded);
});

test('빈 zip 도 유효하다', () => {
  const z = buildZip([]);
  assert.equal(z.length, 22);
  assert.equal(u32(z, 0), 0x06054b50);
  assert.equal(u16(z, 8), 0);
});

test('1980 이전 날짜는 터지지 않고 1980-01-01 로 눕는다', () => {
  const z = buildZip([{ name: 'a', data: bytes('x') }], new Date('1970-01-01T00:00:00Z'));
  assert.equal(u16(z, 10), 0); // time
  assert.equal(u16(z, 12), (1 << 5) | 1); // 1980-01-01
});

test('중복 파일명은 뒤에 번호를 붙여 보존한다', () => {
  const used = new Set();
  assert.equal(uniqueName('x-ray.png', used), 'x-ray.png');
  assert.equal(uniqueName('x-ray.png', used), 'x-ray (2).png');
  assert.equal(uniqueName('x-ray.png', used), 'x-ray (3).png');
  assert.equal(uniqueName('noext', used), 'noext');
  assert.equal(uniqueName('noext', used), 'noext (2)');
});
