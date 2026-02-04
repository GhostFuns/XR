import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SPACING, FONTS } from '../../src/constants/theme';
import { HUDWidget } from '../../src/components/HUDWidget';
import { GlowButton } from '../../src/components/GlowButton';
import { useHUDStore } from '../../src/store/hudStore';
import { recognizeObjects, createMemory } from '../../src/utils/api';

const { width } = Dimensions.get('window');
const CAMERA_HEIGHT = width * 0.75;

export default function RecognizeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { setLastRecognition } = useHUDStore();

  const captureImage = async () => {
    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Camera not ready', 'Please wait for camera to initialize');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
      });
      
      if (photo?.base64) {
        setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
        setRecognitionResult(null);
      }
    } catch (error: any) {
      Alert.alert('Capture Error', error.message || 'Failed to capture image');
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) {
      Alert.alert('No Image', 'Please capture an image first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await recognizeObjects(capturedImage);
      setRecognitionResult(result);
      setLastRecognition(result);
    } catch (error: any) {
      Alert.alert('Analysis Error', error.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToMemory = async () => {
    if (!recognitionResult) return;

    try {
      const mainObject = recognitionResult.objects_detected?.[0];
      await createMemory({
        object_type: mainObject?.name || 'Unknown Object',
        description: recognitionResult.description,
        tags: recognitionResult.objects_detected?.map((o: any) => o.name) || [],
        image_thumbnail: capturedImage || undefined,
      });
      Alert.alert('Saved', 'Object saved to contextual memory!');
    } catch (error: any) {
      Alert.alert('Save Error', error.message || 'Failed to save to memory');
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setRecognitionResult(null);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
          <Text style={styles.permissionText}>Loading camera permissions...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            <Ionicons name="eye" size={24} color={COLORS.secondary} />
            <Text style={styles.headerTitle}>OBJECT RECOGNITION</Text>
          </View>
        </SafeAreaView>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={COLORS.primary} />
          <Text style={styles.permissionText}>
            Camera access is required for object recognition
          </Text>
          <GlowButton
            title="Grant Permission"
            icon="camera"
            onPress={requestPermission}
            color={COLORS.primary}
            size="large"
            style={{ marginTop: SPACING.lg }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Ionicons name="eye" size={24} color={COLORS.secondary} />
          <Text style={styles.headerTitle}>OBJECT RECOGNITION</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Camera / Preview Section */}
        <View style={styles.cameraContainer}>
          {capturedImage ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: capturedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.previewOverlay}>
                <GlowButton
                  icon="close"
                  onPress={resetCapture}
                  color={COLORS.danger}
                  variant="ghost"
                  size="small"
                  iconOnly
                  style={styles.closeButton}
                />
              </View>
            </View>
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
            >
              {/* Camera overlay grid */}
              <View style={styles.cameraOverlay}>
                <View style={styles.gridLine} />
                <View style={[styles.gridLine, styles.gridLineVertical]} />
                <View style={styles.crosshair}>
                  <Ionicons name="scan-outline" size={80} color={COLORS.primary} />
                </View>
                <Text style={styles.cameraHint}>Point at an object to identify</Text>
              </View>
            </CameraView>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {capturedImage ? (
            <>
              <GlowButton
                title="Retake"
                icon="camera-reverse"
                onPress={resetCapture}
                color={COLORS.textSecondary}
                variant="outline"
                style={styles.actionButton}
              />
              <GlowButton
                title={isAnalyzing ? 'Analyzing...' : 'Analyze'}
                icon="sparkles"
                onPress={analyzeImage}
                color={COLORS.secondary}
                loading={isAnalyzing}
                style={styles.actionButton}
              />
            </>
          ) : (
            <GlowButton
              title="Capture"
              icon="camera"
              onPress={captureImage}
              color={COLORS.primary}
              size="large"
              disabled={!cameraReady}
              style={styles.captureButton}
            />
          )}
        </View>

        {/* Recognition Results */}
        {recognitionResult && (
          <HUDWidget
            title="Analysis Results"
            icon="analytics-outline"
            iconColor={COLORS.accent}
            glowing
            style={styles.resultsWidget}
          >
            {/* Scene Description */}
            <Text style={styles.descriptionText}>
              {recognitionResult.description}
            </Text>

            {/* Detected Objects */}
            {recognitionResult.objects_detected?.length > 0 && (
              <View style={styles.objectsSection}>
                <Text style={styles.subSectionTitle}>DETECTED OBJECTS</Text>
                {recognitionResult.objects_detected.map((obj: any, index: number) => (
                  <View key={index} style={styles.objectItem}>
                    <View style={styles.objectBadge}>
                      <Ionicons name="cube-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.objectName}>{obj.name}</Text>
                    </View>
                    <Text style={styles.objectDescription}>{obj.description}</Text>
                    {obj.confidence && (
                      <Text style={[
                        styles.confidenceBadge,
                        { color: obj.confidence === 'high' ? COLORS.accent : COLORS.warning }
                      ]}>
                        {obj.confidence.toUpperCase()}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Suggestions */}
            {recognitionResult.suggestions?.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.subSectionTitle}>INSIGHTS</Text>
                {recognitionResult.suggestions.map((suggestion: string, index: number) => (
                  <View key={index} style={styles.suggestionItem}>
                    <Ionicons name="bulb-outline" size={14} color={COLORS.warning} />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Save to Memory Button */}
            <GlowButton
              title="Save to Memory"
              icon="brain"
              onPress={saveToMemory}
              color={COLORS.accent}
              variant="outline"
              style={styles.saveButton}
            />
          </HUDWidget>
        )}

        {/* Instructions */}
        {!capturedImage && !recognitionResult && (
          <HUDWidget
            title="How to Use"
            icon="help-circle-outline"
            iconColor={COLORS.textSecondary}
            transparent
          >
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>1</Text>
                <Text style={styles.instructionText}>Point camera at any object</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>2</Text>
                <Text style={styles.instructionText}>Tap Capture to take a photo</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>3</Text>
                <Text style={styles.instructionText}>Tap Analyze to identify objects</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>4</Text>
                <Text style={styles.instructionText}>Save interesting findings to Memory</Text>
              </View>
            </View>
          </HUDWidget>
        )}
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
    color: COLORS.secondary,
    letterSpacing: 2,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  permissionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  cameraContainer: {
    width: '100%',
    height: CAMERA_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: COLORS.primaryGlow,
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  crosshair: {
    opacity: 0.8,
  },
  cameraHint: {
    position: 'absolute',
    bottom: SPACING.lg,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surfaceGlass,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  previewContainer: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    flex: 1,
  },
  previewOverlay: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  closeButton: {},
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    maxWidth: 160,
  },
  captureButton: {
    minWidth: 200,
  },
  resultsWidget: {},
  descriptionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  objectsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  subSectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  objectItem: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 12,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  objectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  objectName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  objectDescription: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  confidenceBadge: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 1,
  },
  suggestionsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  saveButton: {
    marginTop: SPACING.lg,
    alignSelf: 'center',
  },
  instructionsList: {
    gap: SPACING.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryGlow,
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    textAlign: 'center',
    lineHeight: 28,
  },
  instructionText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});
