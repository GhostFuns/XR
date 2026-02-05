import { useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Native module interface
interface VitureSDKModule {
  initialize(): Promise<VitureInitResult>;
  release(): Promise<boolean>;
  setIMUEnabled(enabled: boolean): Promise<boolean>;
  getIMUState(): Promise<boolean>;
  getLastIMUData(): Promise<IMUData>;
  isConnected(): Promise<boolean>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export interface IMUData {
  timestamp: number;
  roll: number;
  pitch: number;
  yaw: number;
  quaternionW: number;
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
}

export interface VitureInitResult {
  success: boolean;
  code: number;
  message: string;
  deviceName?: string;
  deviceType?: number;
}

export interface VitureState {
  isAvailable: boolean;
  isConnected: boolean;
  isInitializing: boolean;
  imuEnabled: boolean;
  mode3D: boolean;
  lastError: string | null;
  imuData: IMUData | null;
  deviceName: string | null;
}

export interface UseVitureReturn extends VitureState {
  initialize: () => Promise<VitureInitResult>;
  release: () => Promise<void>;
  toggleIMU: () => Promise<void>;
  toggle3D: () => Promise<void>;
  resetOrientation: () => void;
}

// Get native module
const { VitureSDK } = NativeModules as { VitureSDK?: VitureSDKModule };

// Check if native module is available
const isNativeAvailable = Platform.OS === 'android' && VitureSDK != null;

export function useViture(): UseVitureReturn {
  const [state, setState] = useState<VitureState>({
    isAvailable: isNativeAvailable,
    isConnected: false,
    isInitializing: false,
    imuEnabled: false,
    mode3D: false,
    lastError: isNativeAvailable ? null : 'Native SDK requires Android development build',
    imuData: null,
    deviceName: null,
  });

  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  const orientationOffsetRef = useRef({ roll: 0, pitch: 0, yaw: 0 });

  // Setup event listeners
  useEffect(() => {
    if (!isNativeAvailable || !VitureSDK) return;

    eventEmitterRef.current = new NativeEventEmitter(NativeModules.VitureSDK);

    // IMU data listener
    const imuSubscription = eventEmitterRef.current.addListener(
      'onVitureIMU',
      (data: IMUData) => {
        // Apply orientation offset
        const adjustedData: IMUData = {
          ...data,
          roll: data.roll - orientationOffsetRef.current.roll,
          pitch: data.pitch - orientationOffsetRef.current.pitch,
          yaw: data.yaw - orientationOffsetRef.current.yaw,
        };
        setState((prev) => ({ ...prev, imuData: adjustedData }));
      }
    );

    // Event listener (connection, disconnection, etc.)
    const eventSubscription = eventEmitterRef.current.addListener(
      'onVitureEvent',
      (event: { type: string; deviceName?: string; deviceType?: number }) => {
        console.log('[useViture] Event:', event);
        switch (event.type) {
          case 'connected':
            setState((prev) => ({
              ...prev,
              isConnected: true,
              isInitializing: false,
              deviceName: event.deviceName || 'Viture Glasses',
              lastError: null,
            }));
            break;
          case 'disconnected':
            setState((prev) => ({
              ...prev,
              isConnected: false,
              imuEnabled: false,
              imuData: null,
              deviceName: null,
            }));
            break;
          case 'permission_denied':
            setState((prev) => ({
              ...prev,
              isInitializing: false,
              lastError: 'USB permission denied. Please allow access.',
            }));
            break;
        }
      }
    );

    // State change listener
    const stateSubscription = eventEmitterRef.current.addListener(
      'onVitureState',
      (state: { stateId: number; value: number }) => {
        console.log('[useViture] State change:', state);
        // Handle specific state changes here if needed
      }
    );

    return () => {
      imuSubscription.remove();
      eventSubscription.remove();
      stateSubscription.remove();
    };
  }, []);

  const initialize = useCallback(async (): Promise<VitureInitResult> => {
    if (!isNativeAvailable || !VitureSDK) {
      return {
        success: false,
        code: -999,
        message: 'Viture SDK requires Android development build. Build with: npx expo run:android',
      };
    }

    setState((prev) => ({ ...prev, isInitializing: true, lastError: null }));

    try {
      const result = await VitureSDK.initialize();
      console.log('[useViture] Initialize result:', result);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isInitializing: false,
          deviceName: result.deviceName || 'Viture Glasses',
          lastError: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isInitializing: false,
          lastError: result.message,
        }));
      }

      return result;
    } catch (error: any) {
      const message = error?.message || 'Unknown error during initialization';
      setState((prev) => ({
        ...prev,
        isInitializing: false,
        lastError: message,
      }));
      return {
        success: false,
        code: -1,
        message,
      };
    }
  }, []);

  const release = useCallback(async () => {
    if (!isNativeAvailable || !VitureSDK) return;

    try {
      await VitureSDK.release();
      setState((prev) => ({
        ...prev,
        isConnected: false,
        imuEnabled: false,
        imuData: null,
        deviceName: null,
      }));
    } catch (error) {
      console.error('[useViture] Release error:', error);
    }
  }, []);

  const toggleIMU = useCallback(async () => {
    if (!isNativeAvailable || !VitureSDK || !state.isConnected) return;

    try {
      const newState = !state.imuEnabled;
      await VitureSDK.setIMUEnabled(newState);
      setState((prev) => ({ ...prev, imuEnabled: newState }));
    } catch (error: any) {
      console.error('[useViture] Toggle IMU error:', error);
      setState((prev) => ({ ...prev, lastError: error?.message }));
    }
  }, [state.isConnected, state.imuEnabled]);

  const toggle3D = useCallback(async () => {
    // 3D mode toggle - this would require additional SDK support
    // For now, just toggle the local state
    setState((prev) => ({ ...prev, mode3D: !prev.mode3D }));
  }, []);

  const resetOrientation = useCallback(() => {
    if (state.imuData) {
      orientationOffsetRef.current = {
        roll: state.imuData.roll + orientationOffsetRef.current.roll,
        pitch: state.imuData.pitch + orientationOffsetRef.current.pitch,
        yaw: state.imuData.yaw + orientationOffsetRef.current.yaw,
      };
      // Immediately update the display to show zeroed values
      setState((prev) => ({
        ...prev,
        imuData: prev.imuData ? { ...prev.imuData, roll: 0, pitch: 0, yaw: 0 } : null,
      }));
    }
  }, [state.imuData]);

  return {
    ...state,
    initialize,
    release,
    toggleIMU,
    toggle3D,
    resetOrientation,
  };
}

export default useViture;
