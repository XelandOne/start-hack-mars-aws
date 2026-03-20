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

JSON_SYSTEM_PROMPT = """You are a Mars greenhouse crop allocation optimizer.
You MUST respond with ONLY a single line of valid JSON — no explanation, no markdown, no code block, no extra text.
The JSON must have exactly these keys: lettuce, potato, radish, beans, herbs (integers 0-100), and reasoning (string).
Any response that is not pure JSON will cause a system failure."""

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

def invoke_bedrock(system_prompt: str, message: str, max_tokens: int = 512, temperature: float = 0.7) -> str:
    client = boto3.client("bedrock-runtime", region_name=REGION)
    body = {
        "messages": [{"role": "user", "content": [{"text": message}]}],
        "system": [{"text": system_prompt}],
        "inferenceConfig": {"maxTokens": max_tokens, "temperature": temperature}
    }
    response = client.invoke_model(
        modelId="us.amazon.nova-lite-v1:0",
        body=json.dumps(body),
        contentType="application/json"
    )
    result = json.loads(response["body"].read())
    return result["output"]["message"]["content"][0]["text"]


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        logger.info(f"Received: {req.message}")
        text = invoke_bedrock(SYSTEM_PROMPT, req.message)
        logger.info(f"OK: {text[:80]}")
        return ChatResponse(response=text)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend", response_model=ChatResponse)
def recommend(req: ChatRequest):
    """Dedicated endpoint for structured JSON crop allocation recommendations."""
    try:
        logger.info(f"Recommend request: {req.message}")
        # Use temperature=0 for deterministic JSON output
        text = invoke_bedrock(JSON_SYSTEM_PROMPT, req.message, max_tokens=256, temperature=0)
        logger.info(f"Recommend response: {text[:120]}")
        # Extract the JSON object robustly — find first { and last }
        start = text.find('{')
        end = text.rfind('}')
        if start == -1 or end == -1 or end <= start:
            raise ValueError(f"No JSON object found in response: {text}")
        json_str = text[start:end+1]
        json.loads(json_str)  # validate
        return ChatResponse(response=json_str)
    except json.JSONDecodeError:
        logger.error(f"Model returned non-JSON: {text}")
        raise HTTPException(status_code=422, detail=f"Model returned non-JSON: {text}")
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok", "region": REGION}
