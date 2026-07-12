import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { colors, spacing, statusColor } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type VideoRow = {
  id: string;
  original_filename: string | null;
  status: string;
  created_at: string;
};

export default function HomeScreen({ navigation }: Props) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = useCallback(async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('id, original_filename, status, created_at')
      .order('created_at', { ascending: false });
    if (!error && data) setVideos(data as VideoRow[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchVideos();
    if (!userId) return;
    // Live status updates as the worker processes each clip.
    const channel = supabase
      .channel('home-videos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos', filter: `coach_id=eq.${userId}` },
        () => fetchVideos(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchVideos]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => supabase.auth.signOut()} hitSlop={10}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign out</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const renderItem = ({ item }: { item: VideoRow }) => (
    <Pressable
      style={styles.card}
      onPress={() =>
        navigation.navigate('Analysis', {
          videoId: item.id,
          title: item.original_filename ?? 'Analysis',
        })
      }
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.original_filename ?? 'Untitled clip'}
        </Text>
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: statusColor[item.status] ?? colors.textDim }]}>
        <Text style={styles.badgeText}>{item.status}</Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchVideos();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>No clips yet.</Text>
            <Text style={styles.emptyDim}>Tap “+ New analysis” to upload a match.</Text>
          </View>
        }
      />
      <Pressable style={styles.fab} onPress={() => navigation.navigate('Upload')}>
        <Text style={styles.fabText}>+ New analysis</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cardDate: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  empty: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptyDim: { color: colors.textDim, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  fabText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
});
