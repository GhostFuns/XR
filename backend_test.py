#!/usr/bin/env python3
"""
World HUD Backend API Testing Suite
Tests all backend endpoints according to test_result.md priorities
"""

import requests
import json
import base64
from datetime import datetime
import time
import sys
from typing import Dict, Any, List

# Backend URL from frontend environment
BACKEND_URL = "https://viture-world-hud.preview.emergentagent.com/api"

class WorldHUDTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            self.failed_tests.append(test_name)
        print()

    def create_test_image_base64(self) -> str:
        """Create a simple test image in base64 format"""
        # Simple 10x10 red square PNG in base64
        red_square_base64 = """iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABYSURBVBiVY/z//z8DJQAggBhJVQgQQIykKgQIIEZSFQIEECOpCgECiJFUhQABxEiqQoAAYiRVIUAAMZKqECCAGElVCBBAjKQqBAggRlIVAgQQI6kKAQKIkVSFAAEEAP//AwDvv2Q9AAAAAElFTkSuQmCC"""
        return red_square_base64

    def test_health_check(self):
        """Test health check endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, "API is healthy", data)
                else:
                    self.log_test("Health Check", False, f"Unexpected status: {data}")
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")

    def test_translation_api(self):
        """Test Translation API - HIGH PRIORITY"""
        print("=== TESTING TRANSLATION API (HIGH PRIORITY) ===")
        
        # Test cases for all 4 target languages
        test_cases = [
            {"text": "Hello world", "source_language": "en", "target_language": "es"},
            {"text": "Good morning", "source_language": "en", "target_language": "ja"},
            {"text": "Thank you very much", "source_language": "en", "target_language": "de"},
            {"text": "How are you today?", "source_language": "en", "target_language": "ru"}
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/translate",
                    json=test_case,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    required_fields = ["id", "original_text", "translated_text", "source_language", "target_language", "timestamp"]
                    
                    if all(field in data for field in required_fields):
                        if data["translated_text"] and data["translated_text"] != test_case["text"]:
                            self.log_test(
                                f"Translation API - Test {i} ({test_case['target_language']})", 
                                True, 
                                f"'{test_case['text']}' -> '{data['translated_text']}'",
                                data
                            )
                        else:
                            self.log_test(
                                f"Translation API - Test {i} ({test_case['target_language']})", 
                                False, 
                                "Translation returned empty or same text"
                            )
                    else:
                        missing = [f for f in required_fields if f not in data]
                        self.log_test(
                            f"Translation API - Test {i} ({test_case['target_language']})", 
                            False, 
                            f"Missing fields: {missing}"
                        )
                else:
                    self.log_test(
                        f"Translation API - Test {i} ({test_case['target_language']})", 
                        False, 
                        f"HTTP {response.status_code}: {response.text}"
                    )
            except Exception as e:
                self.log_test(
                    f"Translation API - Test {i} ({test_case['target_language']})", 
                    False, 
                    f"Error: {str(e)}"
                )
        
        # Test translation history
        try:
            response = self.session.get(f"{BACKEND_URL}/translations", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Translation History", True, f"Retrieved {len(data)} translations", data[:2])
                else:
                    self.log_test("Translation History", False, "Response is not a list")
            else:
                self.log_test("Translation History", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Translation History", False, f"Error: {str(e)}")

    def test_object_recognition_api(self):
        """Test Object Recognition API - HIGH PRIORITY"""
        print("=== TESTING OBJECT RECOGNITION API (HIGH PRIORITY) ===")
        
        test_image = self.create_test_image_base64()
        
        # Test object recognition
        test_payload = {
            "image_base64": test_image,
            "context": "Testing with a simple red square image"
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/recognize",
                json=test_payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "objects_detected", "description", "suggestions", "timestamp"]
                
                if all(field in data for field in required_fields):
                    if isinstance(data["objects_detected"], list) and isinstance(data["suggestions"], list):
                        self.log_test(
                            "Object Recognition API", 
                            True, 
                            f"Detected {len(data['objects_detected'])} objects: {data['description'][:100]}...",
                            data
                        )
                    else:
                        self.log_test("Object Recognition API", False, "Invalid data types in response")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Object Recognition API", False, f"Missing fields: {missing}")
            else:
                self.log_test("Object Recognition API", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Object Recognition API", False, f"Error: {str(e)}")
        
        # Test recognition history
        try:
            response = self.session.get(f"{BACKEND_URL}/recognitions", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Recognition History", True, f"Retrieved {len(data)} recognitions", data[:1])
                else:
                    self.log_test("Recognition History", False, "Response is not a list")
            else:
                self.log_test("Recognition History", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Recognition History", False, f"Error: {str(e)}")

    def test_contextual_memory_crud(self):
        """Test Contextual Memory CRUD - MEDIUM PRIORITY"""
        print("=== TESTING CONTEXTUAL MEMORY CRUD (MEDIUM PRIORITY) ===")
        
        created_memory_id = None
        
        # Test CREATE memory
        create_payload = {
            "object_type": "restaurant",
            "description": "Cozy Italian restaurant with excellent pasta",
            "tags": ["food", "italian", "favorite"],
            "notes": "Great for date nights"
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/memory",
                json=create_payload,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "object_type", "description", "tags", "first_seen", "last_seen", "encounter_count"]
                
                if all(field in data for field in required_fields):
                    created_memory_id = data["id"]
                    self.log_test("Memory CREATE", True, f"Created memory with ID: {created_memory_id}", data)
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Memory CREATE", False, f"Missing fields: {missing}")
            else:
                self.log_test("Memory CREATE", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Memory CREATE", False, f"Error: {str(e)}")
        
        # Test GET all memories
        try:
            response = self.session.get(f"{BACKEND_URL}/memory", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Memory GET ALL", True, f"Retrieved {len(data)} memories")
                else:
                    self.log_test("Memory GET ALL", False, "Response is not a list")
            else:
                self.log_test("Memory GET ALL", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Memory GET ALL", False, f"Error: {str(e)}")
        
        # Test SEARCH memories
        try:
            response = self.session.get(f"{BACKEND_URL}/memory?search=restaurant", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Memory SEARCH", True, f"Found {len(data)} memories matching 'restaurant'")
                else:
                    self.log_test("Memory SEARCH", False, "Response is not a list")
            else:
                self.log_test("Memory SEARCH", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Memory SEARCH", False, f"Error: {str(e)}")
        
        # Test UPDATE memory (if we have an ID)
        if created_memory_id:
            try:
                response = self.session.put(
                    f"{BACKEND_URL}/memory/{created_memory_id}?notes=Updated notes - visited again!",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "updated" and data.get("id") == created_memory_id:
                        self.log_test("Memory UPDATE", True, f"Updated memory {created_memory_id}")
                    else:
                        self.log_test("Memory UPDATE", False, f"Unexpected response: {data}")
                else:
                    self.log_test("Memory UPDATE", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("Memory UPDATE", False, f"Error: {str(e)}")
        
        # Test DELETE memory (if we have an ID)
        if created_memory_id:
            try:
                response = self.session.delete(f"{BACKEND_URL}/memory/{created_memory_id}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "deleted" and data.get("id") == created_memory_id:
                        self.log_test("Memory DELETE", True, f"Deleted memory {created_memory_id}")
                    else:
                        self.log_test("Memory DELETE", False, f"Unexpected response: {data}")
                else:
                    self.log_test("Memory DELETE", False, f"HTTP {response.status_code}: {response.text}")
            except Exception as e:
                self.log_test("Memory DELETE", False, f"Error: {str(e)}")

    def test_social_cues_api(self):
        """Test Social Cues API - MEDIUM PRIORITY"""
        print("=== TESTING SOCIAL CUES API (MEDIUM PRIORITY) ===")
        
        test_payload = {
            "situation": "ordering food at a restaurant",
            "language": "es",
            "cultural_context": "Mexico"
        }
        
        try:
            response = self.session.post(
                f"{BACKEND_URL}/social-cues",
                json=test_payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["prompts", "cultural_tips", "common_phrases"]
                
                if all(field in data for field in required_fields):
                    if (isinstance(data["prompts"], list) and 
                        isinstance(data["cultural_tips"], list) and 
                        isinstance(data["common_phrases"], list)):
                        self.log_test(
                            "Social Cues API", 
                            True, 
                            f"Got {len(data['prompts'])} prompts, {len(data['cultural_tips'])} tips, {len(data['common_phrases'])} phrases",
                            data
                        )
                    else:
                        self.log_test("Social Cues API", False, "Invalid data types in response")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Social Cues API", False, f"Missing fields: {missing}")
            else:
                self.log_test("Social Cues API", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Social Cues API", False, f"Error: {str(e)}")

    def test_settings_api(self):
        """Test Settings API - LOW PRIORITY"""
        print("=== TESTING SETTINGS API (LOW PRIORITY) ===")
        
        # Test GET settings
        try:
            response = self.session.get(f"{BACKEND_URL}/settings", timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "native_language", "target_languages", "hud_opacity", "enabled_widgets"]
                
                if all(field in data for field in required_fields):
                    self.log_test("Settings GET", True, f"Retrieved settings with {len(data['enabled_widgets'])} widgets", data)
                    
                    # Test PUT settings (update)
                    updated_settings = data.copy()
                    updated_settings["hud_opacity"] = 0.9
                    updated_settings["font_size"] = "large"
                    
                    try:
                        put_response = self.session.put(
                            f"{BACKEND_URL}/settings",
                            json=updated_settings,
                            timeout=10
                        )
                        
                        if put_response.status_code == 200:
                            put_data = put_response.json()
                            if put_data.get("hud_opacity") == 0.9 and put_data.get("font_size") == "large":
                                self.log_test("Settings PUT", True, "Successfully updated settings")
                            else:
                                self.log_test("Settings PUT", False, "Settings not updated correctly")
                        else:
                            self.log_test("Settings PUT", False, f"HTTP {put_response.status_code}: {put_response.text}")
                    except Exception as e:
                        self.log_test("Settings PUT", False, f"Error: {str(e)}")
                        
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Settings GET", False, f"Missing fields: {missing}")
            else:
                self.log_test("Settings GET", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Settings GET", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all tests in priority order"""
        print(f"🚀 Starting World HUD Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Test started at: {datetime.now().isoformat()}")
        print("=" * 60)
        
        # Health check first
        self.test_health_check()
        
        # HIGH PRIORITY tests
        self.test_translation_api()
        self.test_object_recognition_api()
        
        # MEDIUM PRIORITY tests  
        self.test_contextual_memory_crud()
        self.test_social_cues_api()
        
        # LOW PRIORITY tests
        self.test_settings_api()
        
        # Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        print(f"\nTest completed at: {datetime.now().isoformat()}")
        
        return passed_tests, failed_tests, self.test_results

if __name__ == "__main__":
    tester = WorldHUDTester()
    passed, failed, results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(1 if failed > 0 else 0)