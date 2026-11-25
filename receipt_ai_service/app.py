import logging
import threading
from functools import lru_cache
from io import BytesIO

import numpy as np
# Import Torch before PaddleOCR; importing the native runtimes in reverse order fails on Windows.
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from paddleocr import PaddleOCR
import pymupdf

from classifier import get_classifier


MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 10
MAX_IMAGE_PIXELS = 40_000_000
logger = logging.getLogger("receipt-ai")
logger.debug("Loaded CPU PyTorch runtime %s", torch.__version__)
model_lock = threading.Lock()
app = FastAPI(title="SpendWise Receipt AI")


@lru_cache(maxsize=1)
def get_ocr() -> PaddleOCR:
    return PaddleOCR(use_angle_cls=True, lang="vi", use_gpu=False, show_log=False)


def _detect_file_type(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    return None


def _images_from_upload(data: bytes, content_type: str) -> list[np.ndarray]:
    if content_type == "application/pdf":
        try:
            document = pymupdf.open(stream=data, filetype="pdf")
        except Exception as error:
            raise HTTPException(status_code=415, detail="The PDF could not be opened.") from error
        try:
            if document.page_count > MAX_PDF_PAGES:
                raise HTTPException(status_code=413, detail="PDF receipts can contain up to 10 pages.")
            images = []
            for page in document:
                rect = page.rect
                scale = min(3.0, 2800 / max(rect.width, rect.height))
                pixmap = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
                image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                images.append(np.asarray(image))
            return images
        finally:
            document.close()

    try:
        image = Image.open(BytesIO(data))
        if image.width * image.height > MAX_IMAGE_PIXELS:
            raise HTTPException(status_code=413, detail="The receipt image dimensions are too large.")
        image = ImageOps.exif_transpose(image)
        return [np.asarray(image.convert("RGB"))]
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=415, detail="The image could not be opened.") from error


def _recognize(images: list[np.ndarray]) -> tuple[str, float]:
    ocr = get_ocr()
    lines: list[str] = []
    confidences: list[float] = []
    for image in images:
        result = ocr.ocr(image, cls=True)
        page = result[0] if result and result[0] else []
        for item in page:
            if len(item) < 2 or not item[1]:
                continue
            text, confidence = item[1]
            if isinstance(text, str) and text.strip():
                lines.append(text.strip())
                confidences.append(float(confidence))
    average = sum(confidences) / len(confidences) * 100 if confidences else 0.0
    return "\n".join(lines)[:50_000], average


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scan")
def scan(file: UploadFile = File(...)) -> dict[str, object]:
    data = file.file.read(MAX_FILE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Choose a receipt file.")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Receipt files must be 10 MB or smaller.")

    content_type = _detect_file_type(data)
    if content_type is None:
        raise HTTPException(status_code=415, detail="Use a valid JPG, PNG, or PDF receipt.")

    images = _images_from_upload(data, content_type)
    if not images:
        raise HTTPException(status_code=400, detail="No pages were found in this receipt.")

    try:
        with model_lock:
            text, recognition_confidence = _recognize(images)
            category = get_classifier().classify(text) if len(text.strip()) >= 12 else None
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Receipt AI processing failed")
        raise HTTPException(status_code=503, detail="Receipt AI models could not process this file.") from error

    return {
        "text": text,
        "recognitionConfidence": recognition_confidence,
        "category": category,
    }
