import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'VitureSDK' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go (Viture SDK requires a development build)';

const VitureSDK = NativeModules.VitureSDK
  ? NativeModules.VitureSDK
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface IMUData {
  timestamp: number;
  roll: number;       // Front axis rotation (euler)
  pitch: number;      // Left axis rotation (euler)
  yaw: number;        // Up axis rotation (euler)
  quaternionW: number;
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
}

export interface VitureInitResult {
  success: boolean;
  code: number;
  message: string;
}

export interface VitureEventData {
  type: 'init' | 'error' | 'disconnect';
  success?: boolean;
  code?: number;
  message?: string;
}

class VitureSDKWrapper {
  private eventEmitter: NativeEventEmitter | null = null;
  private imuListeners: ((data: IMUData) => void)[] = [];
  private eventListeners: ((data: VitureEventData) => void)[] = [];
  private isListening = false;

  constructor() {
    if (Platform.OS === 'android') {
      try {
        this.eventEmitter = new NativeEventEmitter(VitureSDK);
      } catch (e) {
        console.log('VitureSDK: Not available on this platform');
      }
    }
  }

  /**
   * Check if SDK is available (only on Android with development build)
   */
  isAvailable(): boolean {
    return Platform.OS === 'android' && NativeModules.VitureSDK != null;
  }

  /**
   * Initialize the Viture SDK and connect to glasses
   */
  async initialize(): Promise<VitureInitResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        code: -999,
        message: 'Viture SDK only available on Android development builds',
      };
    }

    try {
      const result = await VitureSDK.initialize();
      if (result.success) {
        this.startListening();
      }
      return result;
    } catch (error: any) {
      return {
        success: false,
        code: -1,
        message: error.message || 'Failed to initialize',
      };
    }
  }

  /**
   * Release the SDK and disconnect
   */
  async release(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    this.stopListening();
    return VitureSDK.release();
  }

  /**
   * Check if glasses are connected
   */
  async isConnected(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return VitureSDK.isConnected();
  }

  /**
   * Enable/disable IMU (head tracking) data streaming
   */
  async setIMUEnabled(enabled: boolean): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return VitureSDK.setIMUEnabled(enabled);
  }

  /**
   * Get current IMU state
   */
  async getIMUState(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return VitureSDK.getIMUState();
  }

  /**
   * Enable/disable 3D stereoscopic mode
   */
  async set3DEnabled(enabled: boolean): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return VitureSDK.set3DEnabled(enabled);
  }

  /**
   * Get current 3D state
   */
  async get3DState(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return VitureSDK.get3DState();
  }

  /**
   * Get the last received IMU data
   */
  async getLastIMUData(): Promise<IMUData | null> {
    if (!this.isAvailable()) return null;
    return VitureSDK.getLastIMUData();
  }

  /**
   * Subscribe to IMU data updates
   */
  onIMUData(callback: (data: IMUData) => void): () => void {
    this.imuListeners.push(callback);
    return () => {
      this.imuListeners = this.imuListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to SDK events (init, disconnect, etc.)
   */
  onEvent(callback: (data: VitureEventData) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      this.eventListeners = this.eventListeners.filter((cb) => cb !== callback);
    };
  }

  private startListening() {
    if (this.isListening || !this.eventEmitter) return;

    this.eventEmitter.addListener('onVitureIMU', (data: IMUData) => {
      this.imuListeners.forEach((cb) => cb(data));
    });

    this.eventEmitter.addListener('onVitureEvent', (data: VitureEventData) => {
      this.eventListeners.forEach((cb) => cb(data));
    });

    this.isListening = true;
  }

  private stopListening() {
    if (!this.isListening || !this.eventEmitter) return;

    this.eventEmitter.removeAllListeners('onVitureIMU');
    this.eventEmitter.removeAllListeners('onVitureEvent');
    this.isListening = false;
  }
}

export const Viture = new VitureSDKWrapper();
export default Viture;
