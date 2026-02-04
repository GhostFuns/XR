import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, LANGUAGE_CONFIG, LanguageCode } from '../constants/theme';

interface LanguageSelectorProps {
  selectedLanguage: LanguageCode;
  onSelect: (lang: LanguageCode) => void;
  availableLanguages?: LanguageCode[];
  label?: string;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelect,
  availableLanguages = ['en', 'es', 'ja', 'de', 'ru'],
  label,
  compact = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedConfig = LANGUAGE_CONFIG[selectedLanguage];

  const renderLanguageItem = ({ item }: { item: LanguageCode }) => {
    const config = LANGUAGE_CONFIG[item];
    const isSelected = item === selectedLanguage;

    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          isSelected && { borderColor: config.color, backgroundColor: `${config.color}20` },
        ]}
        onPress={() => {
          onSelect(item);
          setModalVisible(false);
        }}
      >
        <Text style={styles.flag}>{config.flag}</Text>
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, { color: config.color }]}>
            {config.name}
          </Text>
          <Text style={styles.languageCode}>{config.code}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={config.color} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[
          styles.selector,
          compact && styles.selectorCompact,
          { borderColor: selectedConfig.color },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectedFlag}>{selectedConfig.flag}</Text>
        {!compact && (
          <Text style={[styles.selectedName, { color: selectedConfig.color }]}>
            {selectedConfig.name}
          </Text>
        )}
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableLanguages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.languageList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  selectorCompact: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  selectedFlag: {
    fontSize: 20,
  },
  selectedName: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  languageList: {
    padding: SPACING.md,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  flag: {
    fontSize: 28,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  languageCode: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
});
