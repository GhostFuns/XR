from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import base64
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'world_hud_db')]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="World HUD API", version="1.0.0")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class TranslationRequest(BaseModel):
    text: str
    source_language: str = "en"
    target_language: str = "es"

class TranslationResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ObjectRecognitionRequest(BaseModel):
    image_base64: str
    context: Optional[str] = None

class ObjectRecognitionResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    objects_detected: List[Dict[str, Any]]
    description: str
    suggestions: List[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ContextualMemoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    object_type: str
    description: str
    notes: Optional[str] = None
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    encounter_count: int = 1
    tags: List[str] = []
    image_thumbnail: Optional[str] = None

class ContextualMemoryCreate(BaseModel):
    object_type: str
    description: str
    notes: Optional[str] = None
    tags: List[str] = []
    image_thumbnail: Optional[str] = None

class HUDSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    native_language: str = "en"
    target_languages: List[str] = ["es", "ja", "de", "ru"]
    hud_opacity: float = 0.85
    widget_positions: Dict[str, Dict[str, int]] = {}
    enabled_widgets: List[str] = ["time", "weather", "compass", "battery", "translation", "object_recognition"]
    theme: str = "dark_cyber"
    font_size: str = "medium"
    auto_translate: bool = True
    contextual_memory_enabled: bool = True

class ConversationPrompt(BaseModel):
    situation: str
    language: str
    cultural_context: Optional[str] = None

class ConversationPromptResponse(BaseModel):
    prompts: List[str]
    cultural_tips: List[str]
    common_phrases: List[str]

# Language mapping for better prompts
LANGUAGE_MAP = {
    "en": "English",
    "es": "Spanish (Mexican)",
    "ja": "Japanese",
    "de": "German",
    "ru": "Russian"
}

# ==================== LLM HELPER ====================

async def call_llm(system_message: str, user_message: str, image_base64: Optional[str] = None) -> str:
    """Call the LLM using emergentintegrations"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        if image_base64:
            # Clean base64 if it has data URI prefix
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            image_content = ImageContent(image_base64=image_base64)
            message = UserMessage(text=user_message, images=[image_content])
        else:
            message = UserMessage(text=user_message)
        
        response = await chat.send_message(message)
        return response
    except Exception as e:
        logger.error(f"LLM call failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM service error: {str(e)}")

# ==================== API ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "World HUD API v1.0", "status": "operational"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ==================== TRANSLATION ENDPOINTS ====================

@api_router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text between languages using AI"""
    source_lang = LANGUAGE_MAP.get(request.source_language, request.source_language)
    target_lang = LANGUAGE_MAP.get(request.target_language, request.target_language)
    
    system_message = f"""You are an expert translator specializing in natural, conversational translations.
    Translate from {source_lang} to {target_lang}.
    Provide only the translation, no explanations.
    Maintain the tone and style of the original text.
    For Mexican Spanish, use appropriate regional vocabulary and expressions."""
    
    user_message = f"Translate this text: {request.text}"
    
    translated = await call_llm(system_message, user_message)
    
    response = TranslationResponse(
        original_text=request.text,
        translated_text=translated.strip(),
        source_language=request.source_language,
        target_language=request.target_language
    )
    
    # Store translation history
    await db.translations.insert_one(response.dict())
    
    return response

@api_router.get("/translations", response_model=List[TranslationResponse])
async def get_translation_history(limit: int = 50):
    """Get recent translation history"""
    translations = await db.translations.find().sort("timestamp", -1).limit(limit).to_list(limit)
    return [TranslationResponse(**t) for t in translations]

# ==================== OBJECT RECOGNITION ENDPOINTS ====================

@api_router.post("/recognize", response_model=ObjectRecognitionResponse)
async def recognize_objects(request: ObjectRecognitionRequest):
    """Recognize and describe objects in an image"""
    system_message = """You are an advanced visual AI assistant for an XR HUD system.
    Analyze the image and provide:
    1. A list of objects detected with their descriptions
    2. A comprehensive description of the scene
    3. Useful suggestions or information about the objects
    
    Respond in JSON format:
    {
        "objects": [{"name": "object_name", "description": "brief description", "confidence": "high/medium/low"}],
        "scene_description": "overall scene description",
        "suggestions": ["suggestion 1", "suggestion 2"]
    }"""
    
    context_hint = f"\nAdditional context: {request.context}" if request.context else ""
    user_message = f"Analyze this image and identify all objects, provide descriptions and useful information.{context_hint}"
    
    result = await call_llm(system_message, user_message, request.image_base64)
    
    try:
        # Try to parse JSON response
        result_clean = result.strip()
        if result_clean.startswith("```json"):
            result_clean = result_clean[7:]
        if result_clean.startswith("```"):
            result_clean = result_clean[3:]
        if result_clean.endswith("```"):
            result_clean = result_clean[:-3]
        
        parsed = json.loads(result_clean)
        objects_detected = parsed.get("objects", [])
        description = parsed.get("scene_description", result)
        suggestions = parsed.get("suggestions", [])
    except json.JSONDecodeError:
        objects_detected = [{"name": "Unknown", "description": result, "confidence": "medium"}]
        description = result
        suggestions = []
    
    response = ObjectRecognitionResponse(
        objects_detected=objects_detected,
        description=description,
        suggestions=suggestions
    )
    
    # Store recognition history
    await db.recognitions.insert_one(response.dict())
    
    return response

@api_router.get("/recognitions", response_model=List[ObjectRecognitionResponse])
async def get_recognition_history(limit: int = 20):
    """Get recent object recognition history"""
    recognitions = await db.recognitions.find().sort("timestamp", -1).limit(limit).to_list(limit)
    return [ObjectRecognitionResponse(**r) for r in recognitions]

# ==================== CONTEXTUAL MEMORY ENDPOINTS ====================

@api_router.post("/memory", response_model=ContextualMemoryItem)
async def create_memory(item: ContextualMemoryCreate):
    """Create a new contextual memory item"""
    memory_item = ContextualMemoryItem(**item.dict())
    await db.contextual_memory.insert_one(memory_item.dict())
    return memory_item

@api_router.get("/memory", response_model=List[ContextualMemoryItem])
async def get_memories(limit: int = 100, search: Optional[str] = None):
    """Get contextual memories, optionally filtered by search term"""
    query = {}
    if search:
        query = {
            "$or": [
                {"object_type": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
        }
    
    memories = await db.contextual_memory.find(query).sort("last_seen", -1).limit(limit).to_list(limit)
    return [ContextualMemoryItem(**m) for m in memories]

@api_router.put("/memory/{memory_id}")
async def update_memory(memory_id: str, notes: Optional[str] = None, tags: Optional[List[str]] = None):
    """Update a memory item (e.g., add notes or tags)"""
    update_data = {"last_seen": datetime.utcnow()}
    if notes is not None:
        update_data["notes"] = notes
    if tags is not None:
        update_data["tags"] = tags
    
    result = await db.contextual_memory.update_one(
        {"id": memory_id},
        {"$set": update_data, "$inc": {"encounter_count": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Memory not found")
    
    return {"status": "updated", "id": memory_id}

@api_router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a memory item"""
    result = await db.contextual_memory.delete_one({"id": memory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "deleted", "id": memory_id}

# ==================== SOCIAL CUE ASSISTANT ====================

@api_router.post("/social-cues", response_model=ConversationPromptResponse)
async def get_conversation_prompts(request: ConversationPrompt):
    """Get AI-generated conversation prompts and cultural tips"""
    target_lang = LANGUAGE_MAP.get(request.language, request.language)
    
    system_message = f"""You are a cultural and social expert helping someone communicate in {target_lang}.
    Provide helpful conversation prompts, cultural tips, and common phrases.
    Be practical and culturally sensitive.
    
    Respond in JSON format:
    {{
        "prompts": ["prompt 1", "prompt 2", "prompt 3"],
        "cultural_tips": ["tip 1", "tip 2"],
        "common_phrases": ["phrase 1 (translation)", "phrase 2 (translation)"]
    }}"""
    
    context = f" Cultural context: {request.cultural_context}" if request.cultural_context else ""
    user_message = f"I'm in this situation: {request.situation}. Help me communicate effectively in {target_lang}.{context}"
    
    result = await call_llm(system_message, user_message)
    
    try:
        result_clean = result.strip()
        if result_clean.startswith("```json"):
            result_clean = result_clean[7:]
        if result_clean.startswith("```"):
            result_clean = result_clean[3:]
        if result_clean.endswith("```"):
            result_clean = result_clean[:-3]
        
        parsed = json.loads(result_clean)
        return ConversationPromptResponse(
            prompts=parsed.get("prompts", []),
            cultural_tips=parsed.get("cultural_tips", []),
            common_phrases=parsed.get("common_phrases", [])
        )
    except json.JSONDecodeError:
        return ConversationPromptResponse(
            prompts=[result],
            cultural_tips=[],
            common_phrases=[]
        )

# ==================== HUD SETTINGS ====================

@api_router.get("/settings", response_model=HUDSettings)
async def get_settings():
    """Get current HUD settings"""
    settings = await db.settings.find_one({"id": "default"})
    if not settings:
        default_settings = HUDSettings(id="default")
        await db.settings.insert_one(default_settings.dict())
        return default_settings
    return HUDSettings(**settings)

@api_router.put("/settings", response_model=HUDSettings)
async def update_settings(settings: HUDSettings):
    """Update HUD settings"""
    settings.id = "default"
    await db.settings.replace_one(
        {"id": "default"},
        settings.dict(),
        upsert=True
    )
    return settings

# ==================== REAL-TIME WEBSOCKET ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")

manager = ConnectionManager()

@app.websocket("/ws/hud")
async def websocket_hud(websocket: WebSocket):
    """WebSocket endpoint for real-time HUD updates"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            msg_type = data.get("type")
            
            if msg_type == "translate":
                # Real-time translation
                request = TranslationRequest(**data.get("payload", {}))
                response = await translate_text(request)
                await websocket.send_json({
                    "type": "translation_result",
                    "payload": response.dict()
                })
            
            elif msg_type == "recognize":
                # Real-time object recognition
                request = ObjectRecognitionRequest(**data.get("payload", {}))
                response = await recognize_objects(request)
                await websocket.send_json({
                    "type": "recognition_result",
                    "payload": response.dict()
                })
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
