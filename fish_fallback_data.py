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
    },
    "Carcharodon carcharias": {
        "habitat": "Coastal and open ocean waters",
        "distribution": "Worldwide in temperate and tropical seas",
        "max_length_cm": "600",
        "conservation_status": "Vulnerable",
        "fun_facts": "The Great White Shark can detect a single drop of blood in 100 liters of water!",
        "visual_cues": "• Large, torpedo-shaped body\n• White underside, gray top\n• Powerful jaws with serrated teeth\n• Can reach over 6 meters in length"
    },
    "Thunnus albacares": {
        "habitat": "Open ocean and coastal waters",
        "distribution": "Tropical and subtropical oceans worldwide",
        "max_length_cm": "200",
        "conservation_status": "Near Threatened",
        "fun_facts": "Yellowfin Tuna can swim at speeds up to 75 km/h and maintain body temperature above water temperature!",
        "visual_cues": "• Streamlined, torpedo-shaped body\n• Yellow fins and finlets\n• Metallic blue back, silver sides\n• Large eyes and pointed snout"
    },
    "Epinephelus itajara": {
        "habitat": "Coral reefs, rocky bottoms, and shipwrecks",
        "distribution": "Western Atlantic Ocean",
        "max_length_cm": "250",
        "conservation_status": "Critically Endangered",
        "fun_facts": "The Goliath Grouper can produce loud booming sounds by contracting its swim bladder!",
        "visual_cues": "• Massive, robust body\n• Mottled brown to gray coloration\n• Large mouth with thick lips\n• Can weigh over 400 kg"
    },
    "Lutjanus campechanus": {
        "habitat": "Coral reefs and rocky bottoms",
        "distribution": "Western Atlantic Ocean",
        "max_length_cm": "100",
        "conservation_status": "Vulnerable",
        "fun_facts": "Red Snapper can live up to 50 years and change color from bright red to pale pink!",
        "visual_cues": "• Bright red body with white underside\n• Sharp, pointed snout\n• Red eyes\n• Forked tail fin"
    },
    "Coryphaena hippurus": {
        "habitat": "Open ocean and coastal waters",
        "distribution": "Tropical and subtropical oceans worldwide",
        "max_length_cm": "200",
        "conservation_status": "Least Concern",
        "fun_facts": "Mahi Mahi can change colors rapidly from blue-green to gold when excited!",
        "visual_cues": "• Bright blue-green and gold coloration\n• Bulging forehead in males\n• Long, slender body\n• Forked tail fin"
    },
    "Dasyatis pastinaca": {
        "habitat": "Sandy or muddy coastal waters, often buried in sediment",
        "distribution": "Northeastern Atlantic Ocean, Mediterranean and Black Seas",
        "max_length_cm": "45",
        "conservation_status": "Least Concern",
        "fun_facts": "The Common Stingray can live up to 20 years and often buries itself in sand to ambush prey!",
        "visual_cues": "• Rounded disk shape with diamond-shaped pectoral fins\n• Plain brown or gray coloration\n• Whip-like tail with venomous spine\n• Usually measures 45 cm across"
    },
}

def get_fallback_data(scientific_name):
    """Get fallback data for a fish species"""
    return FISH_FALLBACK_DATA.get(scientific_name, {})
