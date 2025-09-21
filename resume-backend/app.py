# app.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
import io
import requests
import os
import json
import numpy as np
import cv2

app = FastAPI(title="ResumeWizard API", version="2.2")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter
OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY",
    "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"
)
MODEL = "qwen/qwen3-30b-a3b:free"


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF; fallback to OCR for image-based PDFs"""
    text = ""
    try:
        with fitz.open(stream=file_content, filetype="pdf") as doc:
            for page_num, page in enumerate(doc):
                page_text = page.get_text("text").strip()
                if page_text:
                    text += page_text + "\n"
                else:
                    # Fallback OCR for scanned/image PDFs
                    pix = page.get_pixmap(dpi=400)  # higher DPI for better OCR
                    img_bytes = pix.tobytes("png")
                    try:
                        img = Image.open(io.BytesIO(img_bytes)).convert("L")  # grayscale
                        # Optional: thresholding for faint scans
                        img_np = np.array(img)
                        _, thresh_img = cv2.threshold(img_np, 150, 255, cv2.THRESH_BINARY)
                        img = Image.fromarray(thresh_img)
                        ocr_text = pytesseract.image_to_string(img, lang="eng").strip()
                        if ocr_text:
                            text += ocr_text + "\n"
                        else:
                            text += ""  # skip page if OCR empty
                    except Exception as ocr_err:
                        print(f"OCR failed on page {page_num+1}: {ocr_err}")
                        continue
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

    # Fallback warning if almost empty
    if len(text.strip()) < 50:
        text += "\n\n⚠️ Could not extract meaningful text from this PDF (mostly scanned/image)."

    # Debug preview
    print("OCR preview (first 500 chars):", text[:500])
    return text.strip()


def analyze_with_qwen(resume_text: str) -> dict:
    """Send resume text to Qwen3 via OpenRouter and get structured JSON response"""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    system_prompt = """
You are a professional resume evaluator.
Do not treat addresses, phone numbers, or emails as achievements or metrics.
Analyze the resume and respond ONLY in strict JSON with this structure:

{
  "overall_score": "number out of 10",
  "professional_summary": "2-3 line summary tailored to role & experience",
  "strengths": ["point 1", "point 2", "point 3"],
  "areas_for_improvement": ["point 1", "point 2"],
  "suggestions": ["point 1", "point 2", "point 3"],
  "grouped_skills": {
    "technical": ["skill1", "skill2"],
    "non_technical": ["skill1", "skill2"],
    "tools": ["skill1", "skill2"]
  }
}
"""

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": resume_text}
        ],
        "response_format": {"type": "json"}
    }

    response = requests.post(url, headers=headers, json=payload)

    try:
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid response from AI API: {str(e)}")

    print("AI RAW RESPONSE:", json.dumps(data, indent=2))

    try:
        if "choices" in data and "message" in data["choices"][0]:
            content = data["choices"][0]["message"]["content"]
        else:
            content = data["choices"][0]["messages"][0]["content"]
        return json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response parsing error: {str(e)}")


@app.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    """Main endpoint to analyze resume PDF"""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")

    file_content = await file.read()
    resume_text = extract_text_from_pdf(file_content)

    result = analyze_with_qwen(resume_text)
    return result


@app.get("/")
async def root():
    return {"message": "ResumeWizard FastAPI (AI-powered) is running 🚀"}

@app.post("/chat")
async def chat_endpoint(payload: dict):
    user_message = payload.get("message", "")
    if not user_message:
        return {"reply": "Please type something!"}

    # send to OpenRouter AI (reuse your existing logic)
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": "You are a professional resume assistant."},
            {"role": "user", "content": user_message}
        ]
    }
    resp = requests.post(url, headers=headers, json=data)
    reply = resp.json()["choices"][0]["message"]["content"]
    return {"reply": reply}
