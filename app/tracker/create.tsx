
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { listTrackers, createTracker, updateTracker, Tracker } from '@/utils/trackersApi';

// ─── AnimatedPressable ────────────────────────────────────────────────────────
function AnimatedPressable({
  onPress,
  style,
  children,
  scaleValue = 0.97,
  disabled,
}: {
  onPress?: () => void;
  style?: object | object[];
  children: React.ReactNode;
  scaleValue?: number;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animIn = () =>
    Animated.spring(scale, { toValue: scaleValue, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const animOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
      <Pressable onPressIn={animIn} onPressOut={animOut} onPress={onPress} disabled={disabled} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESET_EMOJIS = [
  '💪', '🏃', '😴', '💧', '🧘', '📚', '🎯', '⚖️', '🥗', '🚶',
  '🏋️', '🎵', '🌅', '🧹', '📱', '❤️', '🌿', '✍️', '🍎', '🛌',
  '🔥', '⭐', '🏆', '🎉', '🧠', '🌙', '☀️', '🍵', '🚴', '🤸',
];

type TrackerType = 'binary' | 'count' | 'numeric' | 'duration';
type Frequency = 'daily' | 'weekly';

const TYPE_OPTIONS: { value: TrackerType; label: string; desc: string }[] = [
  { value: 'binary', label: 'Binary', desc: 'Done / not done' },
  { value: 'count', label: 'Count', desc: 'Whole numbers' },
  { value: 'numeric', label: 'Numeric', desc: 'Decimal numbers' },
  { value: 'duration', label: 'Duration', desc: 'Time in minutes' },
];

export default function CreateTrackerScreen() {
  const router = useRouter();
  const { trackerId } = useLocalSearchParams<{ trackerId?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isEditing = !!trackerId;

  const [emoji, setEmoji] = useState('🎯');
  const [name, setName] = useState('');
  const [trackerType, setTrackerType] = useState<TrackerType>('binary');
  const [unit, setUnit] = useState('');
  const [goalValue, setGoalValue] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) loadExisting();
  }, [trackerId]);

  const loadExisting = async () => {
    console.log('[CreateTracker] Loading existing tracker:', trackerId);
    try {
      const all = await listTrackers();
      const found = all.find(t => t.id === trackerId);
      if (found) {
        setEmoji(found.emoji);
        setName(found.name);
        setTrackerType(found.tracker_type);
        setUnit(found.unit ?? '');
        setGoalValue(found.goal_value != null ? String(found.goal_value) : '');
        setFrequency(found.frequency);
      }
    } catch (e) {
      console.error('[CreateTracker] Error loading tracker:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a tracker name');
      return;
    }

    const goalNum = goalValue.trim() ? parseFloat(goalValue) : null;
    if (goalValue.trim() && isNaN(goalNum!)) {
      setError('Goal value must be a number');
      return;
    }

    const payload: Partial<Tracker> = {
      emoji,
      name: name.trim(),
      tracker_type: trackerType,
      unit: trackerType !== 'binary' && unit.trim() ? unit.trim() : null,
      goal_value: goalNum,
      frequency,
    };

    console.log('[CreateTracker] Save tapped —', isEditing ? 'update' : 'create', payload);
    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await updateTracker(trackerId!, payload);
        console.log('[CreateTracker] Tracker updated successfully');
      } else {
        await createTracker(payload);
        console.log('[CreateTracker] Tracker created successfully');
      }
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save tracker';
      console.error('[CreateTracker] Save error:', msg);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const bg = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const subColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const inputBg = isDark ? '#2A2C40' : '#F0F2F7';
  const focusBorder = colors.primary;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? 'Edit Tracker' : 'New Tracker' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Emoji picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Icon</Text>
            <View style={[styles.emojiPreview, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={styles.emojiPreviewText}>{emoji}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiRow}
            >
              {PRESET_EMOJIS.map(e => (
                <AnimatedPressable
                  key={e}
                  onPress={() => {
                    console.log('[CreateTracker] Emoji selected:', e);
                    setEmoji(e);
                  }}
                  style={[
                    styles.emojiOption,
                    {
                      backgroundColor: emoji === e ? colors.primary + '22' : inputBg,
                      borderColor: emoji === e ? colors.primary : 'transparent',
                    },
                  ]}
                  scaleValue={0.9}
                >
                  <Text style={styles.emojiOptionText}>{e}</Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          </View>

          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Name *</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: focusedField === 'name' ? focusBorder : cardBorder,
                  color: textColor,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Morning run, Water intake"
              placeholderTextColor={subColor}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              autoFocus={!isEditing}
              returnKeyType="next"
            />
          </View>

          {/* Tracker type */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Type</Text>
            <View style={styles.pillRow}>
              {TYPE_OPTIONS.map(opt => {
                const isSelected = trackerType === opt.value;
                return (
                  <AnimatedPressable
                    key={opt.value}
                    onPress={() => {
                      console.log('[CreateTracker] Type selected:', opt.value);
                      setTrackerType(opt.value);
                    }}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isSelected ? colors.primary : inputBg,
                        borderColor: isSelected ? colors.primary : cardBorder,
                        flex: 1,
                      },
                    ]}
                    scaleValue={0.95}
                  >
                    <Text style={[styles.typePillLabel, { color: isSelected ? '#fff' : textColor }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.typePillDesc, { color: isSelected ? 'rgba(255,255,255,0.75)' : subColor }]}>
                      {opt.desc}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Unit (hidden for binary) */}
          {trackerType !== 'binary' ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: textColor }]}>Unit (optional)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: inputBg,
                    borderColor: focusedField === 'unit' ? focusBorder : cardBorder,
                    color: textColor,
                  },
                ]}
                value={unit}
                onChangeText={setUnit}
                placeholder={
                  trackerType === 'count' ? 'e.g. glasses, reps' :
                  trackerType === 'numeric' ? 'e.g. kg, miles' :
                  'e.g. minutes, hours'
                }
                placeholderTextColor={subColor}
                onFocus={() => setFocusedField('unit')}
                onBlur={() => setFocusedField(null)}
                returnKeyType="next"
              />
            </View>
          ) : null}

          {/* Goal value */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Daily goal (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: inputBg,
                  borderColor: focusedField === 'goal' ? focusBorder : cardBorder,
                  color: textColor,
                },
              ]}
              value={goalValue}
              onChangeText={setGoalValue}
              placeholder={trackerType === 'binary' ? '1' : 'e.g. 10000'}
              placeholderTextColor={subColor}
              keyboardType="decimal-pad"
              onFocus={() => setFocusedField('goal')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Frequency */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Frequency</Text>
            <View style={styles.freqRow}>
              {(['daily', 'weekly'] as Frequency[]).map(f => {
                const isSelected = frequency === f;
                return (
                  <AnimatedPressable
                    key={f}
                    onPress={() => {
                      console.log('[CreateTracker] Frequency selected:', f);
                      setFrequency(f);
                    }}
                    style={[
                      styles.freqPill,
                      {
                        backgroundColor: isSelected ? colors.primary : inputBg,
                        borderColor: isSelected ? colors.primary : cardBorder,
                      },
                    ]}
                    scaleValue={0.95}
                  >
                    <Text style={[styles.freqPillText, { color: isSelected ? '#fff' : textColor }]}>
                      {f === 'daily' ? 'Daily' : 'Weekly'}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          {/* Error */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Save button */}
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            scaleValue={0.97}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Save changes' : 'Create tracker'}
              </Text>
            )}
          </AnimatedPressable>

          {/* Cancel */}
          <AnimatedPressable
            onPress={() => { console.log('[CreateTracker] Cancel tapped'); router.back(); }}
            style={styles.cancelButton}
          >
            <Text style={[styles.cancelButtonText, { color: subColor }]}>Cancel</Text>
          </AnimatedPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  emojiPreview: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  emojiPreviewText: {
    fontSize: 28,
  },
  emojiRow: {
    gap: 8,
    paddingVertical: 4,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  emojiOptionText: {
    fontSize: 22,
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typePill: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  typePillLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  typePillDesc: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  freqRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  freqPill: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
  },
  freqPillText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 50,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
