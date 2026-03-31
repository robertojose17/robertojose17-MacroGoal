
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { supabase } from '@/lib/supabase/client';

const BUCKET = 'check-ins';
const SCREEN_WIDTH = Dimensions.get('window').width;
// Card has padding of 16 on each side, gap of 8 between columns
const CARD_PADDING = 16;
const COL_GAP = 8;
const PHOTO_WIDTH = Math.floor((SCREEN_WIDTH - CARD_PADDING * 2 - COL_GAP * 3) / 2);
const PHOTO_HEIGHT = 260;

interface CheckInWithPhoto {
  id: string;
  date: string;
  weight: number | null;
  photo_url: string; // resolved full https URL
}

interface PhotoProgressCardProps {
  userId: string;
  isDark: boolean;
}

function resolveUrl(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(raw);
  console.log('[PhotoProgressCard] Resolved storage path to URL:', data.publicUrl);
  return data.publicUrl;
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PhotoProgressCard({ userId, isDark }: PhotoProgressCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInWithPhoto[]>([]);
  const [beforeIndex, setBeforeIndex] = useState(0);
  const [afterIndex, setAfterIndex] = useState(0);
  const [showBeforePicker, setShowBeforePicker] = useState(false);
  const [showAfterPicker, setShowAfterPicker] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        console.log('[PhotoProgressCard] Fetching check-ins with photos for user:', userId);

        const { data, error: dbError } = await supabase
          .from('check_ins')
          .select('id, date, weight, photo_url')
          .eq('user_id', userId)
          .not('photo_url', 'is', null)
          .order('date', { ascending: true });

        if (cancelled) return;

        if (dbError) {
          console.log('[PhotoProgressCard] DB error:', dbError.message);
          setError('Failed to load photos');
          setLoading(false);
          return;
        }

        console.log('[PhotoProgressCard] Raw results count:', data?.length ?? 0);

        const resolved: CheckInWithPhoto[] = (data ?? [])
          .filter((row) => row.photo_url && row.photo_url.trim() !== '')
          .map((row) => {
            const url = resolveUrl(row.photo_url);
            console.log('[PhotoProgressCard] date:', row.date, 'url:', url);
            return { id: row.id, date: row.date, weight: row.weight ?? null, photo_url: url };
          });

        console.log('[PhotoProgressCard] Resolved photos count:', resolved.length);

        setCheckIns(resolved);
        setBeforeIndex(0);
        setAfterIndex(Math.max(0, resolved.length - 1));
      } catch (err: any) {
        if (!cancelled) {
          console.log('[PhotoProgressCard] Unexpected error:', err?.message ?? err);
          setError('Something went wrong loading photos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const textColor = isDark ? colors.textDark : colors.text;
  const subtextColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.title, { color: textColor }]}>Photo Progress</Text>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.title, { color: textColor }]}>Photo Progress</Text>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: subtextColor }]}>{error}</Text>
        </View>
      </View>
    );
  }

  if (checkIns.length < 2) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.title, { color: textColor }]}>Photo Progress</Text>
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: subtextColor }]}>
            Add photos to your weight check-ins to compare progress
          </Text>
        </View>
      </View>
    );
  }

  const beforeEntry = checkIns[beforeIndex];
  const afterEntry = checkIns[afterIndex];
  const beforeLabel = formatShortDate(beforeEntry.date);
  const afterLabel = formatShortDate(afterEntry.date);

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <Text style={[styles.title, { color: textColor }]}>Photo Progress</Text>

      <View style={styles.row}>
        {/* BEFORE */}
        <View style={styles.col}>
          <Text style={[styles.sideLabel, { color: subtextColor }]}>BEFORE</Text>
          <View style={styles.photoBox}>
            <Image
              source={{ uri: beforeEntry.photo_url }}
              style={styles.photo}
              resizeMode="cover"
              onError={(e) => console.log('[PhotoProgressCard] Before image error:', e.nativeEvent)}
              onLoad={() => console.log('[PhotoProgressCard] Before image loaded:', beforeEntry.photo_url)}
            />
          </View>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => {
              console.log('[PhotoProgressCard] Before date picker opened');
              setShowBeforePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateBtnText, { color: textColor }]}>{beforeLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* AFTER */}
        <View style={styles.col}>
          <Text style={[styles.sideLabel, { color: subtextColor }]}>AFTER</Text>
          <View style={styles.photoBox}>
            <Image
              source={{ uri: afterEntry.photo_url }}
              style={styles.photo}
              resizeMode="cover"
              onError={(e) => console.log('[PhotoProgressCard] After image error:', e.nativeEvent)}
              onLoad={() => console.log('[PhotoProgressCard] After image loaded:', afterEntry.photo_url)}
            />
          </View>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => {
              console.log('[PhotoProgressCard] After date picker opened');
              setShowAfterPicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.dateBtnText, { color: textColor }]}>{afterLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Before picker */}
      <DatePickerModal
        visible={showBeforePicker}
        title="Select Before Photo"
        checkIns={checkIns}
        selectedIndex={beforeIndex}
        isDark={isDark}
        onSelect={(i) => {
          console.log('[PhotoProgressCard] Before photo selected:', checkIns[i]?.date);
          setBeforeIndex(i);
          setShowBeforePicker(false);
        }}
        onClose={() => setShowBeforePicker(false)}
      />

      {/* After picker */}
      <DatePickerModal
        visible={showAfterPicker}
        title="Select After Photo"
        checkIns={checkIns}
        selectedIndex={afterIndex}
        isDark={isDark}
        onSelect={(i) => {
          console.log('[PhotoProgressCard] After photo selected:', checkIns[i]?.date);
          setAfterIndex(i);
          setShowAfterPicker(false);
        }}
        onClose={() => setShowAfterPicker(false)}
      />
    </View>
  );
}

// ── Date picker modal ──────────────────────────────────────────────────────────

interface DatePickerModalProps {
  visible: boolean;
  title: string;
  checkIns: CheckInWithPhoto[];
  selectedIndex: number;
  isDark: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
}

function DatePickerModal({ visible, title, checkIns, selectedIndex, isDark, onSelect, onClose }: DatePickerModalProps) {
  const sheetBg = isDark ? colors.cardDark : '#FFFFFF';
  const borderColor = isDark ? colors.borderDark : colors.border;
  const textColor = isDark ? colors.textDark : colors.text;
  const subtextColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: sheetBg, borderColor }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.sheetHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.sheetTitle, { color: textColor }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.sheetClose, { color: subtextColor }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={checkIns}
            keyExtractor={(item) => item.id}
            bounces={false}
            renderItem={({ item, index }) => {
              const isSelected = index === selectedIndex;
              const rowBg = isSelected
                ? isDark ? 'rgba(91,154,168,0.15)' : 'rgba(91,154,168,0.08)'
                : 'transparent';
              const dateLabel = formatDate(item.date);

              return (
                <TouchableOpacity
                  style={[styles.row2, { backgroundColor: rowBg, borderBottomColor: borderColor }]}
                  onPress={() => onSelect(index)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.photo_url }}
                    style={[styles.thumb, { borderColor: isSelected ? colors.primary : borderColor }]}
                    resizeMode="cover"
                  />
                  <Text style={[styles.rowDate, { color: isSelected ? colors.primary : textColor }]}>
                    {dateLabel}
                  </Text>
                  {isSelected && (
                    <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={<View style={{ height: 24 }} />}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: CARD_PADDING,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    gap: COL_GAP,
  },
  col: {
    width: PHOTO_WIDTH,
    alignItems: 'center',
    gap: spacing.xs,
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  photoBox: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#D1D5DB',
  },
  photo: {
    width: PHOTO_WIDTH,
    height: PHOTO_HEIGHT,
  },
  dateBtn: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    marginTop: 2,
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetTitle: {
    ...typography.h3,
    fontSize: 17,
  },
  sheetClose: {
    fontSize: 18,
    fontWeight: '400',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  rowDate: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
