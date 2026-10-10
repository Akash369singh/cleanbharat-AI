import os
import uuid
import io
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from backend.app.config import settings

def validate_magic_bytes(header: bytes) -> str:
    """Validate file content against genuine magic bytes."""
    if len(header) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content too short or corrupted",
        )
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp"
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid file format. Only authentic JPEG, PNG, and WebP images are allowed.",
    )

def save_and_sanitize_image(upload_file: UploadFile, subfolder: str = "reports") -> str:
    """
    Validates file size (max 5MB), magic bytes, strips all EXIF GPS metadata,
    and saves to disk with a randomized UUID filename. Returns the relative file path.
    """
    contents = upload_file.file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB",
        )
    
    # Magic-byte check
    mime_type = validate_magic_bytes(contents[:16])
    
    # Extension determination
    ext_map = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    ext = ext_map.get(mime_type, ".jpg")
    
    # Random filename
    random_filename = f"{uuid.uuid4().hex}{ext}"
    target_dir = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, random_filename)
    
    try:
        # Load image via Pillow and strip EXIF
        image = Image.open(io.BytesIO(contents))
        
        # Save a clean copy without EXIF metadata (strips GPS location)
        clean_image = Image.new(image.mode, image.size)
        clean_image.putdata(list(image.getdata()))
        
        # Determine format for PIL
        pil_format = "JPEG"
        if ext == ".png":
            pil_format = "PNG"
        elif ext == ".webp":
            pil_format = "WEBP"
            
        clean_image.save(target_path, format=pil_format)
    except Exception as e:
        # If Pillow parsing fails, reject as malformed
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed image data: {str(e)}",
        )
        
    return f"{subfolder}/{random_filename}"
