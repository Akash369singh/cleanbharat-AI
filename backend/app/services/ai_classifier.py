from typing import Dict, Any, Optional
import os

class WasteClassifierInterface:
    """Pluggable interface for AI waste classification."""
    def classify(self, text: str, category: str, image_path: Optional[str] = None) -> Dict[str, Any]:
        raise NotImplementedError

class RulesFallbackClassifier(WasteClassifierInterface):
    """
    Transparent rules-based classifier based on keyword analysis and category context.
    Labelled strictly with source: "rules_fallback".
    """
    def classify(self, text: str, category: str, image_path: Optional[str] = None) -> Dict[str, Any]:
        text_lower = (text or "").lower()
        cat_lower = (category or "").lower()
        
        # Determine waste type
        waste_type = "mixed_other"
        detected_keywords = []
        
        if cat_lower == "plastic_waste":
            waste_type = "plastic"
            detected_keywords.append("category_plastic")
        elif cat_lower == "drain_clog":
            waste_type = "mixed_other"
            detected_keywords.append("category_drain")
        elif any(w in text_lower for w in ["bottle", "polythene", "plastic", "bag", "pouch", "wrapper", "poly"]):
            waste_type = "plastic"
            detected_keywords.append("plastic_indicators")
        elif any(w in text_lower for w in ["vegetable", "kitchen", "wet", "leaf", "leaves", "rotten", "compost", "fruit"]) or ("food" in text_lower and "packaging" not in text_lower):
            waste_type = "organic"
            detected_keywords.append("organic_indicators")
        elif any(w in text_lower for w in ["paper", "cardboard", "carton", "newspaper", "box"]):
            waste_type = "paper"
            detected_keywords.append("paper_indicators")
        elif any(w in text_lower for w in ["metal", "iron", "can", "tin", "wire", "steel"]):
            waste_type = "metal"
            detected_keywords.append("metal_indicators")
        elif any(w in text_lower for w in ["glass", "broken glass", "mirror"]):
            waste_type = "glass"
            detected_keywords.append("glass_indicators")
        elif any(w in text_lower for w in ["battery", "wire", "electronic", "computer", "phone", "e-waste", "circuit"]):
            waste_type = "e-waste"
            detected_keywords.append("ewaste_indicators")
            
        # Detect conditions
        is_overflow = any(w in text_lower for w in ["overflow", "spilling", "filled", "bursting", "spread"]) or cat_lower == "overflowing_bin"
        is_drain_obstruction = any(w in text_lower for w in ["drain", "nala", "choke", "gutter", "clog", "sewage", "stagnant"]) or cat_lower == "drain_clog"
        is_large_pile = any(w in text_lower for w in ["huge", "massive", "dump", "pile", "mound", "heap", "truckload"]) or cat_lower == "garbage_dump"
        
        confidence = 0.82 if detected_keywords else 0.65
        
        return {
            "waste_type": waste_type,
            "is_overflow": is_overflow,
            "is_drain_obstruction": is_drain_obstruction,
            "is_large_pile": is_large_pile,
            "confidence": confidence,
            "source": "rules_fallback",
            "model_name": "KeywordCategoryRuleClassifier-v1",
            "limitations": "Inference generated via transparent keyword-and-category heuristics. No deep learning model is active without verified local model weights.",
            "recommended_action": (
                "Deploy desilting and vacuum crew immediately" if is_drain_obstruction
                else "Schedule high-capacity compactor truck" if is_large_pile
                else "Dispatch local collection rickshaw"
            )
        }

def get_classifier() -> WasteClassifierInterface:
    # If custom neural weights are loaded in future, return ML classifier; otherwise return transparent fallback
    return RulesFallbackClassifier()
