const { withDangerousMod, withAppBuildGradle, withMainApplication, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withVitureSDK(config) {
  // Step 1: Add CMake and native build configuration to app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // Add CMake configuration in android block if not present
    if (!buildGradle.includes('externalNativeBuild')) {
      // Find the android { block and add externalNativeBuild
      const androidBlockRegex = /(android\s*\{)/;
      const cmakeConfig = `$1
    externalNativeBuild {
        cmake {
            path "src/main/cpp/CMakeLists.txt"
            version "3.22.1"
        }
    }`;
      buildGradle = buildGradle.replace(androidBlockRegex, cmakeConfig);
    }

    // Add NDK configuration in defaultConfig if not present
    if (!buildGradle.includes('ndk {')) {
      const defaultConfigRegex = /(defaultConfig\s*\{)/;
      const ndkConfig = `$1
        ndk {
            abiFilters "arm64-v8a", "armeabi-v7a"
        }`;
      buildGradle = buildGradle.replace(defaultConfigRegex, ndkConfig);
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  // Step 2: Register ViturePackage in MainApplication
  config = withMainApplication(config, (config) => {
    let mainApp = config.modResults.contents;

    // Add import for ViturePackage
    if (!mainApp.includes('ViturePackage')) {
      // Add import
      const importRegex = /(import com\.facebook\.react\.ReactPackage)/;
      mainApp = mainApp.replace(
        importRegex,
        'import com.anonymous.frontend.viture.ViturePackage\n$1'
      );

      // Add package to getPackages
      const packagesRegex = /(packages\.add\(MainReactPackage\(\)\))/;
      if (mainApp.includes('packages.add(MainReactPackage())')) {
        mainApp = mainApp.replace(
          packagesRegex,
          '$1\n        packages.add(ViturePackage())'
        );
      } else {
        // For newer Expo templates with different structure
        const newPackagesRegex = /(override fun getPackages\(\): List<ReactPackage>\s*\{\s*return PackageList\(this\)\.packages)/;
        if (mainApp.match(newPackagesRegex)) {
          mainApp = mainApp.replace(
            newPackagesRegex,
            '$1.apply { add(ViturePackage()) }'
          );
        }
      }
    }

    config.modResults.contents = mainApp;
    return config;
  });

  // Step 3: Add USB permissions to AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    
    // Add USB permissions
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.USB_PERMISSION',
    ];

    permissions.forEach((permission) => {
      const hasPermission = manifest['uses-permission'].some(
        (p) => p.$['android:name'] === permission
      );
      if (!hasPermission) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add USB feature requirement
    if (!manifest['uses-feature']) {
      manifest['uses-feature'] = [];
    }

    const hasUsbFeature = manifest['uses-feature'].some(
      (f) => f.$['android:name'] === 'android.hardware.usb.host'
    );
    if (!hasUsbFeature) {
      manifest['uses-feature'].push({
        $: {
          'android:name': 'android.hardware.usb.host',
          'android:required': 'false',
        },
      });
    }

    return config;
  });

  // Step 4: Copy native source files during prebuild
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidDir = path.join(projectRoot, 'android', 'app', 'src', 'main');

      // Source directories (from our existing android folder)
      const srcAndroidDir = path.join(projectRoot, 'android', 'app', 'src', 'main');

      // Ensure directories exist
      const cppDir = path.join(androidDir, 'cpp');
      const vitureDir = path.join(cppDir, 'viture');
      const javaVitureDir = path.join(androidDir, 'java', 'com', 'anonymous', 'frontend', 'viture');
      const jniLibsDir64 = path.join(androidDir, 'jniLibs', 'arm64-v8a');
      const jniLibsDir32 = path.join(androidDir, 'jniLibs', 'armeabi-v7a');

      [cppDir, vitureDir, javaVitureDir, jniLibsDir64, jniLibsDir32].forEach((dir) => {
        fs.mkdirSync(dir, { recursive: true });
      });

      // Copy files if source exists
      const filesToCopy = [
        { src: 'cpp/CMakeLists.txt', dest: path.join(cppDir, 'CMakeLists.txt') },
        { src: 'cpp/viture_jni.cpp', dest: path.join(cppDir, 'viture_jni.cpp') },
        { src: 'cpp/viture/viture_device.h', dest: path.join(vitureDir, 'viture_device.h') },
        { src: 'cpp/viture/viture_device_carina.h', dest: path.join(vitureDir, 'viture_device_carina.h') },
        { src: 'cpp/viture/viture_glasses_provider.h', dest: path.join(vitureDir, 'viture_glasses_provider.h') },
        { src: 'cpp/viture/viture_macros_public.h', dest: path.join(vitureDir, 'viture_macros_public.h') },
        { src: 'cpp/viture/viture_protocol_public.h', dest: path.join(vitureDir, 'viture_protocol_public.h') },
        { src: 'cpp/viture/viture_version.h', dest: path.join(vitureDir, 'viture_version.h') },
        { src: 'java/com/anonymous/frontend/viture/VitureModule.kt', dest: path.join(javaVitureDir, 'VitureModule.kt') },
        { src: 'java/com/anonymous/frontend/viture/VitureNative.kt', dest: path.join(javaVitureDir, 'VitureNative.kt') },
        { src: 'jniLibs/arm64-v8a/libglasses.so', dest: path.join(jniLibsDir64, 'libglasses.so') },
        { src: 'jniLibs/arm64-v8a/libcarina_vio.so', dest: path.join(jniLibsDir64, 'libcarina_vio.so') },
        { src: 'jniLibs/arm64-v8a/libcloud_protocol.so', dest: path.join(jniLibsDir64, 'libcloud_protocol.so') },
        { src: 'jniLibs/armeabi-v7a/libglasses.so', dest: path.join(jniLibsDir32, 'libglasses.so') },
        { src: 'jniLibs/armeabi-v7a/libcarina_vio.so', dest: path.join(jniLibsDir32, 'libcarina_vio.so') },
        { src: 'jniLibs/armeabi-v7a/libcloud_protocol.so', dest: path.join(jniLibsDir32, 'libcloud_protocol.so') },
      ];

      filesToCopy.forEach(({ src, dest }) => {
        const srcPath = path.join(srcAndroidDir, src);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, dest);
          console.log(`[VitureSDK] Copied ${src}`);
        }
      });

      return config;
    },
  ]);

  return config;
}

module.exports = withVitureSDK;
