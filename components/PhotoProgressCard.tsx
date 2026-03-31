import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Modal, FlatList, Dimensions, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase/client';

const { width: SW } = Dimensions.get('window');
const PW = Math.floor((SW - 52) / 2);
const PH = 280;

type PhotoEntry = { id: string; date: string; weight: number | null; photo_url: string };

export default function PhotoProgressCard() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [beforeIdx, setBeforeIdx] = useState(0);
  const [afterIdx, setAfterIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pickerTarget, setPickerTarget] = useState<'before' | 'after' | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data, error } = await supabase
          .from('check_ins')
          .select('id, date, weight, photo_url')
          .eq('user_id', user.id)
          .not('photo_url', 'is', null)
          .neq('photo_url', '')
          .order('date', { ascending: true });

        if (error) { console.error('PhotoProgressCard fetch error:', error); setLoading(false); return; }

        const valid = (data || []).filter(r => r.photo_url && r.photo_url.startsWith('http'));
        console.log('PhotoProgressCard: found', valid.length, 'photos');
        if (valid.length > 0) console.log('First photo_url:', valid[0].photo_url);

        if (!cancelled) {
          setPhotos(valid);
          setBeforeIdx(0);
          setAfterIdx(Math.max(0, valid.length - 1));
          setLoading(false);
        }
      } catch (e) {
        console.error('PhotoProgressCard error:', e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []));

  if (loading) return (
    <View style={styles.card}>
      <Text style={styles.title}>Photo Progress</Text>
      <ActivityIndicator style={{ marginTop: 20 }} color="#A0A2B8" />
    </View>
  );

  if (photos.length < 2) return (
    <View style={styles.card}>
      <Text style={styles.title}>Photo Progress</Text>
      <Text style={styles.empty}>Add photos to your weight check-ins to compare your progress</Text>
    </View>
  );

  const before = photos[beforeIdx];
  const after = photos[afterIdx];

  const beforeDate = formatDate(before.date);
  const afterDate = formatDate(after.date);

  const beforeUri = before.photo_url.includes('?') ? before.photo_url : before.photo_url + '?t=' + Date.now();
  const afterUri = after.photo_url.includes('?') ? after.photo_url : after.photo_url + '?t=' + Date.now();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Photo Progress</Text>
      <View style={styles.row}>
        {/* BEFORE */}
        <View style={styles.col}>
          <View style={{ width: PW, height: PH, borderRadius: 12, overflow: 'hidden', backgroundColor: '#2a2a2a' }}>
            <Image
              source={{ uri: beforeUri }}
              style={{ width: PW, height: PH }}
              resizeMode="cover"
              onError={(e) => console.warn('Before image error:', beforeUri, e.nativeEvent.error)}
              onLoad={() => console.log('Before image loaded:', beforeUri)}
            />
          </View>
          <Text style={styles.label}>BEFORE</Text>
          <TouchableOpacity onPress={() => {
            console.log('PhotoProgressCard: opening before picker');
            setPickerTarget('before');
          }}>
            <Text style={styles.dateChip}>{beforeDate}</Text>
          </TouchableOpacity>
        </View>

        {/* AFTER */}
        <View style={styles.col}>
          <View style={{ width: PW, height: PH, borderRadius: 12, overflow: 'hidden', backgroundColor: '#2a2a2a' }}>
            <Image
              source={{ uri: afterUri }}
              style={{ width: PW, height: PH }}
              resizeMode="cover"
              onError={(e) => console.warn('After image error:', afterUri, e.nativeEvent.error)}
              onLoad={() => console.log('After image loaded:', afterUri)}
            />
          </View>
          <Text style={styles.label}>AFTER</Text>
          <TouchableOpacity onPress={() => {
            console.log('PhotoProgressCard: opening after picker');
            setPickerTarget('after');
          }}>
            <Text style={styles.dateChip}>{afterDate}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Modal */}
      <Modal visible={pickerTarget !== null} transparent animationType="slide" onRequestClose={() => setPickerTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerTarget(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Date</Text>
            <FlatList
              data={photos}
              keyExtractor={item => item.id}
              renderItem={({ item, index }) => {
                const itemDate = formatDate(item.date);
                const itemWeight = item.weight ? (item.weight * 2.20462).toFixed(1) : null;
                return (
                  <TouchableOpacity style={styles.sheetRow} onPress={() => {
                    console.log('PhotoProgressCard: selected', pickerTarget, 'index', index, 'date', item.date);
                    if (pickerTarget === 'before') setBeforeIdx(index);
                    else setAfterIdx(index);
                    setPickerTarget(null);
                  }}>
                    <Image source={{ uri: item.photo_url }} style={{ width: 44, height: 58, borderRadius: 6 }} resizeMode="cover" />
                    <Text style={styles.sheetDate}>{itemDate}</Text>
                    {itemWeight ? <Text style={styles.sheetWeight}>{itemWeight} lb</Text> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateChip: {
    color: '#F1F5F9',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#52525b',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  empty: {
    color: '#71717a',
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
    lineHeight: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#27272a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: 400,
  },
  sheetTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  sheetDate: {
    color: '#F1F5F9',
    fontSize: 14,
    flex: 1,
  },
  sheetWeight: {
    color: '#71717a',
    fontSize: 12,
  },
});
