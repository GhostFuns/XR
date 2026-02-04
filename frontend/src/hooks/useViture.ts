import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import Viture, { IMUData, VitureInitResult, VitureEventData } from '../native/VitureSDK';

export interface VitureState {
  isAvailable: boolean;
  isConnected: boolean;
  isInitializing: boolean;
  imuEnabled: boolean;
  mode3D: boolean;
  lastError: string | null;
  imuData: IMUData | null;
}

export interface UseVitureReturn extends VitureState {
  initialize: () => Promise<VitureInitResult>;
  release: () => Promise<void>;
  toggleIMU: () => Promise<void>;
  toggle3D: () => Promise<void>;
  resetOrientation: () => void;
}

export function useViture(): UseVitureReturn {
  const [state, setState] = useState<VitureState>({
    isAvailable: false,
    isConnected: false,
    isInitializing: false,
    imuEnabled: false,
    mode3D: false,
    lastError: null,
    imuData: null,
  });

  const initialOrientationRef = useRef<{ yaw: number; pitch: number; roll: number } | null>(null);

  useEffect(() => {
    // Check if SDK is available on mount
    const available = Viture.isAvailable();
    setState((s) => ({ ...s, isAvailable: available }));

    if (!available) {
      setState((s) => ({
        ...s,
        lastError:
          Platform.OS === 'android'
            ? 'Viture SDK requires a development build. Run: npx expo run:android'
            : 'Viture SDK is only available on Android',
      }));
      return;
    }

    // Subscribe to IMU data
    const unsubIMU = Viture.onIMUData((data) => {
      setState((s) => ({ ...s, imuData: data }));
    });

    // Subscribe to events
    const unsubEvent = Viture.onEvent((event) => {
      if (event.type === 'disconnect') {
        setState((s) => ({ ...s, isConnected: false }));
      }
    });

    return () => {
      unsubIMU();
      unsubEvent();
    };
  }, []);

  const initialize = useCallback(async (): Promise<VitureInitResult> => {
    if (!state.isAvailable) {
      return {
        success: false,
        code: -999,
        message: 'SDK not available',
      };
    }

    setState((s) => ({ ...s, isInitializing: true, lastError: null }));

    try {
      const result = await Viture.initialize();

      if (result.success) {
        const imuState = await Viture.getIMUState();
        const mode3D = await Viture.get3DState();

        setState((s) => ({
          ...s,
          isConnected: true,
          isInitializing: false,
          imuEnabled: imuState,
          mode3D,
        }));
      } else {
        setState((s) => ({
          ...s,
          isConnected: false,
          isInitializing: false,
          lastError: result.message,
        }));
      }

      return result;
    } catch (error: any) {
      const message = error.message || 'Failed to initialize';
      setState((s) => ({
        ...s,
        isInitializing: false,
        lastError: message,
      }));
      return { success: false, code: -1, message };
    }
  }, [state.isAvailable]);

  const release = useCallback(async () => {
    await Viture.release();
    setState((s) => ({
      ...s,
      isConnected: false,
      imuEnabled: false,
      mode3D: false,
      imuData: null,
    }));
  }, []);

  const toggleIMU = useCallback(async () => {
    if (!state.isConnected) return;
    const newState = !state.imuEnabled;
    await Viture.setIMUEnabled(newState);
    setState((s) => ({ ...s, imuEnabled: newState }));
  }, [state.isConnected, state.imuEnabled]);

  const toggle3D = useCallback(async () => {
    if (!state.isConnected) return;
    const newState = !state.mode3D;
    await Viture.set3DEnabled(newState);
    setState((s) => ({ ...s, mode3D: newState }));
  }, [state.isConnected, state.mode3D]);

  const resetOrientation = useCallback(() => {
    if (state.imuData) {
      initialOrientationRef.current = {
        yaw: state.imuData.yaw,
        pitch: state.imuData.pitch,
        roll: state.imuData.roll,
      };
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
