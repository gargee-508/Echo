from scipy.spatial.distance import cosine
from models.embedder import get_embedder
from analyzers.config import MIN_REVIEW_CHARS, STYLOMETRY_SIMILARITY_THRESHOLD
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_stylometry(paper_text: str, reviews: list[dict]) -> dict:
    """
    Compare the stylometric fingerprint of the paper abstract/content with the reviews.
    If the cosine similarity is unusually high, it flags potential AI-generated collusion 
    (i.e., the same model prompted to write the paper and the review).
    """
    if not paper_text or not reviews:
        return {"error": "Missing paper text or reviews"}
        
    embedder = get_embedder()
    
    # 1. Embed the paper
    paper_embedding = embedder.encode([paper_text])[0]
    
    # 2. Embed the reviews
    results = []
    suspicious_count = 0
    
    for review in reviews:
        review_text = review.get("text", "")
        if len(review_text) < MIN_REVIEW_CHARS:
            continue
            
        review_embedding = embedder.encode([review_text])[0]
        
        similarity = 1 - cosine(paper_embedding, review_embedding)
        is_suspicious = bool(similarity > STYLOMETRY_SIMILARITY_THRESHOLD)
        if is_suspicious:
            suspicious_count += 1
            
        results.append({
            "review_id": review.get("id"),
            "similarity_score": round(float(similarity), 4),
            "is_suspicious": is_suspicious
        })
        
    return {
        "overall_suspicion_level": "High" if suspicious_count > 0 else "Low",
        "suspicious_matches": suspicious_count,
        "details": results
    }

if __name__ == "__main__":
    test_paper = "This paper introduces a novel architecture for deep learning, leveraging multi-head attention mechanisms."
    test_reviews = [
        {"id": "r1", "text": "This paper introduces a novel architecture for deep learning, leveraging multi-head attention mechanisms. I think it is great."},
        {"id": "r2", "text": "The authors present a good approach, but the evaluation is lacking on standard benchmarks like ImageNet."}
    ]
    print(analyze_stylometry(test_paper, test_reviews))
