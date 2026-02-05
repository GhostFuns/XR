#include <jni.h>
#include <android/log.h>
#include <string>
#include "viture/viture_glasses_provider.h"
#include "viture/viture_device.h"

#define LOG_TAG "VitureJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static XRDeviceProviderHandle g_handle = nullptr;
static JavaVM* g_jvm = nullptr;
static jobject g_callbackObj = nullptr;
static jmethodID g_onImuDataMethod = nullptr;
static jmethodID g_onStateChangeMethod = nullptr;

// IMU Pose callback - called from native thread
void imuPoseCallback(float* data, uint64_t timestamp) {
    if (g_jvm == nullptr || g_callbackObj == nullptr) return;
    
    JNIEnv* env;
    bool attached = false;
    
    if (g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6) != JNI_OK) {
        if (g_jvm->AttachCurrentThread(&env, nullptr) != JNI_OK) {
            LOGE("Failed to attach thread");
            return;
        }
        attached = true;
    }
    
    // data format: [roll, pitch, yaw, qw, qx, qy, qz]
    jfloatArray imuArray = env->NewFloatArray(7);
    env->SetFloatArrayRegion(imuArray, 0, 7, data);
    
    env->CallVoidMethod(g_callbackObj, g_onImuDataMethod, imuArray, (jlong)timestamp);
    
    env->DeleteLocalRef(imuArray);
    
    if (attached) {
        g_jvm->DetachCurrentThread();
    }
}

// Glass state callback
void glassStateCallback(int stateId, int value) {
    if (g_jvm == nullptr || g_callbackObj == nullptr) return;
    
    JNIEnv* env;
    bool attached = false;
    
    if (g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6) != JNI_OK) {
        if (g_jvm->AttachCurrentThread(&env, nullptr) != JNI_OK) {
            return;
        }
        attached = true;
    }
    
    env->CallVoidMethod(g_callbackObj, g_onStateChangeMethod, stateId, value);
    
    if (attached) {
        g_jvm->DetachCurrentThread();
    }
}

extern "C" {

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    return JNI_VERSION_1_6;
}

JNIEXPORT jboolean JNICALL
Java_com_anonymous_frontend_viture_VitureNative_create(JNIEnv* env, jobject thiz, jint productId, jint fileDescriptor) {
    LOGI("Creating Viture provider: productId=%d, fd=%d", productId, fileDescriptor);
    
    if (g_handle != nullptr) {
        LOGI("Provider already exists, destroying first");
        xr_device_provider_destroy(g_handle);
        g_handle = nullptr;
    }
    
    g_handle = xr_device_provider_create(productId, fileDescriptor);
    
    if (g_handle == nullptr) {
        LOGE("Failed to create provider");
        return JNI_FALSE;
    }
    
    LOGI("Provider created successfully");
    return JNI_TRUE;
}

JNIEXPORT jint JNICALL
Java_com_anonymous_frontend_viture_VitureNative_initialize(JNIEnv* env, jobject thiz, jstring cacheDir) {
    if (g_handle == nullptr) return -1;
    
    const char* cachePath = nullptr;
    if (cacheDir != nullptr) {
        cachePath = env->GetStringUTFChars(cacheDir, nullptr);
    }
    
    int result = xr_device_provider_initialize(g_handle, nullptr, cachePath);
    
    if (cachePath != nullptr) {
        env->ReleaseStringUTFChars(cacheDir, cachePath);
    }
    
    LOGI("Initialize result: %d", result);
    return result;
}

JNIEXPORT jint JNICALL
Java_com_anonymous_frontend_viture_VitureNative_start(JNIEnv* env, jobject thiz) {
    if (g_handle == nullptr) return -1;
    
    int result = xr_device_provider_start(g_handle);
    LOGI("Start result: %d", result);
    return result;
}

JNIEXPORT jint JNICALL
Java_com_anonymous_frontend_viture_VitureNative_stop(JNIEnv* env, jobject thiz) {
    if (g_handle == nullptr) return -1;
    return xr_device_provider_stop(g_handle);
}

JNIEXPORT void JNICALL
Java_com_anonymous_frontend_viture_VitureNative_destroy(JNIEnv* env, jobject thiz) {
    if (g_handle != nullptr) {
        xr_device_provider_shutdown(g_handle);
        xr_device_provider_destroy(g_handle);
        g_handle = nullptr;
    }
    
    if (g_callbackObj != nullptr) {
        env->DeleteGlobalRef(g_callbackObj);
        g_callbackObj = nullptr;
    }
}

JNIEXPORT jint JNICALL
Java_com_anonymous_frontend_viture_VitureNative_getDeviceType(JNIEnv* env, jobject thiz) {
    if (g_handle == nullptr) return -1;
    return xr_device_provider_get_device_type(g_handle);
}

JNIEXPORT jboolean JNICALL
Java_com_anonymous_frontend_viture_VitureNative_isProductIdValid(JNIEnv* env, jobject thiz, jint productId) {
    return xr_device_provider_is_product_id_valid(productId) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_com_anonymous_frontend_viture_VitureNative_setCallback(JNIEnv* env, jobject thiz, jobject callback) {
    if (g_callbackObj != nullptr) {
        env->DeleteGlobalRef(g_callbackObj);
    }
    
    g_callbackObj = env->NewGlobalRef(callback);
    
    jclass callbackClass = env->GetObjectClass(callback);
    g_onImuDataMethod = env->GetMethodID(callbackClass, "onImuData", "([FJ)V");
    g_onStateChangeMethod = env->GetMethodID(callbackClass, "onStateChange", "(II)V");
    
    // Register native callbacks
    if (g_handle != nullptr) {
        xr_device_provider_register_imu_pose_callback(g_handle, imuPoseCallback);
        xr_device_provider_register_state_callback(g_handle, glassStateCallback);
    }
}

JNIEXPORT jint JNICALL
Java_com_anonymous_frontend_viture_VitureNative_openImu(JNIEnv* env, jobject thiz, jint mode, jint frequency) {
    if (g_handle == nullptr) return -1;
    return xr_device_provider_open_imu(g_handle, (uint8_t)mode, (uint8_t)frequency);
}

JNIEXPORT jint JNICALL
Java_com_anonymous_frontend_viture_VitureNative_closeImu(JNIEnv* env, jobject thiz, jint mode) {
    if (g_handle == nullptr) return -1;
    return xr_device_provider_close_imu(g_handle, (uint8_t)mode);
}

JNIEXPORT void JNICALL
Java_com_anonymous_frontend_viture_VitureNative_setLogLevel(JNIEnv* env, jobject thiz, jint level) {
    xr_device_provider_set_log_level(level);
}

} // extern "C"
