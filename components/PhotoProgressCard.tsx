
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';

interface CheckInPhoto {
  id: string;
  user_id: string;
  check_in_id: string;
  photo_url: string;
  storage_path: string;
  created_at: string;
}

interface PhotoProgressCardProps {
  userId: string;
  isDark: boolean;
}

const SUPABASE_URL = supabase.supabaseUrl;
const PHOTOS_ENDPOINT = `${SUPABASE_URL}/functions/v1/check-in-photos`;

export default function PhotoProgressCard({ userId, isDark }: PhotoProgressCardProps) {
  const [photos, setPhotos] = useState<CheckInPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPhotos = useCallback(async () => {
    try {
      console.log('[PhotoProgressCard] Fetching recent photos for user:', userId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[PhotoProgressCard] No session, skipping photo fetch');
        setLoading(false);
        return;
      }

      const response = await fetch(`${PHOTOS_ENDPOINT}?limit=2`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('[PhotoProgressCard] Fetch failed:', response.status, text);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[PhotoProgressCard] Photos loaded:', data.photos?.length ?? 0);
      setPhotos(data.photos ?? []);
    } catch (err) {
      console.error('[PhotoProgressCard] Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const textColor = isDark ? colors.textDark : colors.text;
  const subtextColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  const cardWidth = Dimensions.get('window').width - spacing.md * 2;
  const photoSize = Math.floor((cardWidth - spacing.lg * 2 - spacing.md * 2 - 32) / 2);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.cardHeader}>
          <IconSymbol
            ios_icon_name="camera.fill"
            android_material_icon_name="photo_camera"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Photo Progress
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  const olderPhoto = photos.length >= 2 ? photos[1] : null;
  const newerPhoto = photos.length >= 1 ? photos[0] : null;

  const emptyState = photos.length === 0;
  const singlePhoto = photos.length === 1;

  const olderDateLabel = olderPhoto ? formatDate(olderPhoto.created_at) : '';
  const newerDateLabel = newerPhoto ? formatDate(newerPhoto.created_at) : '';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <IconSymbol
          ios_icon_name="camera.fill"
          android_material_icon_name="photo_camera"
          size={20}
          color={colors.primary}
        />
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Photo Progress
        </Text>
      </View>

      {/* Empty state */}
      {emptyState && (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="photo.on.rectangle.angled"
            android_material_icon_name="photo_library"
            size={40}
            color={subtextColor}
          />
          <Text style={[styles.emptyText, { color: subtextColor }]}>
            Log a check-in with a photo to see your progress
          </Text>
        </View>
      )}

      {/* Single photo */}
      {singlePhoto && newerPhoto && (
        <View style={styles.photosRow}>
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: newerPhoto.photo_url }}
              style={[styles.photo, { width: photoSize, height: photoSize }]}
              resizeMode="cover"
            />
            <Text style={[styles.dateLabel, { color: subtextColor }]}>
              {newerDateLabel}
            </Text>
          </View>

          <View style={styles.arrowContainer}>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow_forward"
              size={20}
              color={subtextColor}
            />
          </View>

          <View style={[styles.photoWrapper, styles.placeholderWrapper, { width: photoSize, height: photoSize, borderColor: isDark ? colors.borderDark : colors.border }]}>
            <IconSymbol
              ios_icon_name="camera"
              android_material_icon_name="photo_camera"
              size={28}
              color={subtextColor}
            />
            <Text style={[styles.placeholderText, { color: subtextColor }]}>
              Next check-in
            </Text>
          </View>
        </View>
      )}

      {/* Two photos */}
      {!emptyState && !singlePhoto && olderPhoto && newerPhoto && (
        <View style={styles.photosRow}>
          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: olderPhoto.photo_url }}
              style={[styles.photo, { width: photoSize, height: photoSize }]}
              resizeMode="cover"
            />
            <Text style={[styles.dateLabel, { color: subtextColor }]}>
              {olderDateLabel}
            </Text>
          </View>

          <View style={styles.arrowContainer}>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow_forward"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.photoWrapper}>
            <Image
              source={{ uri: newerPhoto.photo_url }}
              style={[styles.photo, { width: photoSize, height: photoSize }]}
              resizeMode="cover"
            />
            <Text style={[styles.dateLabel, { color: subtextColor }]}>
              {newerDateLabel}
            </Text>
          </View>
        </View>
      )}

      {/* Refresh button */}
      <TouchableOpacity
        style={styles.refreshRow}
        onPress={() => {
          console.log('[PhotoProgressCard] Refresh tapped');
          setLoading(true);
          loadPhotos();
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.refreshText, { color: colors.primary }]}>
          Refresh
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 220,
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  photo: {
    borderRadius: borderRadius.md,
  },
  dateLabel: {
    ...typography.small,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  arrowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  placeholderWrapper: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  refreshRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
