import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTargetingSpec, mapPlacements } from '../metaTargeting.js';

test('mapPlacements: feed → fb feed + ig stream', () => {
  const m = mapPlacements(['feed']);
  assert.deepEqual(m.publisher_platforms, ['facebook', 'instagram']);
  assert.deepEqual(m.facebook_positions, ['feed']);
  assert.deepEqual(m.instagram_positions, ['stream']);
});

test('mapPlacements: explore → ig만', () => {
  const m = mapPlacements(['explore']);
  assert.deepEqual(m.publisher_platforms, ['instagram']);
  assert.deepEqual(m.instagram_positions, ['explore']);
  assert.equal(m.facebook_positions, undefined);
});

test('mapPlacements: audience_network', () => {
  const m = mapPlacements(['audience_network']);
  assert.deepEqual(m.publisher_platforms, ['audience_network']);
  assert.deepEqual(m.audience_network_positions, ['classic']);
});

test('mapPlacements: 알 수 없는 id 무시, 빈 입력 = 빈 객체', () => {
  assert.deepEqual(mapPlacements(['nope']), {});
  assert.deepEqual(mapPlacements([]), {});
});

test('buildTargetingSpec: 지역 없으면 시장 국가 폴백 + 기본 연령/자동확장 off', () => {
  const t = buildTargetingSpec({}, { fallbackCountries: ['TH'] });
  assert.deepEqual(t.geo_locations, { countries: ['TH'] });
  assert.equal(t.age_min, 25);
  assert.equal(t.age_max, 45);
  assert.deepEqual(t.targeting_automation, { advantage_audience: 0 });
  assert.equal(t.genders, undefined);
  assert.equal(t.flexible_spec, undefined);
});

test('buildTargetingSpec: 도시 geo → cities(반경), 국가 폴백 안 함', () => {
  const t = buildTargetingSpec(
    { geos: [{ type: 'city', key: '1234', name: '방콕', radius: 20 }] },
    { fallbackCountries: ['TH'] },
  );
  assert.deepEqual(t.geo_locations, { cities: [{ key: '1234', radius: 20, distance_unit: 'kilometer' }] });
});

test('buildTargetingSpec: 도시 반경 기본 17km', () => {
  const t = buildTargetingSpec({ geos: [{ type: 'city', key: 'c1', name: 'x' }] }, { fallbackCountries: ['VN'] });
  assert.deepEqual(t.geo_locations, { cities: [{ key: 'c1', radius: 17, distance_unit: 'kilometer' }] });
});

test('buildTargetingSpec: 국가+지역 혼합', () => {
  const t = buildTargetingSpec(
    { geos: [{ type: 'country', key: 'US', name: 'United States' }, { type: 'region', key: 'r9', name: 'California' }] },
    { fallbackCountries: ['KR'] },
  );
  assert.deepEqual(t.geo_locations, { countries: ['US'], regions: [{ key: 'r9' }] });
});

test('buildTargetingSpec: 레거시 문자열 지역은 key 없어 폴백', () => {
  const t = buildTargetingSpec({ geos: ['방콕'] }, { fallbackCountries: ['TH'] });
  assert.deepEqual(t.geo_locations, { countries: ['TH'] });
});

test('buildTargetingSpec: 성별 1개만 지정, 2개면 전체(미지정)', () => {
  assert.deepEqual(buildTargetingSpec({ genders: ['female'] }, { fallbackCountries: ['KR'] }).genders, [2]);
  assert.deepEqual(buildTargetingSpec({ genders: ['male'] }, { fallbackCountries: ['KR'] }).genders, [1]);
  assert.equal(buildTargetingSpec({ genders: ['female', 'male'] }, { fallbackCountries: ['KR'] }).genders, undefined);
});

test('buildTargetingSpec: 관심사 id → flexible_spec, id 없는 건 제외', () => {
  const t = buildTargetingSpec(
    { interests: [{ id: '6003', name: '육아' }, { name: '키성장' }] },
    { fallbackCountries: ['KR'] },
  );
  assert.deepEqual(t.flexible_spec, [{ interests: [{ id: '6003', name: '육아' }] }]);
});

test('buildTargetingSpec: 노출위치 병합', () => {
  const t = buildTargetingSpec({}, { fallbackCountries: ['KR'], placements: ['reels'] });
  assert.deepEqual(t.publisher_platforms, ['facebook', 'instagram']);
  assert.deepEqual(t.facebook_positions, ['facebook_reels']);
  assert.deepEqual(t.instagram_positions, ['reels']);
});

test('buildTargetingSpec: 맞춤/제외 타겟(리타게팅) → custom_audiences', () => {
  const t = buildTargetingSpec(
    { customAudiences: [{ id: 'a1', name: '방문자' }], excludedAudiences: [{ id: 'b2', name: '기존고객' }] },
    { fallbackCountries: ['KR'] },
  );
  assert.deepEqual(t.custom_audiences, [{ id: 'a1' }]);
  assert.deepEqual(t.excluded_custom_audiences, [{ id: 'b2' }]);
});

test('buildTargetingSpec: 맞춤 타겟 id 문자열도 허용, 빈 건 미포함', () => {
  const t = buildTargetingSpec({ customAudiences: ['x9'] }, { fallbackCountries: ['KR'] });
  assert.deepEqual(t.custom_audiences, [{ id: 'x9' }]);
  assert.equal(buildTargetingSpec({ customAudiences: [] }, { fallbackCountries: ['KR'] }).custom_audiences, undefined);
});
