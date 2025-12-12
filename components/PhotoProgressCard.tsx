
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

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

export default function PhotoProgressCard({ userId, isDark }: PhotoProgressCardProps) {
  const [loading, setLoading] = useState(true);
  const [checkIns, setCheckIns] = useState<CheckInWithPhoto[]>([]);
  const [leftDateIndex, setLeftDateIndex] = useState<number>(0);
  const [rightDateIndex, setRightDateIndex] = useState<number>(0);

  useEffect(() => {
    loadCheckInsWithPhotos();
  }, [userId]);

  const loadCheckInsWithPhotos = async () => {
    try {
      setLoading(true);
      console.log('[PhotoProgressCard] Loading check-ins with photos for user:', userId);

      const { data, error } = await supabase
        .from('check_ins')
        .select('id, date, photo_url, weight')
        .eq('user_id', userId)
        .not('photo_url', 'is', null)
        .order('date', { ascending: true });

      if (error) {
        console.error('[PhotoProgressCard] Error loading check-ins:', error);
        setCheckIns([]);
        return;
      }

      console.log('[PhotoProgressCard] Loaded', data?.length || 0, 'check-ins with photos');
      
      if (data && data.length > 0) {
        // Log the photo URLs to verify they're correct
        data.forEach((checkIn, index) => {
          console.log(`[PhotoProgressCard] Check-in ${index + 1}:`, checkIn.date, '→', checkIn.photo_url);
        });
        
        setCheckIns(data);
        // Set default selection: earliest (left) and most recent (right)
        setLeftDateIndex(0);
        setRightDateIndex(data.length - 1);
      } else {
        setCheckIns([]);
      }
    } catch (err) {
      console.error('[PhotoProgressCard] Error in loadCheckInsWithPhotos:', err);
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const leftCheckIn = useMemo(() => {
    return checkIns[leftDateIndex] || null;
  }, [checkIns, leftDateIndex]);

  const rightCheckIn = useMemo(() => {
    return checkIns[rightDateIndex] || null;
  }, [checkIns, rightDateIndex]);

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Photo Progress
        </Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Empty state: no photos
  if (checkIns.length === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Photo Progress
        </Text>
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="photo.on.rectangle"
            android_material_icon_name="photo_library"
            size={48}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <Text
            style={[
              styles.emptyText,
              { color: isDark ? colors.textSecondaryDark : colors.textSecondary },
            ]}
          >
            Add progress photos with your weight check-ins to compare your transformation.
          </Text>
        </View>
      </View>
    );
  }

  // Single photo state
  if (checkIns.length === 1) {
    const singleCheckIn = checkIns[0];
    console.log('[PhotoProgressCard] Rendering single photo:', singleCheckIn.photo_url);
    
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.cardDark : colors.card,
            borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Photo Progress
        </Text>
        
        <View style={styles.singlePhotoContainer}>
          <View style={styles.photoWrapper}>
            <Image
              key={singleCheckIn.photo_url}
              source={{ uri: singleCheckIn.photo_url }}
              style={styles.photoImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('[PhotoProgressCard] ❌ Single photo failed to load:', singleCheckIn.photo_url);
                console.error('[PhotoProgressCard] Error:', error.nativeEvent.error);
              }}
              onLoad={() => {
                console.log('[PhotoProgressCard] ✅ Single photo loaded successfully');
              }}
            />
            <Text style={[styles.photoDate, { color: isDark ? colors.textDark : colors.text }]}>
              {formatDate(singleCheckIn.date)}
            </Text>
          </View>
          <Text
            style={[
              styles.singlePhotoMessage,
              { color: isDark ? colors.textSecondaryDark : colors.textSecondary },
            ]}
          >
            Add more photos to see your progress comparison
          </Text>
        </View>
      </View>
    );
  }

  // Normal state: two or more photos
  console.log('[PhotoProgressCard] Rendering comparison - Left:', leftCheckIn?.photo_url, 'Right:', rightCheckIn?.photo_url);
  
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.cardDark : colors.card,
          borderColor: isDark ? colors.cardBorderDark : colors.cardBorder,
        },
      ]}
    >
      <Text style={[styles.cardTitle, { color: isDark ? colors.textDark : colors.text }]}>
        Photo Progress
      </Text>

      {/* Side-by-side photos */}
      <View style={styles.photosRow}>
        {/* Left photo */}
        <View style={styles.photoWrapper}>
          {leftCheckIn && (
            <>
              <Image
                key={leftCheckIn.photo_url}
                source={{ uri: leftCheckIn.photo_url }}
                style={styles.photoImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('[PhotoProgressCard] ❌ Left photo failed to load:', leftCheckIn.photo_url);
                  console.error('[PhotoProgressCard] Error:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('[PhotoProgressCard] ✅ Left photo loaded successfully');
                }}
              />
              <Text style={[styles.photoDate, { color: isDark ? colors.textDark : colors.text }]}>
                {formatDate(leftCheckIn.date)}
              </Text>
            </>
          )}
        </View>

        {/* Arrow separator */}
        <View style={styles.arrowContainer}>
          <IconSymbol
            ios_icon_name="arrow.right"
            android_material_icon_name="arrow_forward"
            size={24}
            color={colors.primary}
          />
        </View>

        {/* Right photo */}
        <View style={styles.photoWrapper}>
          {rightCheckIn && (
            <>
              <Image
                key={rightCheckIn.photo_url}
                source={{ uri: rightCheckIn.photo_url }}
                style={styles.photoImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('[PhotoProgressCard] ❌ Right photo failed to load:', rightCheckIn.photo_url);
                  console.error('[PhotoProgressCard] Error:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('[PhotoProgressCard] ✅ Right photo loaded successfully');
                }}
              />
              <Text style={[styles.photoDate, { color: isDark ? colors.textDark : colors.text }]}>
                {formatDate(rightCheckIn.date)}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Date selectors */}
      <View style={styles.selectorsContainer}>
        {/* Left date selector */}
        <View style={styles.selectorWrapper}>
          <Text
            style={[
              styles.selectorLabel,
              { color: isDark ? colors.textSecondaryDark : colors.textSecondary },
            ]}
          >
            Left Date
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {checkIns.map((checkIn, index) => (
              <TouchableOpacity
                key={checkIn.id}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor:
                      leftDateIndex === index
                        ? colors.primary
                        : isDark
                        ? colors.backgroundDark
                        : colors.background,
                    borderColor:
                      leftDateIndex === index
                        ? colors.primary
                        : isDark
                        ? colors.borderDark
                        : colors.border,
                  },
                ]}
                onPress={() => setLeftDateIndex(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color:
                        leftDateIndex === index
                          ? '#FFFFFF'
                          : isDark
                          ? colors.textDark
                          : colors.text,
                    },
                  ]}
                >
                  {formatDate(checkIn.date)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Right date selector */}
        <View style={styles.selectorWrapper}>
          <Text
            style={[
              styles.selectorLabel,
              { color: isDark ? colors.textSecondaryDark : colors.textSecondary },
            ]}
          >
            Right Date
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {checkIns.map((checkIn, index) => (
              <TouchableOpacity
                key={checkIn.id}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor:
                      rightDateIndex === index
                        ? colors.primary
                        : isDark
                        ? colors.backgroundDark
                        : colors.background,
                    borderColor:
                      rightDateIndex === index
                        ? colors.primary
                        : isDark
                        ? colors.borderDark
                        : colors.border,
                  },
                ]}
                onPress={() => setRightDateIndex(index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    {
                      color:
                        rightDateIndex === index
                          ? '#FFFFFF'
                          : isDark
                          ? colors.textDark
                          : colors.text,
                    },
                  ]}
                >
                  {formatDate(checkIn.date)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
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
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  singlePhotoContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  singlePhotoMessage: {
    ...typography.caption,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  photoWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
  },
  photoDate: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  arrowContainer: {
    paddingHorizontal: spacing.xs,
  },
  selectorsContainer: {
    gap: spacing.md,
  },
  selectorWrapper: {
    gap: spacing.xs,
  },
  selectorLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  selectorScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
