
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { supabase } from "@/app/integrations/supabase/client";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();
        setIsPremium(profile?.is_premium || false);
      }
    } catch (error) {
      console.error('[Profile] Error loading user data:', error);
    }
  };

  /**
   * Safe subscription handler with proper error handling
   * This function is explicitly defined and cannot be undefined
   */
  const handleSubscribe = async () => {
    // Guard: Prevent double-clicks
    if (loading) {
      console.log('[Profile] Already processing subscription, ignoring click');
      return;
    }

    try {
      setLoading(true);
      console.log('[Profile] Starting subscription flow...');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('[Profile] No user found');
        Alert.alert("Error", "Please log in to subscribe.");
        return;
      }

      console.log('[Profile] User authenticated, creating checkout session...');

      // Call the create-checkout-session Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { user_id: user.id, plan: 'monthly' }
      });

      if (error) {
        console.error('[Profile] Edge Function error:', error);
        throw error;
      }

      if (data?.url) {
        console.log('[Profile] Checkout URL received, opening browser...');
        // Open Stripe Checkout URL
        const { Linking } = require('react-native');
        await Linking.openURL(data.url);
        console.log('[Profile] Browser opened successfully');
      } else {
        console.error('[Profile] No checkout URL in response:', data);
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error('[Profile] Subscription error:', error);
      Alert.alert(
        "Subscription Error",
        "Subscription is not available right now. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Show subscription confirmation alert
   * This is the function called by the Subscribe button
   */
  const showSubscriptionAlert = () => {
    console.log('[Profile] Showing subscription alert');
    
    // Guard: Ensure handleSubscribe is defined
    if (typeof handleSubscribe !== 'function') {
      console.error('[Profile] CRITICAL: handleSubscribe is not a function!');
      Alert.alert(
        "Error",
        "Subscription is not available right now. Please try again.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Upgrade to Premium",
      "Unlock advanced analytics, custom recipes, and more!",
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('[Profile] Subscription cancelled by user')
        },
        { 
          text: 'Continue', 
          onPress: () => {
            console.log('[Profile] User confirmed subscription, calling handleSubscribe');
            handleSubscribe();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="person" size={80} color={theme.colors.primary} />
          <Text style={[styles.name, { color: theme.colors.text }]}>Elite Macro Tracker</Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>{userEmail}</Text>
          
          {isPremium ? (
            <View style={[styles.premiumBadge, { backgroundColor: theme.colors.primary }]}>
              <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace-premium" size={16} color="#FFF" />
              <Text style={styles.premiumText}>Premium Member</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.subscribeButton, { backgroundColor: theme.colors.primary }]}
              onPress={showSubscriptionAlert}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace-premium" size={20} color="#FFF" />
                  <Text style={styles.subscribeText}>Upgrade to Premium</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </GlassView>

        <GlassView style={[
          styles.section,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <TouchableOpacity style={styles.infoRow}>
            <IconSymbol ios_icon_name="gear" android_material_icon_name="settings" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.infoRow}>
            <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={20} color={theme.dark ? '#98989D' : '#666'} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>Notifications</Text>
          </TouchableOpacity>
        </GlassView>
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
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  subscribeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
  },
  premiumText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 16,
  },
});
