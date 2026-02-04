package com.anonymous.frontend.viture

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.viture.sdk.ArCallback
import com.viture.sdk.ArManager
import com.viture.sdk.Constants
import java.nio.ByteBuffer

class VitureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "VitureModule"
        const val NAME = "VitureSDK"
    }

    private var arManager: ArManager? = null
    private var isInitialized = false
    private var imuEnabled = false
    
    private var lastEulerRoll = 0f
    private var lastEulerPitch = 0f
    private var lastEulerYaw = 0f
    private var lastQuaternionW = 0f
    private var lastQuaternionX = 0f
    private var lastQuaternionY = 0f
    private var lastQuaternionZ = 0f

    private val arCallback = object : ArCallback() {
        override fun onEvent(msgId: Int, event: ByteArray?, timestamp: Long) {
            Log.d(TAG, "onEvent msgId: $msgId")
            
            if (msgId == Constants.EVENT_ID_INIT) {
                val initResult = event?.let { byteArrayToInt(it, 0, it.size) } ?: -1
                isInitialized = initResult == Constants.ERROR_INIT_SUCCESS
                
                sendEvent("onVitureEvent", Arguments.createMap().apply {
                    putString("type", "init")
                    putBoolean("success", isInitialized)
                    putInt("code", initResult)
                })
            }
        }

        override fun onImu(timestamp: Long, imu: ByteArray?) {
            imu?.let {
                val byteBuffer = ByteBuffer.wrap(it)
                
                // Euler angles (roll, pitch, yaw)
                lastEulerRoll = byteBuffer.getFloat(0)   // Roll - front axis
                lastEulerPitch = byteBuffer.getFloat(4)  // Pitch - left axis
                lastEulerYaw = byteBuffer.getFloat(8)    // Yaw - up axis
                
                // Quaternion data (if available)
                if (it.size >= 36) {
                    lastQuaternionW = byteBuffer.getFloat(20)
                    lastQuaternionX = byteBuffer.getFloat(24)
                    lastQuaternionY = byteBuffer.getFloat(28)
                    lastQuaternionZ = byteBuffer.getFloat(32)
                }
                
                // Send IMU data to JS
                sendEvent("onVitureIMU", Arguments.createMap().apply {
                    putDouble("timestamp", timestamp.toDouble())
                    putDouble("roll", lastEulerRoll.toDouble())
                    putDouble("pitch", lastEulerPitch.toDouble())
                    putDouble("yaw", lastEulerYaw.toDouble())
                    putDouble("quaternionW", lastQuaternionW.toDouble())
                    putDouble("quaternionX", lastQuaternionX.toDouble())
                    putDouble("quaternionY", lastQuaternionY.toDouble())
                    putDouble("quaternionZ", lastQuaternionZ.toDouble())
                })
            }
        }
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available")
                return
            }

            arManager = ArManager.getInstance(activity)
            val initResult = arManager?.init() ?: -1
            
            arManager?.setLogOn(true)
            arManager?.registerCallback(arCallback)
            
            isInitialized = initResult == Constants.ERROR_INIT_SUCCESS
            
            val result = Arguments.createMap().apply {
                putBoolean("success", isInitialized)
                putInt("code", initResult)
                putString("message", getInitResultMessage(initResult))
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Initialize error: ${e.message}")
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun release(promise: Promise) {
        try {
            arManager?.unregisterCallback(arCallback)
            arManager?.release()
            arManager = null
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
            arManager?.setImuOn(enabled)
            imuEnabled = enabled
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("IMU_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getIMUState(promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized")
                return
            }
            val state = arManager?.imuState ?: -1
            promise.resolve(state == Constants.STATE_ON)
        } catch (e: Exception) {
            promise.reject("IMU_STATE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun set3DEnabled(enabled: Boolean, promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized")
                return
            }
            arManager?.set3D(enabled)
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("3D_ERROR", e.message)
        }
    }

    @ReactMethod
    fun get3DState(promise: Promise) {
        try {
            if (!isInitialized) {
                promise.reject("NOT_INITIALIZED", "SDK not initialized")
                return
            }
            val state = arManager?.get3DState() ?: -1
            promise.resolve(state == Constants.STATE_ON)
        } catch (e: Exception) {
            promise.reject("3D_STATE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getLastIMUData(promise: Promise) {
        try {
            val result = Arguments.createMap().apply {
                putDouble("roll", lastEulerRoll.toDouble())
                putDouble("pitch", lastEulerPitch.toDouble())
                putDouble("yaw", lastEulerYaw.toDouble())
                putDouble("quaternionW", lastQuaternionW.toDouble())
                putDouble("quaternionX", lastQuaternionX.toDouble())
                putDouble("quaternionY", lastQuaternionY.toDouble())
                putDouble("quaternionZ", lastQuaternionZ.toDouble())
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

    private fun byteArrayToInt(bytes: ByteArray, offset: Int, length: Int): Int {
        var value = 0
        val right = minOf(offset + length, bytes.size)
        for (i in offset until right) {
            val shift = (i - offset) * 8
            value += (bytes[i].toInt() and 0xFF) shl shift
        }
        return value
    }

    private fun getInitResultMessage(code: Int): String {
        return when (code) {
            Constants.ERROR_INIT_SUCCESS -> "SDK initialized successfully"
            Constants.ERROR_NOT_GRANTED_PERMISSION -> "USB permission not granted"
            Constants.ERROR_DEVICE_NOT_FOUND -> "Viture glasses not found"
            Constants.ERROR_OPEN_DEVICE_FAILED -> "Failed to open device"
            else -> "Unknown error: $code"
        }
    }
}
