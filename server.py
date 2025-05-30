from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    AutoModelForCausalLM,
    TextStreamer,
    pipeline
)
import torch
import os
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

### =======================
### Spam Detection Model
### =======================
spam_tokenizer = AutoTokenizer.from_pretrained("backend/model/outputs/models/distilbert")
spam_model = AutoModelForSequenceClassification.from_pretrained("backend/model/outputs/models/distilbert").to(device)
spam_model.eval()

class EmailInput(BaseModel):
    text: str

@app.post("/api/classify")
def classify_email(data: EmailInput):
    print(f"Received text: {data.text}")
    inputs = spam_tokenizer(data.text, return_tensors="pt", padding=True, truncation=True).to(device)
    with torch.no_grad():
        outputs = spam_model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=1)
        prediction = torch.argmax(probs).item()
        confidence = probs[0][prediction].item()

    return {
        "predicted_class": int(prediction),
        "label": "Spam" if prediction == 1 else "Not Spam",
        "probabilities": probs[0].cpu().numpy().tolist(),
        "confidence": float(confidence)
    }

### =======================
### Generative Model (Mistral)
### =======================

print("[+] Loading Mistral model...")
"""gen_model_name = "mistralai/Mistral-7B-Instruct-v0.1"

gen_tokenizer = AutoTokenizer.from_pretrained(gen_model_name)
gen_model = AutoModelForCausalLM.from_pretrained(
    gen_model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

print("[+] Mistral loaded successfully")

class PromptInput(BaseModel):
    prompt: str

@app.post("/api/generate-reply")
def generate_reply(data: PromptInput):
    prompt = f"[INST] {data.prompt.strip()} [/INST]"

    inputs = gen_tokenizer(prompt, return_tensors="pt").to(device)

    with torch.no_grad():
        output = gen_model.generate(
            **inputs,
            max_new_tokens=300,
            do_sample=True,
            temperature=0.7,
            top_p=0.95
        )

    decoded = gen_tokenizer.decode(output[0], skip_special_tokens=True)
    reply = decoded.split("[/INST]")[-1].strip()
    return {"reply": reply}
"""

@app.get("/api/ping")
def ping():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
