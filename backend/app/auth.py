import os
import time
from typing import Optional
import httpx
import jwt
from fastapi import Header, HTTPException, status
from jwt.exceptions import PyJWTError

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
# Set to 'true' to skip Clerk verification locally for quick testing
BYPASS_AUTH = os.getenv("BYPASS_AUTH", "false").lower() == "true"

# Cache for JWKS keys
# Format: {"keys": [...], "fetched_at": timestamp}
jwks_cache = {
    "keys": [],
    "fetched_at": 0
}
CACHE_TTL = 3600  # Cache keys for 1 hour

async def fetch_jwks() -> list:
    now = time.time()
    if jwks_cache["keys"] and (now - jwks_cache["fetched_at"] < CACHE_TTL):
        return jwks_cache["keys"]
    
    if not CLERK_JWKS_URL:
        # Fallback for local dev if not configured but bypass auth is false
        raise RuntimeError(
            "CLERK_JWKS_URL environment variable is not configured. "
            "Please set CLERK_JWKS_URL or enable BYPASS_AUTH=true for local offline development."
        )
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(CLERK_JWKS_URL)
            response.raise_for_status()
            data = response.json()
            jwks_cache["keys"] = data.get("keys", [])
            jwks_cache["fetched_at"] = now
            return jwks_cache["keys"]
    except Exception as e:
        # Fallback to cached keys if fetch fails
        if jwks_cache["keys"]:
            return jwks_cache["keys"]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch JWKS keys from Clerk: {str(e)}"
        )

def get_public_key(kid: str, keys: list):
    for key in keys:
        if key.get("kid") == kid:
            # Reconstruct the public key from the JWK
            return jwt.algorithms.RSAAlgorithm.from_jwk(key)
    return None

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if BYPASS_AUTH:
        # Under bypass mode, use token string itself as username, or fallback to mock
        if not authorization or not authorization.startswith("Bearer "):
            return "mock_user_123"
        return authorization.split(" ")[1]

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        # Decode the token header to retrieve the kid (key ID)
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token header missing key ID (kid)"
            )
            
        keys = await fetch_jwks()
        public_key = get_public_key(kid, keys)
        if not public_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Public key not found for kid"
            )
            
        # Decode and verify the JWT signature using the public key
        # Clerk tokens do not strictly enforce an audience validation for extensions, so we disable verify_aud.
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        
        # User ID is the subject (sub) claim
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload missing subject (sub)"
            )
            
        return clerk_user_id
        
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
