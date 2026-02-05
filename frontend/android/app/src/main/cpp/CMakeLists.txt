cmake_minimum_required(VERSION 3.18.1)
project(viture_native)

# Add Viture SDK headers
include_directories(${CMAKE_SOURCE_DIR}/viture)

# Find pre-built Viture libraries
add_library(glasses SHARED IMPORTED)
set_target_properties(glasses PROPERTIES IMPORTED_LOCATION
    ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libglasses.so)

# Create JNI bridge library
add_library(viture_jni SHARED
    viture_jni.cpp
)

# Link libraries
target_link_libraries(viture_jni
    glasses
    android
    log
)
