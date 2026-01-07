
import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
import { colors } from "@/styles/commonStyles";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} 
      edges={['top']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <View style={[
          styles.profileHeader,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]}>
          <IconSymbol 
            ios_icon_name="person.circle.fill" 
            android_material_icon_name="person" 
            size={80} 
            color={isDark ? colors.dark.primary : colors.light.primary} 
          />
          <Text style={[styles.name, { color: isDark ? colors.dark.text : colors.light.text }]}>
            John Doe
          </Text>
          <Text style={[styles.email, { color: isDark ? '#98989D' : '#666' }]}>
            john.doe@example.com
          </Text>
        </View>

        <View style={[
          styles.section,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]}>
          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="phone.fill" 
              android_material_icon_name="phone" 
              size={20} 
              color={isDark ? '#98989D' : '#666'} 
            />
            <Text style={[styles.infoText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              +1 (555) 123-4567
            </Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="location.fill" 
              android_material_icon_name="location-on" 
              size={20} 
              color={isDark ? '#98989D' : '#666'} 
            />
            <Text style={[styles.infoText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              San Francisco, CA
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
  },
});
