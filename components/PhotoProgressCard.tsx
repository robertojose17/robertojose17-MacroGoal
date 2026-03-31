
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  ImageSourcePropType,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';

interface PhotoProgressCardProps {
  userId: string;
  isDark: boolean;
}

interface CheckInWithPhoto {
  id: string;
  date: string;
  photo_url: string;
  weight: number | null;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function PhotoProgressCard({ userId, isDark }: PhotoProgressCardProps) {
  const [loading, setLoading] = useState(true);
  const [checkIns, setCheckIns] = useState<CheckInWithPhoto[]>([]);
  const [beforeIndex, setBeforeIndex] = useState<number>(0);
  const [afterIndex, setAfterIndex] = useState<number>(0);
  const [showBeforePicker, setShowBeforePicker] = useState(false);
  const [showAfterPicker, setShowAfterPicker] = useState(false);

  const loadCheckInsWithPhotos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[PhotoProgressCard] Loading check-ins with photos for user:', userId);

      const { data, error } = await supabase
        .from('check_ins')
        .select('id, date, photo_url, weight')
        .eq('user_id', userId)
        .not('photo_url', 'is', null)
        .neq('photo_url', '')
        .order('date', { ascending: true });

      if (error) {
        console.error('[PhotoProgressCard] Error loading check-ins:', error);
        setCheckIns([]);
        return;
      }

      const count = data?.length || 0;
      console.log('[PhotoProgressCard] Loaded', count, 'check-ins with photos');
      if (data && data.length > 0) {
        data.forEach((ci, i) => {
          console.log('[PhotoProgressCard] check-in[' + i + '] photo_url:', ci.photo_url);
        });
        setCheckIns(data);
        setBeforeIndex(0);
        setAfterIndex(data.length - 1);
      } else {
        setCheckIns([]);
      }
    } catch (err) {
      console.error('[PhotoProgressCard] Unexpected error:', err);
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCheckInsWithPhotos();
  }, [loadCheckInsWithPhotos]);

  const formatDate = useCallback((dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formatShortDate = useCallback((dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const beforeCheckIn = useMemo(() => checkIns[beforeIndex] || null, [checkIns, beforeIndex]);
  const afterCheckIn = useMemo(() => checkIns[afterIndex] || null, [checkIns, afterIndex]);

  const handleBeforeSelect = useCallback((index: number) => {
    console.log('[PhotoProgressCard] Before photo selected:', checkIns[index]?.date);
    setBeforeIndex(index);
    setShowBeforePicker(false);
  }, [checkIns]);

  const handleAfterSelect = useCallback((index: number) => {
    console.log('[PhotoProgressCard] After photo selected:', checkIns[index]?.date);
    setAfterIndex(index);
    setShowAfterPicker(false);
  }, [checkIns]);

  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const textColor = isDark ? colors.textDark : colors.text;
  const subtextColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Photo Progress</Text>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (checkIns.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Photo Progress</Text>
        <View style={styles.centeredContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <IconSymbol
              ios_icon_name="photo.on.rectangle"
              android_material_icon_name="photo_library"
              size={32}
              color={subtextColor}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>No progress photos yet</Text>
          <Text style={[styles.emptySubtext, { color: subtextColor }]}>
            Add a photo when logging a weight check-in to track your visual transformation.
          </Text>
        </View>
      </View>
    );
  }

  // ── Single photo state ─────────────────────────────────────────────────────
  if (checkIns.length === 1) {
    const single = checkIns[0];
    const singleDateLabel = formatShortDate(single.date);
    const singleImageSource = resolveImageSource(single.photo_url);

    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Photo Progress</Text>
        <View style={styles.singleContainer}>
          <View style={styles.singlePhotoWrapper}>
            <Image
              source={singleImageSource}
              style={styles.photoImage}
              resizeMode="cover"
              onError={() => console.error('[PhotoProgressCard] Single photo failed to load:', single.photo_url)}
              onLoad={() => console.log('[PhotoProgressCard] Single photo loaded')}
            />
            <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.5)' }]}>
              <Text style={styles.dateBadgeText}>{singleDateLabel}</Text>
            </View>
          </View>
          <Text style={[styles.singleHint, { color: subtextColor }]}>
            Add more check-in photos to compare your progress
          </Text>
        </View>
      </View>
    );
  }

  // ── Comparison state ───────────────────────────────────────────────────────
  const beforeDateLabel = beforeCheckIn ? formatShortDate(beforeCheckIn.date) : '';
  const afterDateLabel = afterCheckIn ? formatShortDate(afterCheckIn.date) : '';
  const beforeImageSource = resolveImageSource(beforeCheckIn?.photo_url);
  const afterImageSource = resolveImageSource(afterCheckIn?.photo_url);

  return (
    <React.Fragment>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Photo Progress</Text>

        <View style={styles.photosRow}>
          {/* Before photo */}
          <View style={styles.photoColumn}>
            <View style={styles.labelRow}>
              <Text style={[styles.sideLabel, { color: subtextColor }]}>BEFORE</Text>
            </View>
            <View style={[styles.photoFrame, { borderColor: isDark ? colors.borderDark : colors.border }]}>
              {beforeCheckIn && (
                <Image
                  source={beforeImageSource}
                  style={styles.photoImage}
                  resizeMode="cover"
                  onError={() => console.error('[PhotoProgressCard] Before photo failed:', beforeCheckIn.photo_url)}
                  onLoad={() => console.log('[PhotoProgressCard] Before photo loaded')}
                />
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log('[PhotoProgressCard] Before date picker opened');
                setShowBeforePicker(true);
              }}
              activeOpacity={0.7}
              style={[styles.dateChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Text style={[styles.dateChipText, { color: textColor }]}>{beforeDateLabel}</Text>
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="expand_more"
                size={12}
                color={subtextColor}
              />
            </TouchableOpacity>
          </View>

            {/* After photo */}
          <View style={styles.photoColumn}>
            <View style={styles.labelRow}>
              <Text style={[styles.sideLabel, { color: subtextColor }]}>AFTER</Text>
            </View>
            <View style={[styles.photoFrame, { borderColor: isDark ? colors.borderDark : colors.border }]}>
              {afterCheckIn && (
                <Image
                  source={afterImageSource}
                  style={styles.photoImage}
                  resizeMode="cover"
                  onError={() => console.error('[PhotoProgressCard] After photo failed:', afterCheckIn.photo_url)}
                  onLoad={() => console.log('[PhotoProgressCard] After photo loaded')}
                />
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                console.log('[PhotoProgressCard] After date picker opened');
                setShowAfterPicker(true);
              }}
              activeOpacity={0.7}
              style={[styles.dateChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <Text style={[styles.dateChipText, { color: textColor }]}>{afterDateLabel}</Text>
              <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="expand_more"
                size={12}
                color={subtextColor}
              />
            </TouchableOpacity>
          </View>
        </View>

      </View>

      {/* Before picker modal */}
      <PhotoDatePickerModal
        visible={showBeforePicker}
        title="Select Before Photo"
        checkIns={checkIns}
        selectedIndex={beforeIndex}
        isDark={isDark}
        onSelect={handleBeforeSelect}
        onClose={() => setShowBeforePicker(false)}
        formatDate={formatDate}
      />

      {/* After picker modal */}
      <PhotoDatePickerModal
        visible={showAfterPicker}
        title="Select After Photo"
        checkIns={checkIns}
        selectedIndex={afterIndex}
        isDark={isDark}
        onSelect={handleAfterSelect}
        onClose={() => setShowAfterPicker(false)}
        formatDate={formatDate}
      />
    </React.Fragment>
  );
}

// ── Date picker modal ──────────────────────────────────────────────────────────

interface PhotoDatePickerModalProps {
  visible: boolean;
  title: string;
  checkIns: CheckInWithPhoto[];
  selectedIndex: number;
  isDark: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
  formatDate: (dateString: string) => string;
}

function PhotoDatePickerModal({
  visible,
  title,
  checkIns,
  selectedIndex,
  isDark,
  onSelect,
  onClose,
  formatDate,
}: PhotoDatePickerModalProps) {
  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const textColor = isDark ? colors.textDark : colors.text;
  const subtextColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.pickerSheet, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.pickerHeader, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
            <Text style={[styles.pickerTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={24}
                color={subtextColor}
              />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView
            style={styles.pickerScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {checkIns.map((checkIn, index) => {
              const isSelected = selectedIndex === index;
              const thumbSource = resolveImageSource(checkIn.photo_url);
              const dateLabel = formatDate(checkIn.date);
              const rowBg = isSelected
                ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,122,255,0.06)'
                : 'transparent';

              return (
                <TouchableOpacity
                  key={checkIn.id}
                  style={[styles.pickerRow, { backgroundColor: rowBg, borderBottomColor: isDark ? colors.borderDark : colors.border }]}
                  onPress={() => onSelect(index)}
                  activeOpacity={0.7}
                >
                  {/* Thumbnail */}
                  <Image
                    source={thumbSource}
                    style={[styles.pickerThumb, { borderColor: isSelected ? colors.primary : (isDark ? colors.borderDark : colors.border) }]}
                    resizeMode="cover"
                  />

                  {/* Date + weight */}
                  <View style={styles.pickerRowInfo}>
                    <Text style={[styles.pickerRowDate, { color: isSelected ? colors.primary : textColor }]}>
                      {dateLabel}
                    </Text>
                    {checkIn.weight != null && (
                      <Text style={[styles.pickerRowWeight, { color: subtextColor }]}>
                        {Number(checkIn.weight * 2.20462).toFixed(1)}
                        {' '}
                        lbs
                      </Text>
                    )}
                  </View>

                  {/* Checkmark */}
                  {isSelected && (
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check_circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.bodyBold,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  // ── Single photo ──
  singleContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  singlePhotoWrapper: {
    width: '60%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#E5E5EA',
    position: 'relative',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  singleHint: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  // ── Comparison ──
  photosRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  photoColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  labelRow: {
    marginBottom: 4,
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#E5E5EA',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    marginTop: 2,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    ...typography.h3,
    fontSize: 17,
  },
  closeBtn: {
    padding: 2,
  },
  pickerScroll: {
    flexGrow: 0,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerThumb: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  pickerRowInfo: {
    flex: 1,
    gap: 2,
  },
  pickerRowDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerRowWeight: {
    fontSize: 13,
  },
});
