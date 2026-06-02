// src/features/marketing/components/MarketingDashboard.tsx
import { Link } from 'react-router-dom';
import keywordsRaw from '../data/keywords.json';
import topicsRaw from '../data/topics.json';
import strategyIndexRaw from '../data/strategy-index.json';
import type { Keyword, Topic, StrategyDoc } from '../types';

const KEYWORDS = keywordsRaw as Keyword[];
const TOPICS = topicsRaw as Topic[];
const DOCS = strategyIndexRaw as StrategyDoc[];

const goldenTop = KEYWORDS.filter((k) => k.isGolden).sort((a, b) => b.totalSearch - a.totalSearch);
const newCount = TOPICS.filter((t) => t.status === 'new').length;

function Card({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-[#4A2D6B]">
      <div className="text-2xl font-bold text-[#4A2D6B]">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </Link>
  );
}

export function MarketingDashboard() {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold text-gray-800">마케팅 콘텐츠 허브</h1>
      <p className="mb-5 text-sm text-gray-500">연세새봄의원 / 187 성장클리닉</p>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card label="전략 문서" value={DOCS.length} to="/marketing/strategy" />
        <Card label="키워드" value={KEYWORDS.length} to="/marketing/keywords" />
        <Card label="골든 키워드" value={goldenTop.length} to="/marketing/keywords" />
        <Card label="주제" value={TOPICS.length} to="/marketing/topics" />
        <Card label="미발행" value={newCount} to="/marketing/topics" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-gray-700">⭐ 골든 키워드</h2>
        <ul className="space-y-1">
          {goldenTop.map((k) => (
            <li key={k.keyword} className="flex justify-between text-sm">
              <span className="text-gray-700">{k.keyword}</span>
              <span className="tabular-nums text-gray-500">{k.totalSearch.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
