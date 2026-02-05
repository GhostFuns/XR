package com.anonymous.frontend.viture

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class VitureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), VitureCallback {

    companion object {
        const val TAG = "VitureModule"
        const val NAME = "VitureSDK"
        const val ACTION_USB_PERMISSION = "com.anonymous.frontend.USB_PERMISSION"
        
        // Viture USB Vendor/Product IDs
        const val VITURE_VENDOR_ID = 0x35CA
        val VITURE_PRODUCT_IDS = listOf(
            0x1011, // One
            0x1012, // Pro
            0x1013, // Lite  
            0x1014, // Luma
            0x1015, // Luma Pro
            0x1016  // Beast
        )
    }

    private var usbManager: UsbManager? = null
    private var connectedDevice: UsbDevice? = null
    private var isInitialized = false
    private var imuEnabled = false
    
    // IMU data cache
    private var lastRoll = 0f
    private var lastPitch = 0f
    private var lastYaw = 0f
    private var lastQw = 1f
    private var lastQx = 0f
    private var lastQy = 0f
    private var lastQz = 0f

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                ACTION_USB_PERMISSION -> {
                    synchronized(this) {
                        val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                        }
                        
                        if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                            device?.let { initializeDevice(it) }
                        } else {
                            Log.w(TAG, "USB permission denied")
                            sendEvent("onVitureEvent", Arguments.createMap().apply {
                                putString("type", "permission_denied")
                            })
                        }
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    
                    if (device?.vendorId == VITURE_VENDOR_ID) {
                        handleDisconnect()
                    }
                }
            }
        }
    }

    init {
        usbManager = reactContext.getSystemService(Context.USB_SERVICE) as UsbManager
        
        val filter = IntentFilter().apply {
            addAction(ACTION_USB_PERMISSION)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(usbReceiver, filter)
        }
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            val device = findVitureDevice()
            
            if (device == null) {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", false)
                    putInt("code", -1)
                    putString("message", "No Viture glasses found. Make sure they are connected via USB-C.")
                })
                return
            }
            
            connectedDevice = device
            
            if (usbManager?.hasPermission(device) == true) {
                val result = initializeDevice(device)
                promise.resolve(result)
            } else {
                requestUsbPermission(device)
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("success", false)
                    putInt("code", -2)
                    putString("message", "Requesting USB permission...")
                })
            }
        } catch (e: Exception) {
            Log.e(TAG, "Initialize error: ${e.message}")
            promise.reject("INIT_ERROR", e.message)
        }
    }
    
    private fun findVitureDevice(): UsbDevice? {
        val devices = usbManager?.deviceList ?: return null
        
        for (device in devices.values) {
            if (device.vendorId == VITURE_VENDOR_ID && 
                VITURE_PRODUCT_IDS.contains(device.productId)) {
                Log.i(TAG, "Found Viture device: ${device.productName} (${device.productId})")
                return device
            }
        }
        return null
    }
    
    private fun requestUsbPermission(device: UsbDevice) {
        val permissionIntent = PendingIntent.getBroadcast(
            reactApplicationContext,
            0,
            Intent(ACTION_USB_PERMISSION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        usbManager?.requestPermission(device, permissionIntent)
    }
    
    private fun initializeDevice(device: UsbDevice): WritableMap {
        val connection = usbManager?.openDevice(device)
        
        if (connection == null) {
            return Arguments.createMap().apply {
                putBoolean("success", false)
                putInt("code", -3)
                putString("message", "Failed to open USB connection")
            }
        }
        
        val fd = connection.fileDescriptor
        val productId = device.productId
        
        // Create native provider
        if (!VitureNative.create(productId, fd)) {
            return Arguments.createMap().apply {
                putBoolean("success", false)
                putInt("code", -4)
                putString("message", "Failed to create native provider")
            }
        }
        
        // Set callback
        VitureNative.setCallback(this)
        VitureNative.setLogLevel(3) // Debug
        
        // Initialize
        val cacheDir = reactApplicationContext.cacheDir.absolutePath
        val initResult = VitureNative.initialize(cacheDir)
        
        if (initResult != 0) {
            return Arguments.createMap().apply {
                putBoolean("success", false)
                putInt("code", initResult)
                putString("message", "Native initialization failed: $initResult")
            }
        }
        
        // Start
        val startResult = VitureNative.start()
        
        if (startResult != 0) {
            return Arguments.createMap().apply {
                putBoolean("success", false)
                putInt("code", startResult)
                putString("message", "Failed to start provider: $startResult")
            }
        }
        
        isInitialized = true
        
        val deviceType = VitureNative.getDeviceType()
        val deviceName = when (deviceType) {
            VitureNative.DEVICE_TYPE_GEN1 -> "Viture One/Pro/Lite"
            VitureNative.DEVICE_TYPE_GEN2 -> "Viture Luma/Luma Pro/Beast"
            VitureNative.DEVICE_TYPE_CARINA -> "Viture Carina"
            else -> "Unknown Viture Device"
        }
        
        sendEvent("onVitureEvent", Arguments.createMap().apply {
            putString("type", "connected")
            putString("deviceName", deviceName)
            putInt("deviceType", deviceType)
        })
        
        return Arguments.createMap().apply {
            putBoolean("success", true)
            putInt("code", 0)
            putString("message", "Connected to $deviceName")
            putString("deviceName", deviceName)
            putInt("deviceType", deviceType)
        }
    }
    
    private fun handleDisconnect() {
        isInitialized = false
        imuEnabled = false
        VitureNative.destroy()
        connectedDevice = null
        
        sendEvent("onVitureEvent", Arguments.createMap().apply {
            putString("type", "disconnected")
        })
    }

    @ReactMethod
    fun release(promise: Promise) {
        try {
            VitureNative.stop()
            VitureNative.destroy()
            isInitialized = false
            imuEnabled = false
            connectedDevice = null
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
            
            val result = if (enabled) {
                VitureNative.openImu(VitureNative.IMU_MODE_POSE, VitureNative.IMU_FREQ_60HZ)
            } else {
                VitureNative.closeImu(VitureNative.IMU_MODE_POSE)
            }
            
            if (result == 0) {
                imuEnabled = enabled
                promise.resolve(enabled)
            } else {
                promise.reject("IMU_ERROR", "Failed to ${if (enabled) "enable" else "disable"} IMU: $result")
            }
        } catch (e: Exception) {
            promise.reject("IMU_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getIMUState(promise: Promise) {
        promise.resolve(imuEnabled)
    }

    @ReactMethod
    fun getLastIMUData(promise: Promise) {
        promise.resolve(Arguments.createMap().apply {
            putDouble("roll", lastRoll.toDouble())
            putDouble("pitch", lastPitch.toDouble())
            putDouble("yaw", lastYaw.toDouble())
            putDouble("quaternionW", lastQw.toDouble())
            putDouble("quaternionX", lastQx.toDouble())
            putDouble("quaternionY", lastQy.toDouble())
            putDouble("quaternionZ", lastQz.toDouble())
        })
    }

    @ReactMethod
    fun isConnected(promise: Promise) {
        promise.resolve(isInitialized)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    // VitureCallback implementation
    override fun onImuData(data: FloatArray, timestamp: Long) {
        if (data.size >= 7) {
            lastRoll = data[0]
            lastPitch = data[1]
            lastYaw = data[2]
            lastQw = data[3]
            lastQx = data[4]
            lastQy = data[5]
            lastQz = data[6]
            
            sendEvent("onVitureIMU", Arguments.createMap().apply {
                putDouble("timestamp", timestamp.toDouble())
                putDouble("roll", lastRoll.toDouble())
                putDouble("pitch", lastPitch.toDouble())
                putDouble("yaw", lastYaw.toDouble())
                putDouble("quaternionW", lastQw.toDouble())
                putDouble("quaternionX", lastQx.toDouble())
                putDouble("quaternionY", lastQy.toDouble())
                putDouble("quaternionZ", lastQz.toDouble())
            })
        }
    }
    
    override fun onStateChange(stateId: Int, value: Int) {
        sendEvent("onVitureState", Arguments.createMap().apply {
            putInt("stateId", stateId)
            putInt("value", value)
        })
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
