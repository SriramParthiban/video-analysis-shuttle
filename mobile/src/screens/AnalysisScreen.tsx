import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, spacing, statusColor } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;

type Analysis = {
  id: string;
  status: string;
  summary: string | null;
  metrics: any | null;
};

type Finding = {
  id: string;
  side: string | null;
  category: string;
  kind: string;
  severity: number | null;
  title: string;
  detail: string | null;
};

export default function AnalysisScreen({ route }: Props) {
  const { videoId } = route.params;
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const { data: video } = await supabase
      .from('videos')
      .select('status')
      .eq('id', videoId)
      .single();
    if (video) setVideoStatus(video.status);

    const { data: a } = await supabase
      .from('analyses')
      .select('id, status, summary, metrics')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setAnalysis(a as Analysis | null);
    if (a) {
      const { data: f } = await supabase
        .from('findings')
        .select('id, side, category, kind, severity, title, detail')
        .eq('analysis_id', a.id)
        .order('severity', { ascending: false });
      setFindings((f as Finding[]) ?? []);
    }
    setLoading(false);
  }, [videoId]);

  useEffect(() => {
    fetchAll();
    // Refresh live while the worker is processing this clip.
    const channel = supabase
      .channel(`analysis-${videoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` },
        () => fetchAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analyses', filter: `video_id=eq.${videoId}` },
        () => fetchAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, fetchAll]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const inProgress =
    videoStatus === 'uploaded' ||
    videoStatus === 'queued' ||
    videoStatus === 'processing' ||
    analysis?.status === 'processing';

  if (inProgress || !analysis) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.processing}>Analyzing match…</Text>
        <Text style={styles.processingDim}>
          The worker is extracting movement and building the report. This updates live.
        </Text>
      </View>
    );
  }

  if (analysis.status === 'failed') {
    return (
      <View style={styles.center}>
        <Text style={styles.failTitle}>Analysis failed</Text>
        <Text style={styles.processingDim}>Check the worker logs and try re-uploading.</Text>
      </View>
    );
  }

  const players = analysis.metrics?.players ?? {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {/* Summary */}
      <Text style={styles.sectionLabel}>SUMMARY</Text>
      <View style={styles.card}>
        <Text style={styles.summary}>{analysis.summary || 'No summary produced.'}</Text>
      </View>

      {/* Metrics per side */}
      {Object.keys(players).length > 0 && (
        <>
          <Text style={styles.sectionLabel}>COURT COVERAGE</Text>
          <View style={styles.metricsRow}>
            {Object.entries(players).map(([side, m]: [string, any]) => (
              <View key={side} style={[styles.card, styles.metricCard]}>
                <Text style={styles.metricSide}>{side} side</Text>
                <Metric label="Recovery" value={`${m.avg_recovery_time_s ?? '—'}s`} />
                <Metric label="Distance" value={`${m.total_distance_m ?? '—'} m`} />
                {m.lateral_balance_pct && (
                  <Metric
                    label="L / R"
                    value={`${m.lateral_balance_pct.left}% / ${m.lateral_balance_pct.right}%`}
                  />
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Findings */}
      <Text style={styles.sectionLabel}>FINDINGS</Text>
      {findings.map((f) => (
        <View key={f.id} style={styles.card}>
          <View style={styles.findingHeader}>
            <Text style={styles.findingTitle}>{f.title}</Text>
            <View
              style={[
                styles.kindBadge,
                { backgroundColor: f.kind === 'strength' ? colors.ok : colors.danger },
              ]}
            >
              <Text style={styles.kindText}>{f.kind}</Text>
            </View>
          </View>
          <Text style={styles.findingMeta}>
            {f.side ? `${f.side} • ` : ''}
            {f.category}
            {f.severity ? ` • severity ${f.severity}/5` : ''}
          </Text>
          {!!f.detail && <Text style={styles.findingDetail}>{f.detail}</Text>}
        </View>
      ))}
      {findings.length === 0 && (
        <Text style={styles.processingDim}>No specific findings recorded.</Text>
      )}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricLine}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  processing: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  processingDim: { color: colors.textDim, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  failTitle: { color: colors.danger, fontSize: 18, fontWeight: '700' },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  summary: { color: colors.text, fontSize: 15, lineHeight: 22 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  metricCard: { flex: 1 },
  metricSide: { color: colors.text, fontWeight: '700', textTransform: 'capitalize', marginBottom: spacing.sm },
  metricLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  metricLabel: { color: colors.textDim, fontSize: 13 },
  metricValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  findingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  findingTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1, paddingRight: spacing.sm },
  kindBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  kindText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  findingMeta: { color: colors.textDim, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  findingDetail: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
});
