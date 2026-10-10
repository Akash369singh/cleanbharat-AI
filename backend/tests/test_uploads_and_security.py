import io
from PIL import Image

def test_upload_rejection_for_non_image_file(client, citizen_headers):
    # Send a text or python script disguised as an image
    fake_file = io.BytesIO(b"print('malicious script or invalid payload')")
    response = client.post(
        "/api/reports/upload",
        files={"file": ("malicious.jpg", fake_file, "image/jpeg")},
        headers=citizen_headers
    )
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]

def test_upload_acceptance_for_valid_sanitized_image(client, citizen_headers):
    # Create valid minimal JPEG image in-memory
    img = Image.new("RGB", (100, 100), color="blue")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)

    response = client.post(
        "/api/reports/upload",
        files={"file": ("clean_photo.jpg", img_byte_arr, "image/jpeg")},
        headers=citizen_headers
    )
    assert response.status_code == 200
    assert "photo_path" in response.json()
    assert response.json()["photo_path"].startswith("reports/")

def test_unauthenticated_request_rejected(client):
    response = client.get("/api/reports/my")
    assert response.status_code == 401
