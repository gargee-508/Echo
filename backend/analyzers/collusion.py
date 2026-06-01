import networkx as nx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def build_collusion_graph(papers: list[dict], all_reviews: list[dict]) -> dict:
    """
    Builds a directed graph of authors, reviewers, and papers across one or many submissions.
    Detects short cycles (e.g., Author A wrote paper P1, reviewed P2; Author B wrote P2, reviewed P1).
    Cross-paper rings require venue-level paper/review fetch (see fetch_venue_collusion_context).
    """
    G = nx.DiGraph()
    
    # Add paper nodes
    for paper in papers:
        paper_id = paper.get("id", "unknown")
        authors = paper.get("authors", [])
        
        G.add_node(paper_id, type="paper", title=paper.get("title", ""))
        
        for author in authors:
            G.add_node(author, type="author")
            # Author -> Paper edge
            G.add_edge(author, paper_id, relation="wrote")
            
    # Add reviewer edges
    for review in all_reviews:
        paper_id = review.get("paper_id")
        signatures = review.get("signatures", ["Anonymous"])
        
        for sig in signatures:
            G.add_node(sig, type="reviewer")
            # Reviewer -> Paper edge
            G.add_edge(sig, paper_id, relation="reviewed")
            
    # Detect rings (cycles of length 2 or 3)
    # This requires undirected or specific path finding. We'll find simple cycles.
    cycles = list(nx.simple_cycles(G))
    suspicious_cycles = [c for c in cycles if len(c) <= 4]
    
    # Export for D3.js visualization
    nodes_data = [{"id": n, **G.nodes[n]} for n in G.nodes()]
    edges_data = [{"source": u, "target": v, "relation": d["relation"]} for u, v, d in G.edges(data=True)]
    
    cross_paper = len(papers) > 1
    return {
        "nodes": nodes_data,
        "links": edges_data,
        "ring_count": len(suspicious_cycles),
        "suspicious_cycles": suspicious_cycles,
        "papers_in_graph": len(papers),
        "cross_paper_scan": cross_paper,
    }
