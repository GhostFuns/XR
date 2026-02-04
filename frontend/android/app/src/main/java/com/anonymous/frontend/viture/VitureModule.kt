package com.anonymous.frontend.viture

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class VitureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "VitureModule"
        const val NAME = "VitureSDK"
    }

    private var isInitialized = false
    private var imuEnabled = false
    
    private var lastEulerRoll = 0.0
    private var lastEulerPitch = 0.0
    private var lastEulerYaw = 0.0

    override fun getName(): String = NAME

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available")
                return
            }

            // Try to load Viture SDK dynamically
            try {
                val arManagerClass = Class.forName("com.viture.sdk.ArManager")
                val getInstanceMethod = arManagerClass.getMethod("getInstance", android.app.Activity::class.java)
                val arManager = getInstanceMethod.invoke(null, activity)
                
                val initMethod = arManagerClass.getMethod("init")
                val initResult = initMethod.invoke(arManager) as Int
                
                isInitialized = initResult == 0 // SUCCESS
                
                val result = Arguments.createMap().apply {
                    putBoolean("success", isInitialized)
                    putInt("code", initResult)
                    putString("message", if (isInitialized) "SDK initialized successfully" else "SDK initialization failed: $initResult")
                }
                
                promise.resolve(result)
            } catch (e: ClassNotFoundException) {
                Log.w(TAG, "Viture SDK not available: ${e.message}")
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", false)
                    putInt("code", -999)
                    putString("message", "Viture SDK not available on this device")
                })
            }
        } catch (e: Exception) {
            Log.e(TAG, "Initialize error: ${e.message}")
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun release(promise: Promise) {
        try {
            isInitialized = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RELEASE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setIMUEnabled(enabled: Boolean, promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized")
                return
            }
            imuEnabled = enabled
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("IMU_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getIMUState(promise: Promise) {
        promise.resolve(imuEnabled)
    }

    @ReactMethod
    fun set3DEnabled(enabled: Boolean, promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized")
                return
            }
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("3D_ERROR", e.message)
        }
    }

    @ReactMethod
    fun get3DState(promise: Promise) {
        promise.resolve(false)
    }

    @ReactMethod
    fun getLastIMUData(promise: Promise) {
        try {
            val result = Arguments.createMap().apply {
                putDouble("roll", lastEulerRoll)
                putDouble("pitch", lastEulerPitch)
                putDouble("yaw", lastEulerYaw)
                putDouble("quaternionW", 1.0)
                putDouble("quaternionX", 0.0)
                putDouble("quaternionY", 0.0)
                putDouble("quaternionZ", 0.0)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("IMU_DATA_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        promise.resolve(isInitialized)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
