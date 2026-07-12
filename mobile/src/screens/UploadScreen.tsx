import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

export default function UploadScreen({ navigation }: Props) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const pickAndUpload = async () => {
    if (!userId) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow media library access to pick a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setBusy(true);
    try {
      setStatus('Reading video…');
      const name = asset.fileName ?? `clip-${Date.now()}.mp4`;
      const ext = (name.split('.').pop() || 'mp4').toLowerCase();
      const contentType = asset.mimeType ?? 'video/mp4';
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Read the local file as base64, then to bytes for the Storage upload.
      const base64 = await new File(asset.uri).base64();
      const bytes = decode(base64);

      setStatus('Uploading to Supabase…');
      const { error: upErr } = await supabase.storage
        .from('videos')
        .upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;

      setStatus('Queuing for analysis…');
      const { error: insErr } = await supabase.from('videos').insert({
        coach_id: userId,
        storage_path: path,
        original_filename: name,
        duration_seconds: asset.duration ? asset.duration / 1000 : null,
        status: 'uploaded',
      });
      if (insErr) throw insErr;

      setStatus('Done!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? String(e));
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>📹</Text>
        <Text style={styles.title}>Upload a match clip</Text>
        <Text style={styles.subtitle}>
          Pick a singles rally or match from your library. Keep it short (10–60s) for
          the fastest analysis while we tune the engine.
        </Text>
      </View>

      <Pressable style={styles.button} onPress={pickAndUpload} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={styles.buttonText}>Choose video</Text>
        )}
      </Pressable>

      {!!status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  emoji: { fontSize: 56 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: spacing.sm },
  subtitle: {
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  status: { color: colors.textDim, textAlign: 'center', marginTop: spacing.md },
});
