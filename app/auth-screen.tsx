import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { Apple, Mail, Eye, EyeOff } from 'lucide-react-native';

export default function AuthScreen() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

  const handleEmailAuth = async () => {
    console.log('[AuthScreen] Email auth pressed, mode:', mode);
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, name.trim());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    console.log('[AuthScreen] Apple sign in pressed');
    setError('');
    setSocialLoading('apple');
    try {
      await signInWithApple();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Apple sign in failed';
      if (!msg.includes('cancel')) setError(msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogle = async () => {
    console.log('[AuthScreen] Google sign in pressed');
    setError('');
    setSocialLoading('google');
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      if (!msg.includes('cancel')) setError(msg);
    } finally {
      setSocialLoading(null);
    }
  };

  const toggleMode = () => {
    setMode(m => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior="padding">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 8px 24px rgba(255,107,53,0.35)',
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>MG</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 6 }}>
            Macro Goal
          </Text>
          <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' }}>
            Track your nutrition. Reach your goals.
          </Text>
        </View>

        {/* Social Buttons */}
        <AnimatedPressable
          onPress={handleApple}
          disabled={!!socialLoading}
          style={{
            backgroundColor: '#000',
            borderRadius: 14,
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          {socialLoading === 'apple' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Apple size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Continue with Apple</Text>
            </>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          onPress={handleGoogle}
          disabled={!!socialLoading}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            marginBottom: 24,
            borderWidth: 1.5,
            borderColor: COLORS.border,
          }}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>G</Text>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600' }}>Continue with Google</Text>
            </>
          )}
        </AnimatedPressable>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
          <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontWeight: '500' }}>or continue with email</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
        </View>

        {/* Email Form */}
        {mode === 'signup' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="words"
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            />
          </View>
        )}

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Email *</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>Password *</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textTertiary}
              secureTextEntry={!showPassword}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                paddingRight: 52,
                fontSize: 16,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            />
            <AnimatedPressable
              onPress={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 14, top: 14 }}
            >
              {showPassword ? (
                <EyeOff size={20} color={COLORS.textTertiary} />
              ) : (
                <Eye size={20} color={COLORS.textTertiary} />
              )}
            </AnimatedPressable>
          </View>
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.2)',
            }}
          >
            <Text style={{ color: COLORS.danger, fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        <AnimatedPressable
          onPress={handleEmailAuth}
          disabled={submitting}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </AnimatedPressable>

        <AnimatedPressable onPress={toggleMode} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 15, color: COLORS.textSecondary }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
