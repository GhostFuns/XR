import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { HUDWidget } from '../../src/components/HUDWidget';
import { GlowButton } from '../../src/components/GlowButton';
import { getMemories, deleteMemory, updateMemory } from '../../src/utils/api';

interface MemoryItem {
  id: string;
  object_type: string;
  description: string;
  notes?: string;
  first_seen: string;
  last_seen: string;
  encounter_count: number;
  tags: string[];
  image_thumbnail?: string;
}

export default function MemoryScreen() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);

  const loadMemories = useCallback(async (search?: string) => {
    try {
      const data = await getMemories(100, search || undefined);
      setMemories(data);
    } catch (error: any) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMemories(searchQuery);
  };

  const handleSearch = () => {
    setLoading(true);
    loadMemories(searchQuery);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMemory(id);
              setMemories(prev => prev.filter(m => m.id !== id));
              if (selectedMemory?.id === id) setSelectedMemory(null);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete memory');
            }
          },
        },
      ]
    );
  };

  const renderMemoryCard = (memory: MemoryItem) => {
    const isSelected = selectedMemory?.id === memory.id;
    
    return (
      <HUDWidget
        key={memory.id}
        glowing={isSelected}
        onPress={() => setSelectedMemory(isSelected ? null : memory)}
        style={[styles.memoryCard, isSelected && styles.memoryCardSelected]}
      >
        <View style={styles.memoryHeader}>
          {memory.image_thumbnail ? (
            <Image
              source={{ uri: memory.image_thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="cube" size={24} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.memoryInfo}>
            <Text style={styles.objectType}>{memory.object_type}</Text>
            <Text style={styles.encounterCount}>
              {memory.encounter_count}x encountered
            </Text>
          </View>
          <GlowButton
            icon="trash-outline"
            onPress={() => handleDelete(memory.id)}
            color={COLORS.danger}
            variant="ghost"
            size="small"
            iconOnly
          />
        </View>

        {isSelected && (
          <View style={styles.memoryDetails}>
            <Text style={styles.description}>{memory.description}</Text>
            
            {memory.notes && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Notes:</Text>
                <Text style={styles.notesText}>{memory.notes}</Text>
              </View>
            )}

            {memory.tags && memory.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {memory.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.timestamps}>
              <Text style={styles.timestampText}>
                First seen: {format(new Date(memory.first_seen), 'MMM d, yyyy HH:mm')}
              </Text>
              <Text style={styles.timestampText}>
                Last seen: {format(new Date(memory.last_seen), 'MMM d, yyyy HH:mm')}
              </Text>
            </View>
          </View>
        )}
      </HUDWidget>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Ionicons name="brain" size={24} color={COLORS.accent} />
          <Text style={styles.headerTitle}>CONTEXTUAL MEMORY</Text>
        </View>
      </SafeAreaView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search memories..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <GlowButton
              icon="close-circle"
              onPress={() => {
                setSearchQuery('');
                loadMemories();
              }}
              color={COLORS.textMuted}
              variant="ghost"
              size="small"
              iconOnly
            />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{memories.length}</Text>
            <Text style={styles.statLabel}>Total Memories</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {memories.reduce((acc, m) => acc + m.encounter_count, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Encounters</Text>
          </View>
        </View>

        {/* Memory List */}
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading memories...</Text>
          </View>
        ) : memories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Memories Yet</Text>
            <Text style={styles.emptyText}>
              Objects you recognize and save will appear here.
              Use the Recognize tab to start building your contextual memory.
            </Text>
          </View>
        ) : (
          <View style={styles.memoryList}>
            {memories.map(renderMemoryCard)}
          </View>
        )}

        {/* Info Card */}
        <HUDWidget
          title="About Contextual Memory"
          icon="information-circle-outline"
          iconColor={COLORS.textSecondary}
          transparent
          style={styles.infoCard}
        >
          <Text style={styles.infoText}>
            Contextual Memory stores information about objects you've identified.
            When you encounter them again, the HUD can display relevant notes and history.
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
              <Text style={styles.featureText}>Auto-tracks encounter frequency</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
              <Text style={styles.featureText}>Add custom notes to objects</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
              <Text style={styles.featureText}>Tag-based organization</Text>
            </View>
          </View>
        </HUDWidget>
      </ScrollView>
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
    color: COLORS.accent,
    letterSpacing: 2,
  },
  searchContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  memoryList: {
    gap: SPACING.md,
  },
  memoryCard: {},
  memoryCardSelected: {
    borderColor: COLORS.accent,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryInfo: {
    flex: 1,
  },
  objectType: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  encounterCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
  memoryDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  notesSection: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  notesLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  notesText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.primaryGlow,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.primary,
  },
  timestamps: {
    marginTop: SPACING.xs,
  },
  timestampText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  featureList: {
    gap: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});
