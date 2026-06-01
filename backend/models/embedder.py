import hashlib
import logging
import math
import re
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Singleton pattern for the model so it only loads once in memory
class Embedder:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Embedder, cls).__new__(cls)
            
            # Production / low-resource bypass:
            # Force local lexical fallback to avoid PyTorch imports and heavy model downloads
            # that cause Out-Of-Memory (OOM) crashes and 10-minute timeouts on Render Free tier.
            if os.getenv("RENDER") or os.getenv("USE_FALLBACK_EMBEDDER") == "true":
                logger.info("Production/Render environment detected. Enabling lightweight lexical fallback embedder to save RAM and boot instantly!")
                cls._instance.model = None
                cls._instance.using_fallback = True
                return cls._instance
                
            logger.info("Loading local HuggingFace embedding model (all-MiniLM-L6-v2)...")
            try:
                # Dynamic import to avoid loading heavy torch/sentence_transformers modules on boot
                from sentence_transformers import SentenceTransformer
                
                # all-MiniLM-L6-v2 is fast, small, and good for general semantic similarity.
                # If it is not cached and the network is unavailable, fall back to a
                # deterministic local embedding so the forensic pipeline still runs.
                cls._instance.model = SentenceTransformer('all-MiniLM-L6-v2')
                cls._instance.using_fallback = False
            except Exception as exc:
                logger.warning("Falling back to local lexical embedder: %s", exc)
                cls._instance.model = None
                cls._instance.using_fallback = True
        return cls._instance
        
    def encode(self, texts: list[str]):
        if self.model is not None:
            return self.model.encode(texts)
        return [self._fallback_embedding(text) for text in texts]

    def _fallback_embedding(self, text: str, dimensions: int = 384) -> list[float]:
        vector = [0.0] * dimensions
        words = re.findall(r"\b[a-zA-Z][a-zA-Z0-9_-]{2,}\b", text.lower())
        for word in words:
            digest = hashlib.blake2b(word.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "big") % dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]

def get_embedder():
    return Embedder()


def get_embedder_mode() -> dict[str, str]:
    """Report which embedding backend is active (for benchmark / health transparency)."""
    embedder = get_embedder()
    if embedder.using_fallback:
        return {
            "mode": "lexical_fallback",
            "model": "blake2b hashed bag-of-words (384-d)",
            "note": (
                "Render and USE_FALLBACK_EMBEDDER=true use the lightweight embedder. "
                "Local runs may use sentence-transformers all-MiniLM-L6-v2; "
                "stylometry scores can differ between environments."
            ),
        }
    return {
        "mode": "sentence_transformer",
        "model": "all-MiniLM-L6-v2",
        "note": "Full semantic embeddings active.",
    }

if __name__ == "__main__":
    emb = get_embedder()
    vectors = emb.encode(["Hello World", "This is a test"])
    print(f"Generated {len(vectors)} embeddings of shape {vectors[0].shape}")
