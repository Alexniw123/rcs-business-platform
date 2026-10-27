import requests
from fastapi import HTTPException

def send_sinch_message(phone: str, text: str, provider):
    if not provider or not provider.api_key or not provider.sender_id:
        raise HTTPException(status_code=400, detail="Provider not configured")

    payload = {
        "to": [phone],
        "channel": "RCS",
        "from": provider.sender_id,
        "message": {
            "content": {
                "text": text
            }
        }
    }

    headers = {
        "Authorization": f"Bearer {provider.api_key}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        provider.api_url or "https://conversation.api.sinch.com/v1/batches",
        headers=headers,
        json=payload,
        timeout=30
    )

    try:
        response.raise_for_status()
    except Exception:
        raise HTTPException(status_code=400, detail=f"Sinch API error: {response.status_code} - {response.text}")

    return response.json()
