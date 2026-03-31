
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Animated,
  Pressable,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { listTrackers, listEntries, logEntry, updateEntry, Tracker, TrackerEntry } from '@/utils/trackersApi';
import CalendarDatePicker from '@/components/CalendarDatePicker';

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

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function LogEntryScreen() {
  const router = useRouter();
  const { trackerId, entryId } = useLocalSearchParams<{ trackerId: string; entryId?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [existingEntry, setExistingEntry] = useState<TrackerEntry | null>(null);
  const [date, setDate] = useState(todayStr());
  const [value, setValue] = useState('');
  const [binaryDone, setBinaryDone] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    loadTracker();
  }, [trackerId]);

  const loadTracker = async () => {
    if (!trackerId) return;
    console.log('[LogEntry] Loading tracker:', trackerId, 'entryId:', entryId);
    try {
      const all = await listTrackers();
      const found = all.find(t => t.id === trackerId) ?? null;
      setTracker(found);

      if (entryId) {
        const entries = await listEntries(trackerId, 90);
        const entry = entries.find(e => e.id === entryId) ?? null;
        if (entry) {
          setExistingEntry(entry);
          setDate(entry.date);
          if (found?.tracker_type === 'binary') {
            setBinaryDone(Number(entry.value) === 1);
          } else {
            setValue(String(entry.value));
          }
          setNotes(entry.notes ?? '');
        }
      }
    } catch (e: unknown) {
      console.error('[LogEntry] Error loading tracker:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!trackerId || !tracker) return;
    console.log('[LogEntry] Save entry tapped — tracker:', tracker.name, 'date:', date);

    let numValue: number;
    if (tracker.tracker_type === 'binary') {
      numValue = binaryDone ? 1 : 0;
    } else {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        setError('Please enter a valid number');
        return;
      }
      numValue = parsed;
    }

    setSaving(true);
    setError(null);
    try {
      if (existingEntry) {
        console.log('[LogEntry] Updating entry:', existingEntry.id, 'value:', numValue);
        await updateEntry(trackerId, existingEntry.id, { value: numValue, notes: notes || undefined });
      } else {
        console.log('[LogEntry] Creating entry — value:', numValue, 'date:', date);
        await logEntry(trackerId, date, numValue, notes || undefined);
      }
      console.log('[LogEntry] Entry saved successfully');
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save entry';
      console.error('[LogEntry] Save error:', msg);
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

  const isEditing = !!existingEntry;
  const screenTitle = isEditing ? 'Edit Entry' : 'Log Entry';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: screenTitle }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tracker name */}
          {tracker ? (
            <View style={styles.trackerHeader}>
              <Text style={styles.trackerEmoji}>{tracker.emoji}</Text>
              <Text style={[styles.trackerName, { color: textColor }]}>{tracker.name}</Text>
            </View>
          ) : null}

          {/* Date picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Date</Text>
            <View style={[styles.datePickerWrapper, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <CalendarDatePicker
                value={date}
                onChange={(d: string) => {
                  console.log('[LogEntry] Date changed:', d);
                  setDate(d);
                }}
              />
            </View>
          </View>

          {/* Value input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>
              {tracker?.tracker_type === 'binary' ? 'Completed?' : `Value${tracker?.unit ? ` (${tracker.unit})` : ''}`}
            </Text>

            {tracker?.tracker_type === 'binary' ? (
              <View style={[styles.binaryRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.binaryLabel, { color: textColor }]}>
                  {binaryDone ? 'Done today ✓' : 'Not done'}
                </Text>
                <Switch
                  value={binaryDone}
                  onValueChange={(v) => {
                    console.log('[LogEntry] Binary toggle:', v);
                    setBinaryDone(v);
                  }}
                  trackColor={{ false: isDark ? '#3A3C52' : '#D4D6DA', true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ) : (
              <View style={[
                styles.inputWrapper,
                { backgroundColor: inputBg, borderColor: focusedField === 'value' ? focusBorder : cardBorder },
              ]}>
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={value}
                  onChangeText={setValue}
                  placeholder={tracker?.tracker_type === 'duration' ? 'Minutes' : '0'}
                  placeholderTextColor={subColor}
                  keyboardType="decimal-pad"
                  onFocus={() => setFocusedField('value')}
                  onBlur={() => setFocusedField(null)}
                  autoFocus={!isEditing}
                />
                {tracker?.unit ? (
                  <Text style={[styles.unitLabel, { color: subColor }]}>{tracker.unit}</Text>
                ) : null}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: textColor }]}>Notes (optional)</Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: inputBg,
                  borderColor: focusedField === 'notes' ? focusBorder : cardBorder,
                  color: textColor,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note..."
              placeholderTextColor={subColor}
              multiline
              numberOfLines={3}
              onFocus={() => setFocusedField('notes')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Error */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Save button */}
          <AnimatedPressable
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            scaleValue={0.97}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>{isEditing ? 'Save changes' : 'Save entry'}</Text>
            )}
          </AnimatedPressable>

          {/* Cancel */}
          <AnimatedPressable onPress={() => { console.log('[LogEntry] Cancel tapped'); router.back(); }} style={styles.cancelButton}>
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
  trackerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  trackerEmoji: {
    fontSize: 28,
  },
  trackerName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
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
  datePickerWrapper: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  unitLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },
  binaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  binaryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  notesInput: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
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
