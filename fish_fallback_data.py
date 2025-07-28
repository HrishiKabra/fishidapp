"""
Fallback fish data for when external APIs are unavailable
"""

FISH_FALLBACK_DATA = {
    "Caranx ignobilis": {
        "habitat": "Coral reefs, rocky shores, and open ocean",
        "distribution": "Indo-Pacific region, from South Africa to Hawaii",
        "max_length_cm": "170",
        "conservation_status": "Least Concern",
        "description": "The Giant Trevally is a powerful predator that hunts near coral reefs and rocky shores. These impressive fish can grow over 5 feet long and are known for their incredible jumping ability when chasing prey.",
        "fun_facts": "The Giant Trevally (Caranx ignobilis) is known for its impressive surfing skills, using waves to catch sea birds and other prey off guard!",
        "visual_cues": "• **Large body**: Robust, silvery-blue coloration with prominent black spot on gill cover.\n• **Strong tail**: Forked tail fin with powerful swimming capability.\n• **Size**: Adults can reach over 1.5 meters in length.\n• **Coloration**: Metallic silver to blue-green body with darker back."
    },
    "Paracanthurus hepatus": {
        "habitat": "Coral reefs and lagoons",
        "distribution": "Indo-Pacific region",
        "max_length_cm": "30",
        "conservation_status": "Least Concern",
        "description": "The Blue Tang is a popular aquarium fish known for its bright blue color and distinctive yellow tail. These peaceful fish graze on algae and are often seen swimming in groups around coral reefs.",
        "fun_facts": "The Blue Tang (Paracanthurus hepatus) can change color from blue to purple when stressed or during courtship!",
        "visual_cues": "• **Bright blue body**: Oval-shaped body with vibrant blue coloration.\n• **Yellow tail**: Distinctive yellow tail fin.\n• **Black marking**: Black 'palette' marking on the side.\n• **Small mouth**: Sharp teeth adapted for grazing algae."
    },
    "Acanthurus coeruleus": {
        "habitat": "Coral reefs and rocky areas",
        "distribution": "Western Atlantic Ocean",
        "max_length_cm": "39",
        "conservation_status": "Least Concern",
        "description": "The Blue Tang is a beautiful reef fish with a bright blue body and distinctive yellow tail. These fish use their sharp tail spines for defense and spend most of their time grazing on algae.",
        "fun_facts": "The Blue Tang (Acanthurus coeruleus) uses its sharp spine on the tail to defend against predators!",
        "visual_cues": "• **Blue coloration**: Blue to purple body with oval shape.\n• **Sharp spine**: Prominent spine on tail base for defense.\n• **Small mouth**: Adapted for grazing algae.\n• **Streamlined body**: Efficient swimming form."
    },
    "Carcharodon carcharias": {
        "habitat": "Coastal and open ocean waters",
        "distribution": "Worldwide in temperate and tropical seas",
        "max_length_cm": "600",
        "conservation_status": "Vulnerable",
        "description": "The Great White Shark is one of the ocean's most powerful predators, known for its impressive size and hunting skills. These sharks can grow over 20 feet long and are found in coastal waters around the world.",
        "fun_facts": "The Great White Shark can detect a single drop of blood in 100 liters of water!",
        "visual_cues": "• **Large size**: Torpedo-shaped body reaching over 6 meters.\n• **Coloration**: White underside with gray top.\n• **Powerful jaws**: Serrated teeth for hunting.\n• **Dorsal fin**: Prominent triangular dorsal fin."
    },
    "Thunnus albacares": {
        "habitat": "Open ocean and coastal waters",
        "distribution": "Tropical and subtropical oceans worldwide",
        "max_length_cm": "200",
        "conservation_status": "Near Threatened",
        "description": "The Yellowfin Tuna is a fast-swimming ocean predator known for its speed and strength. These fish can reach speeds of 50 mph and are popular targets for sport fishing.",
        "fun_facts": "Yellowfin Tuna can swim at speeds up to 75 km/h and maintain body temperature above water temperature!",
        "visual_cues": "• **Streamlined body**: Torpedo-shaped for fast swimming.\n• **Yellow fins**: Distinctive yellow fins and finlets.\n• **Coloration**: Metallic blue back with silver sides.\n• **Large eyes**: Prominent eyes and pointed snout."
    },
    "Epinephelus itajara": {
        "habitat": "Coral reefs, rocky bottoms, and shipwrecks",
        "distribution": "Western Atlantic Ocean",
        "max_length_cm": "250",
        "conservation_status": "Critically Endangered",
        "description": "The Goliath Grouper is a massive reef fish that can grow over 8 feet long and weigh 800 pounds. These gentle giants are found around coral reefs and shipwrecks in the Atlantic.",
        "fun_facts": "The Goliath Grouper can produce loud booming sounds by contracting its swim bladder!",
        "visual_cues": "• **Massive size**: Robust body that can weigh over 400 kg.\n• **Mottled coloration**: Brown to gray with irregular patterns.\n• **Large mouth**: Thick lips and wide gape.\n• **Dorsal spines**: Multiple dorsal spines for defense."
    },
    "Lutjanus campechanus": {
        "habitat": "Coral reefs and rocky bottoms",
        "distribution": "Western Atlantic Ocean",
        "max_length_cm": "100",
        "conservation_status": "Vulnerable",
        "description": "The Red Snapper is a popular game fish known for its bright red color and delicious taste. These fish can live over 50 years and are found in the Gulf of Mexico and Caribbean.",
        "fun_facts": "Red Snapper can live up to 50 years and change color from bright red to pale pink!",
        "visual_cues": "• **Red coloration**: Bright red body with white underside.\n• **Sharp snout**: Pointed snout for feeding.\n• **Red eyes**: Distinctive red eye coloration.\n• **Forked tail**: Deeply forked tail fin."
    },
    "Coryphaena hippurus": {
        "habitat": "Open ocean and coastal waters",
        "distribution": "Tropical and subtropical oceans worldwide",
        "max_length_cm": "200",
        "conservation_status": "Least Concern",
        "description": "The Mahi Mahi is a colorful ocean fish known for its bright blue and gold colors. These fast swimmers are popular targets for sport fishing and are found in warm waters worldwide.",
        "fun_facts": "Mahi Mahi can change colors rapidly from blue-green to gold when excited!",
        "visual_cues": "• **Bright colors**: Blue-green and gold coloration.\n• **Bulging forehead**: Males have prominent forehead.\n• **Long body**: Slender, streamlined body.\n• **Forked tail**: Deeply forked tail fin."
    },
    "Dasyatis pastinaca": {
        "habitat": "Sandy or muddy coastal waters, often buried in sediment",
        "distribution": "Northeastern Atlantic Ocean, Mediterranean and Black Seas",
        "max_length_cm": "45",
        "conservation_status": "Least Concern",
        "description": "The Common Stingray is a flat fish that lives on sandy ocean floors. These gentle creatures often bury themselves in sand and use their venomous tail spine for defense.",
        "fun_facts": "The Common Stingray can live up to 20 years and often buries itself in sand to ambush prey!",
        "visual_cues": "• **Rounded disk**: Diamond-shaped pectoral fins with flat body.\n• **Plain coloration**: Brown or gray with no distinctive markings.\n• **Whip-like tail**: Long tail with venomous spine.\n• **Size**: Usually measures 45 cm across."
    },
}

def get_fallback_data(scientific_name):
    """Get fallback data for a fish species"""
    return FISH_FALLBACK_DATA.get(scientific_name, {})
