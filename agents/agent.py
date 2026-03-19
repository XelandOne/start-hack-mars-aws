"""
Mars Greenhouse Agent - reads credentials from environment variables
"""
import os
import json
import logging
import boto3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REGION = os.environ.get("AWS_DEFAULT_REGION", "us-west-2")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are an autonomous Mars greenhouse management AI assistant.
You have expert knowledge about:
- Crop profiles: lettuce (15-22°C, 50-70% humidity, 30-45 day cycle), potatoes (16-20°C, 70-120 days), 
  radishes (15-22°C, 21-30 days), beans/peas (18-25°C, 50-70 days), herbs
- Mars environment: -140°C to +21°C external, 6-7 mbar pressure, 95% CO2 atmosphere
- Crew needs: 4 astronauts, 450-day mission, ~12,000 kcal/day total
- Greenhouse area allocation: 45% potatoes, 25% legumes, 17% leafy greens, 13% radishes/herbs
Answer concisely and practically."""

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        logger.info(f"Received: {req.message}")
        client = boto3.client("bedrock-runtime", region_name=REGION)
        body = {
            "messages": [{"role": "user", "content": [{"text": req.message}]}],
            "system": [{"text": SYSTEM_PROMPT}],
            "inferenceConfig": {"maxTokens": 512, "temperature": 0.7}
        }
        response = client.invoke_model(
            modelId="us.amazon.nova-lite-v1:0",
            body=json.dumps(body),
            contentType="application/json"
        )
        result = json.loads(response["body"].read())
        text = result["output"]["message"]["content"][0]["text"]
        logger.info(f"OK: {text[:80]}")
        return ChatResponse(response=text)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "region": REGION}
