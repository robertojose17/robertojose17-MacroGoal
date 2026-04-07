
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';
import { toLocalDateString } from '@/utils/dateUtils';

const PROGRESS_PHOTOS_URL = `${supabase.supabaseUrl}/functions/v1/progress-photos`;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface ProgressPhoto {
  id: string;
  user_id: string;
  check_in_id: string | null;
  date: string;
  photo_url: string;
  storage_path: string;
  notes: string | null;
  created_at: string;
}

interface PhotoProgressCardProps {
  userId: string;
  isDark: boolean;
}

function formatPhotoDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PhotoProgressCard({ userId, isDark }: PhotoProgressCardProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPhotos = useCallback(async () => {
    try {
      console.log('[PhotoProgressCard] Loading progress photos for user:', userId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('[PhotoProgressCard] No session, skipping photo load');
        setLoading(false);
        return;
      }

      const res = await fetch(`${PROGRESS_PHOTOS_URL}?limit=50&offset=0`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[PhotoProgressCard] Failed to load photos:', res.status, errText);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const fetched: ProgressPhoto[] = json.photos || [];
      console.log('[PhotoProgressCard] Loaded', fetched.length, 'photos');
      // Sort newest first for the thumbnail strip; keep original for comparison
      setPhotos(fetched);
    } catch (err) {
      console.error('[PhotoProgressCard] Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleDelete = useCallback(async (photo: ProgressPhoto) => {
    console.log('[PhotoProgressCard] Delete button pressed for photo:', photo.id);
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this progress photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              console.log('[PhotoProgressCard] Deleting photo:', photo.id);
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;

              const res = await fetch(`${PROGRESS_PHOTOS_URL}/${photo.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session.access_token}` },
              });

              if (!res.ok) {
                const errText = await res.text();
                console.error('[PhotoProgressCard] Delete failed:', res.status, errText);
                Alert.alert('Error', 'Failed to delete photo. Please try again.');
                return;
              }

              console.log('[PhotoProgressCard] Photo deleted successfully:', photo.id);
              setSelectedPhoto(null);
              await loadPhotos();
            } catch (err) {
              console.error('[PhotoProgressCard] Error deleting photo:', err);
              Alert.alert('Error', 'An unexpected error occurred.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [loadPhotos]);

  const handleAddPhoto = useCallback(() => {
    console.log('[PhotoProgressCard] Add photo button pressed — navigating to check-in form');
    router.push({ pathname: '/check-in-form', params: { type: 'weight' } });
  }, [router]);

  const handleThumbnailPress = useCallback((photo: ProgressPhoto) => {
    console.log('[PhotoProgressCard] Thumbnail pressed, opening photo:', photo.id);
    setSelectedPhoto(photo);
  }, []);

  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const textColor = isDark ? colors.textDark : colors.text;
  const subtextColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const borderColor = isDark ? colors.borderDark : colors.border;

  // Sort by date ascending for comparison (oldest first), newest first for strip
  const sortedAsc = [...photos].sort((a, b) => a.date.localeCompare(b.date));
  const sortedDesc = [...photos].sort((a, b) => b.date.localeCompare(a.date));

  const oldestPhoto = sortedAsc[0] ?? null;
  const newestPhoto = sortedAsc[sortedAsc.length - 1] ?? null;
  const isSamePhoto = oldestPhoto && newestPhoto && oldestPhoto.id === newestPhoto.id;

  const oldestDateLabel = oldestPhoto ? formatPhotoDate(oldestPhoto.date) : '';
  const newestDateLabel = newestPhoto ? formatPhotoDate(newestPhoto.date) : '';

  const selectedDateLabel = selectedPhoto ? formatPhotoDate(selectedPhoto.date) : '';

  const renderThumbnail = ({ item }: { item: ProgressPhoto }) => (
    <TouchableOpacity
      style={styles.thumbnail}
      onPress={() => handleThumbnailPress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.photo_url }} style={styles.thumbnailImage} resizeMode="cover" />
      <Text style={[styles.thumbnailDate, { color: subtextColor }]}>
        {toLocalDateString(new Date(item.date + 'T12:00:00'))}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>
          Photo Progress
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddPhoto}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={16}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : photos.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="camera"
            android_material_icon_name="camera_alt"
            size={40}
            color={subtextColor}
          />
          <Text style={[styles.emptyText, { color: subtextColor }]}>
            Log a weight check-in with a photo to start tracking your visual progress
          </Text>
        </View>
      ) : (
        <>
          {/* Comparison section */}
          {isSamePhoto ? (
            /* Single photo — full width */
            <View style={styles.singlePhotoContainer}>
              <Image
                source={{ uri: oldestPhoto!.photo_url }}
                style={styles.singlePhoto}
                resizeMode="cover"
              />
              <Text style={[styles.comparisonLabel, { color: subtextColor }]}>
                {oldestDateLabel}
              </Text>
            </View>
          ) : (
            /* Two photos side by side */
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Image
                  source={{ uri: oldestPhoto!.photo_url }}
                  style={styles.comparisonPhoto}
                  resizeMode="cover"
                />
                <Text style={[styles.comparisonTag, { color: colors.primary }]}>
                  Start
                </Text>
                <Text style={[styles.comparisonDate, { color: subtextColor }]}>
                  {oldestDateLabel}
                </Text>
              </View>
              <View style={styles.comparisonItem}>
                <Image
                  source={{ uri: newestPhoto!.photo_url }}
                  style={styles.comparisonPhoto}
                  resizeMode="cover"
                />
                <Text style={[styles.comparisonTag, { color: colors.success }]}>
                  Latest
                </Text>
                <Text style={[styles.comparisonDate, { color: subtextColor }]}>
                  {newestDateLabel}
                </Text>
              </View>
            </View>
          )}

          {/* Thumbnail strip — all photos, newest first */}
          {photos.length > 1 && (
            <View style={styles.stripContainer}>
              <View style={[styles.stripDivider, { backgroundColor: borderColor }]} />
              <FlatList
                data={sortedDesc}
                keyExtractor={(item) => item.id}
                renderItem={renderThumbnail}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stripContent}
              />
            </View>
          )}
        </>
      )}

      {/* Full-screen photo modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.backgroundDark : '#000000' }]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalDate, { color: '#FFFFFF' }]}>
                {selectedDateLabel}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  console.log('[PhotoProgressCard] Modal close button pressed');
                  setSelectedPhoto(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Full photo */}
            {selectedPhoto && (
              <Image
                source={{ uri: selectedPhoto.photo_url }}
                style={styles.modalPhoto}
                resizeMode="contain"
              />
            )}

            {/* Delete button */}
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.error }]}
              onPress={() => selectedPhoto && handleDelete(selectedPhoto)}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="trash"
                    android_material_icon_name="delete"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.deleteButtonText}>Delete Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 20,
  },
  singlePhotoContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  singlePhoto: {
    width: '100%',
    height: 240,
    borderRadius: borderRadius.md,
  },
  comparisonLabel: {
    ...typography.small,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  comparisonPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
  },
  comparisonTag: {
    ...typography.small,
    fontWeight: '700',
  },
  comparisonDate: {
    ...typography.small,
    textAlign: 'center',
  },
  stripContainer: {
    marginTop: spacing.md,
  },
  stripDivider: {
    height: 1,
    marginBottom: spacing.md,
  },
  stripContent: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  thumbnail: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
  },
  thumbnailDate: {
    ...typography.small,
    fontSize: 10,
    textAlign: 'center',
    maxWidth: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalDate: {
    ...typography.bodyBold,
  },
  modalPhoto: {
    flex: 1,
    width: SCREEN_WIDTH - spacing.md * 2,
    borderRadius: borderRadius.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
