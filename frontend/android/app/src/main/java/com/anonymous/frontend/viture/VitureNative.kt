package com.anonymous.frontend.viture

import android.util.Log

/**
 * JNI bridge to Viture native SDK
 */
object VitureNative {
    private const val TAG = "VitureNative"
    
    init {
        try {
            System.loadLibrary("glasses")
            System.loadLibrary("viture_jni")
            Log.i(TAG, "Native libraries loaded successfully")
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "Failed to load native libraries: ${e.message}")
        }
    }
    
    // Native methods
    external fun create(productId: Int, fileDescriptor: Int): Boolean
    external fun initialize(cacheDir: String?): Int
    external fun start(): Int
    external fun stop(): Int
    external fun destroy()
    external fun getDeviceType(): Int
    external fun isProductIdValid(productId: Int): Boolean
    external fun setCallback(callback: VitureCallback)
    external fun openImu(mode: Int, frequency: Int): Int
    external fun closeImu(mode: Int): Int
    external fun setLogLevel(level: Int)
    
    // IMU modes
    const val IMU_MODE_RAW = 0
    const val IMU_MODE_POSE = 1
    
    // IMU frequencies
    const val IMU_FREQ_60HZ = 0
    const val IMU_FREQ_120HZ = 1
    const val IMU_FREQ_240HZ = 2
    
    // Device types
    const val DEVICE_TYPE_GEN1 = 0  // One/Pro/Lite
    const val DEVICE_TYPE_GEN2 = 1  // Luma/Luma Pro/Beast
    const val DEVICE_TYPE_CARINA = 2
}

/**
 * Callback interface for Viture SDK events
 */
interface VitureCallback {
    /**
     * Called when IMU pose data is available
     * @param data [roll, pitch, yaw, qw, qx, qy, qz]
     * @param timestamp Device timestamp
     */
    fun onImuData(data: FloatArray, timestamp: Long)
    
    /**
     * Called when glass state changes
     * @param stateId State identifier
     * @param value New value
     */
    fun onStateChange(stateId: Int, value: Int)
}
