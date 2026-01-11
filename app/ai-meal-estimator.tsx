
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { Audio } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/app/integrations/supabase/client';

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const handleAnalyze = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Error', 'Please describe your meal');
      return;
    }

    setIsAnalyzing(true);
    try {
      // TODO: Backend Integration - Call the AI meal estimation API endpoint here
      // Placeholder result for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResult({
        calories: 450,
        protein: 25,
        carbs: 45,
        fats: 15,
        fiber: 5,
      });
    } catch (error) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      Alert.alert('Error', 'Failed to analyze meal');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      console.log('[AIMealEstimator] Requesting audio permissions...');
      const { granted } = await Audio.requestPermissionsAsync();
      
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record audio. Please enable it in Settings.'
        );
        return;
      }

      console.log('[AIMealEstimator] Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[AIMealEstimator] Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      console.log('[AIMealEstimator] Recording started successfully');
    } catch (error: any) {
      console.error('[AIMealEstimator] Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording: ' + error.message);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('[AIMealEstimator] Stopping recording...');
      
      if (!recordingRef.current) {
        console.error('[AIMealEstimator] No active recording');
        Alert.alert('Error', 'No active recording found');
        return;
      }

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        console.error('[AIMealEstimator] No recording URI');
        Alert.alert('Error', 'Failed to save recording');
        return;
      }

      console.log('[AIMealEstimator] Recording saved to:', uri);
      
      // Transcribe the audio
      await transcribeAudio(uri);
    } catch (error: any) {
      console.error('[AIMealEstimator] Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording: ' + error.message);
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    
    try {
      console.log('[AIMealEstimator] Starting transcription process...');
      console.log('[AIMealEstimator] Audio URI:', audioUri);
      
      // Verify file exists
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('[AIMealEstimator] File info:', JSON.stringify(fileInfo));
      
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      if (fileInfo.size && fileInfo.size < 1000) {
        throw new Error('Recording is too short. Please speak for at least 1 second.');
      }

      console.log('[AIMealEstimator] Reading audio file as base64...');
      
      // Read the audio file as base64 using legacy FileSystem
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[AIMealEstimator] Audio base64 length:', audioBase64.length);

      if (!audioBase64 || audioBase64.length < 100) {
        throw new Error('Audio file is empty or too short');
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'Please log in to use voice input');
        return;
      }

      console.log('[AIMealEstimator] Calling transcription API...');

      // Call the transcription edge function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audioBase64,
          mimeType: 'audio/m4a',
        },
      });

      console.log('[AIMealEstimator] Transcription API response:', { data, error });

      if (error) {
        console.error('[AIMealEstimator] Transcription error:', error);
        
        // Handle specific error cases
        if (error.message?.includes('Subscription Required') || error.message?.includes('403')) {
          Alert.alert(
            'Premium Feature',
            'Voice input is a premium feature. Please upgrade to use this feature.'
          );
        } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          Alert.alert('Error', 'Please log in again to use voice input');
        } else {
          Alert.alert('Error', 'Failed to transcribe audio: ' + (error.message || 'Unknown error'));
        }
        return;
      }

      if (data && data.text) {
        console.log('[AIMealEstimator] Transcription successful:', data.text);
        
        // Append transcribed text to the meal description
        setMealDescription(prev => {
          const newText = prev ? `${prev} ${data.text}` : data.text;
          return newText;
        });
        
        // Show success feedback
        Alert.alert('Success', 'Voice transcribed successfully!');
      } else {
        console.error('[AIMealEstimator] No transcription text received');
        Alert.alert('Error', 'Could not transcribe audio. Please try again.');
      }
    } catch (error: any) {
      console.error('[AIMealEstimator] Error transcribing audio:', error);
      Alert.alert('Error', error.message || 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
      
      // Clean up the audio file
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
        console.log('[AIMealEstimator] Audio file cleaned up');
      } catch (cleanupError) {
        console.warn('[AIMealEstimator] Failed to delete audio file:', cleanupError);
      }
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow-back" 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          AI Meal Estimator
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.label, { color: colors.text }]}>
          Describe your meal
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundAlt,
                color: colors.text,
                borderColor: colors.grey,
              },
            ]}
            placeholder="e.g., Grilled chicken breast with rice and broccoli"
            placeholderTextColor={colors.grey}
            value={mealDescription}
            onChangeText={setMealDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isTranscribing}
          />
          
          <TouchableOpacity
            style={[
              styles.micButton,
              {
                backgroundColor: isRecording ? '#ef4444' : colors.primary,
              },
              (isTranscribing || isAnalyzing) && styles.micButtonDisabled,
            ]}
            onPress={handleMicPress}
            disabled={isTranscribing || isAnalyzing}
          >
            {isTranscribing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <IconSymbol
                ios_icon_name={isRecording ? 'stop.circle.fill' : 'mic.fill'}
                android_material_icon_name={isRecording ? 'stop' : 'mic'}
                size={24}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        </View>

        {isRecording && (
          <Text style={[styles.recordingText, { color: '#ef4444' }]}>
            🔴 Recording... Tap the microphone to stop
          </Text>
        )}

        {isTranscribing && (
          <Text style={[styles.recordingText, { color: colors.primary }]}>
            ⏳ Transcribing audio...
          </Text>
        )}

        <TouchableOpacity
          style={[styles.analyzeButton, (isAnalyzing || isTranscribing || isRecording) && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={isAnalyzing || isTranscribing || isRecording}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
          )}
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { backgroundColor: colors.backgroundAlt }]}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              Estimated Nutrition
            </Text>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Calories
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.calories} kcal
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Protein
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.protein}g
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Carbs
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.carbs}g
              </Text>
            </View>
            <View style={styles.macroRow}>
              <Text style={[styles.macroLabel, { color: colors.grey }]}>
                Fats
              </Text>
              <Text style={[styles.macroValue, { color: colors.text }]}>
                {result.fats}g
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  label: {
    fontSize: typography.md,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingRight: 60,
    fontSize: typography.md,
    minHeight: 120,
  },
  micButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  recordingText: {
    fontSize: typography.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  analyzeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: typography.md,
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  resultTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  macroLabel: {
    fontSize: typography.md,
  },
  macroValue: {
    fontSize: typography.md,
    fontWeight: '500',
  },
});
