import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { COLORS, SPACING, FONTS, LANGUAGE_CONFIG, LanguageCode } from '../../src/constants/theme';
import { HUDWidget } from '../../src/components/HUDWidget';
import { GlowButton } from '../../src/components/GlowButton';
import { LanguageSelector } from '../../src/components/LanguageSelector';
import { useHUDStore } from '../../src/store/hudStore';
import { translateText } from '../../src/utils/api';

export default function TranslateScreen() {
  const {
    nativeLanguage,
    targetLanguage,
    setNativeLanguage,
    setTargetLanguage,
    isListening,
    setIsListening,
    isProcessing,
    setIsProcessing,
    voiceFeedback,
  } = useHUDStore();

  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [recentTranslations, setRecentTranslations] = useState<Array<{
    original: string;
    translated: string;
    from: LanguageCode;
    to: LanguageCode;
  }>>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    // Request audio permissions on mount
    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      Alert.alert('Error', 'Please enter text to translate');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await translateText(inputText, nativeLanguage, targetLanguage);
      setTranslatedText(result.translated_text);
      
      // Add to recent translations
      setRecentTranslations(prev => [{
        original: inputText,
        translated: result.translated_text,
        from: nativeLanguage,
        to: targetLanguage,
      }, ...prev.slice(0, 9)]);

      // Speak the translation if voice feedback is enabled
      if (voiceFeedback) {
        speakText(result.translated_text, targetLanguage);
      }
    } catch (error: any) {
      Alert.alert('Translation Error', error.message || 'Failed to translate');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string, language: LanguageCode) => {
    const langConfig = LANGUAGE_CONFIG[language];
    Speech.speak(text, {
      language: langConfig.code,
      rate: 0.9,
      pitch: 1.0,
    });
  };

  const swapLanguages = () => {
    const temp = nativeLanguage;
    setNativeLanguage(targetLanguage);
    setTargetLanguage(temp as LanguageCode);
    // Also swap the texts
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const clearAll = () => {
    setInputText('');
    setTranslatedText('');
  };

  const nativeLangConfig = LANGUAGE_CONFIG[nativeLanguage];
  const targetLangConfig = LANGUAGE_CONFIG[targetLanguage];

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Ionicons name="language" size={24} color={COLORS.primary} />
          <Text style={styles.headerTitle}>TRANSLATOR</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language Selector Row */}
          <View style={styles.languageSelectorRow}>
            <View style={styles.languageSelectorBox}>
              <LanguageSelector
                selectedLanguage={nativeLanguage}
                onSelect={setNativeLanguage}
                label="FROM"
              />
            </View>
            
            <GlowButton
              icon="swap-horizontal"
              onPress={swapLanguages}
              color={COLORS.primary}
              variant="outline"
              size="small"
              iconOnly
            />
            
            <View style={styles.languageSelectorBox}>
              <LanguageSelector
                selectedLanguage={targetLanguage}
                onSelect={setTargetLanguage}
                availableLanguages={['es', 'ja', 'de', 'ru']}
                label="TO"
              />
            </View>
          </View>

          {/* Input Section */}
          <HUDWidget
            title={`Input (${nativeLangConfig.name})`}
            icon="create-outline"
            iconColor={nativeLangConfig.color}
            style={styles.inputWidget}
          >
            <TextInput
              style={styles.textInput}
              placeholder="Type or speak your message..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.inputActions}>
              <GlowButton
                icon="mic"
                onPress={() => Alert.alert('Voice Input', 'Hold to speak (feature coming soon)')}
                color={isListening ? COLORS.danger : COLORS.accent}
                variant="ghost"
                size="small"
                iconOnly
              />
              <GlowButton
                icon="close-circle"
                onPress={clearAll}
                color={COLORS.textMuted}
                variant="ghost"
                size="small"
                iconOnly
              />
            </View>
          </HUDWidget>

          {/* Translate Button */}
          <GlowButton
            title={isProcessing ? 'TRANSLATING...' : 'TRANSLATE'}
            icon="arrow-forward"
            onPress={handleTranslate}
            color={COLORS.primary}
            loading={isProcessing}
            disabled={!inputText.trim()}
            size="large"
            style={styles.translateButton}
          />

          {/* Output Section */}
          <HUDWidget
            title={`Translation (${targetLangConfig.name})`}
            icon="text-outline"
            iconColor={targetLangConfig.color}
            glowing={!!translatedText}
            style={styles.outputWidget}
          >
            {translatedText ? (
              <>
                <Text style={styles.translatedText}>{translatedText}</Text>
                <View style={styles.outputActions}>
                  <GlowButton
                    icon="volume-high"
                    title="Speak"
                    onPress={() => speakText(translatedText, targetLanguage)}
                    color={targetLangConfig.color}
                    variant="outline"
                    size="small"
                  />
                  <GlowButton
                    icon="copy"
                    title="Copy"
                    onPress={() => Alert.alert('Copied', 'Translation copied to clipboard')}
                    color={COLORS.textSecondary}
                    variant="ghost"
                    size="small"
                  />
                </View>
              </>
            ) : (
              <Text style={styles.placeholderText}>
                Translation will appear here...
              </Text>
            )}
          </HUDWidget>

          {/* Recent Translations */}
          {recentTranslations.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>RECENT TRANSLATIONS</Text>
              {recentTranslations.slice(0, 5).map((item, index) => (
                <HUDWidget key={index} compact transparent style={styles.recentItem}>
                  <View style={styles.recentItemHeader}>
                    <Text style={styles.recentLangBadge}>
                      {LANGUAGE_CONFIG[item.from].flag} → {LANGUAGE_CONFIG[item.to].flag}
                    </Text>
                  </View>
                  <Text style={styles.recentOriginal} numberOfLines={1}>
                    {item.original}
                  </Text>
                  <Text style={styles.recentTranslated} numberOfLines={1}>
                    {item.translated}
                  </Text>
                </HUDWidget>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSafe: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    letterSpacing: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  languageSelectorRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.md,
  },
  languageSelectorBox: {
    flex: 1,
  },
  inputWidget: {
    minHeight: 150,
  },
  textInput: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  translateButton: {
    alignSelf: 'center',
    minWidth: 200,
  },
  outputWidget: {
    minHeight: 120,
  },
  translatedText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  placeholderText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  outputActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  recentSection: {
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  recentItem: {
    gap: SPACING.xs,
  },
  recentItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentLangBadge: {
    fontSize: FONTS.sizes.sm,
  },
  recentOriginal: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  recentTranslated: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium,
  },
});
