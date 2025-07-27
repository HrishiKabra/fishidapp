"""
Fallback fish data for when external APIs are unavailable
"""

FISH_FALLBACK_DATA = {
    "Caranx ignobilis": {
        "habitat": "Coral reefs, rocky shores, and open ocean",
        "distribution": "Indo-Pacific region, from South Africa to Hawaii",
        "max_length_cm": "170",
        "conservation_status": "Least Concern",
        "fun_facts": "The Giant Trevally (Caranx ignobilis) is known for its impressive surfing skills, using waves to catch sea birds and other prey off guard!",
        "visual_cues": "• Large, robust body with silvery-blue coloration\n• Prominent black spot on gill cover\n• Strong, forked tail fin\n• Adults can reach over 1.5 meters in length"
    },
    "Paracanthurus hepatus": {
        "habitat": "Coral reefs and lagoons",
        "distribution": "Indo-Pacific region",
        "max_length_cm": "30",
        "conservation_status": "Least Concern",
        "fun_facts": "The Blue Tang (Paracanthurus hepatus) can change color from blue to purple when stressed or during courtship!",
        "visual_cues": "• Bright blue body with yellow tail\n• Black 'palette' marking on side\n• Oval-shaped body\n• Small mouth with sharp teeth"
    },
    "Acanthurus coeruleus": {
        "habitat": "Coral reefs and rocky areas",
        "distribution": "Western Atlantic Ocean",
        "max_length_cm": "39",
        "conservation_status": "Least Concern",
        "fun_facts": "The Blue Tang (Acanthurus coeruleus) uses its sharp spine on the tail to defend against predators!",
        "visual_cues": "• Blue to purple body coloration\n• Sharp spine on tail base\n• Oval-shaped body\n• Small mouth adapted for grazing algae"
    }
}

def get_fallback_data(scientific_name):
    """Get fallback data for a fish species"""
    return FISH_FALLBACK_DATA.get(scientific_name, {}) 