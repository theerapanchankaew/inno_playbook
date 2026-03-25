'use client';

import { useEffect, useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
} from 'recharts';
import { calcIHI, getHealthTrend, IHIResult, IHISnapshot } from '@/lib/healthIndex';

interface HealthIndexCardProps {
  orgId: string;
  data: Record<string, string>;
  compact?: boolean;
}

export default function HealthIndexCard({ orgId, data, compact = false }: HealthIndexCardProps) {
  const [ihi, setIhi] = useState<IHIResult | null>(null);
  const [trend, setTrend] = useState<IHISnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<'radar' | 'trend'>('radar');

  useEffect(() => {
    const result = calcIHI(data);
    setIhi(result);
  }, [data]);

  useEffect(() => {
    if (!orgId) return;
    getHealthTrend(orgId, 14).then(setTrend);
  }, [orgId]);

  if (!ihi) return null;

  const radarData = ihi.dimensions.map((d) => ({
    subject: d.icon + ' ' + d.name.split(' ')[0],
    fullName: d.name,
    score: d.score,
    fullMark: 100,
  }));

  const trendData = trend.map((s) => ({
    date: s.date.slice(5), // MM-DD
    score: s.overall,
  }));

  if (compact) {
    return (
      <div className="ihi-compact">
        <div className="ihi-compact-score" style={{ color: ihi.gradeColor }}>
          <span className="ihi-compact-num">{ihi.overall}</span>
          <span className="ihi-compact-grade" style={{ background: ihi.gradeColor }}>{ihi.grade}</span>
        </div>
        <div className="ihi-compact-bars">
          {ihi.dimensions.map((d) => (
            <div key={d.key} className="ihi-dim-mini" title={`${d.name}: ${d.score}%`}>
              <div className="ihi-dim-mini-fill" style={{ width: `${d.score}%`, background: d.color }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ihi-card">
      {/* Header */}
      <div className="ihi-header">
        <div>
          <div className="ihi-title">Innovation Health Index</div>
          <div className="ihi-subtitle">ISO 56001 Capability Assessment</div>
        </div>
        <div className="ihi-overall-badge" style={{ borderColor: ihi.gradeColor }}>
          <div className="ihi-overall-score" style={{ color: ihi.gradeColor }}>{ihi.overall}</div>
          <div className="ihi-grade-pill" style={{ background: ihi.gradeColor }}>{ihi.grade}</div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="ihi-interpretation" style={{ borderLeftColor: ihi.gradeColor }}>
        {ihi.interpretation}
      </div>

      {/* Tabs */}
      <div className="ihi-tabs">
        <button
          className={`ihi-tab ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveTab('radar')}
        >
          📡 Capability Radar
        </button>
        <button
          className={`ihi-tab ${activeTab === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveTab('trend')}
        >
          📈 30-Day Trend
        </button>
      </div>

      {activeTab === 'radar' && (
        <div className="ihi-radar-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: '#64748B', fontFamily: 'var(--mono)' }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#0B7B74"
                fill="#0B7B74"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Dimension breakdown */}
          <div className="ihi-dims">
            {ihi.dimensions.map((d) => (
              <div key={d.key} className="ihi-dim-row">
                <span className="ihi-dim-icon">{d.icon}</span>
                <span className="ihi-dim-name">{d.name}</span>
                <div className="ihi-dim-bar">
                  <div
                    className="ihi-dim-fill"
                    style={{ width: `${d.score}%`, background: d.color }}
                  />
                </div>
                <span className="ihi-dim-pct" style={{ color: d.color }}>{d.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trend' && (
        <div className="ihi-trend-wrap">
          {trendData.length < 2 ? (
            <div className="ihi-trend-empty">
              <div className="ihi-trend-empty-icon">📊</div>
              <div>Trend data will appear as you save progress over time</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                <Tooltip
                  formatter={(v) => [`${v}`, 'IHI Score']}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #CBD5E1' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#0B7B74"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0B7B74' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="ihi-trend-note">
            Snapshots saved automatically each session. Higher score = stronger innovation capability.
          </div>
        </div>
      )}
    </div>
  );
}
