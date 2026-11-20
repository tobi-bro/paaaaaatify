from typing import Optional, Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests
from google.auth.exceptions import GoogleAuthError
from fastapi import HTTPException, status
from app.core.config import settings

DEFAULT_GOOGLE_CLIENT_ID = "691672483080-tnadcremhnfqu9nsos0g3thimhhvvp5d.apps.googleusercontent.com"

def verify_google_id_token(token: str, expected_audience: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies a Google OAuth 2.0 / OpenID Connect ID token using Google's official library.
    Validates signature, issuer, expiration, and audience.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token is required"
        )
    
    aud = expected_audience if expected_audience is not None else (
        settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else DEFAULT_GOOGLE_CLIENT_ID
    )

    try:
        request = requests.Request()
        # Verify token cryptographically against Google's public certificates
        id_info = id_token.verify_oauth2_token(token, request, audience=aud)

        # Validate issuer
        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token issuer"
            )

        # Validate required identity claims
        if not id_info.get("email"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token missing required email claim"
            )

        if not id_info.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token missing required subject (user ID) claim"
            )

        if id_info.get("email_verified") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account email is not verified"
            )

        return id_info

    except ValueError as e:
        err_msg = str(e).lower()
        if "expired" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token has expired"
            )
        elif "audience" in err_msg or "aud" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google token audience mismatch: {str(e)}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google ID token: {str(e)}"
            )
    except GoogleAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication error: {str(e)}"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        # Network or transport failure
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach Google authentication servers"
        )

