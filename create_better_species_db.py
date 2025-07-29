import sqlite3
import json
import os

def create_better_species_database():
    """Create and populate the species database with better data"""
    
    # Create database connection
    conn = sqlite3.connect('species.db')
    cursor = conn.cursor()
    
    # Drop existing table and recreate
    cursor.execute('DROP TABLE IF EXISTS species')
    
    # Create species table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS species (
            id TEXT PRIMARY KEY,
            scientific_name TEXT NOT NULL,
            common_name TEXT NOT NULL,
            image_url TEXT,
            habitat TEXT,
            location TEXT,
            size TEXT,
            iucn_status TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # High-quality species data with varied information
    species_data = [
        {
            "scientific_name": "Amphiprion ocellatus",
            "common_name": "Clownfish",
            "image_url": "https://www.fishbase.se/images/species/Amocel_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "11 cm",
            "iucn_status": "LC",
            "description": "Bright orange fish with white stripes. Lives symbiotically in sea anemones."
        },
        {
            "scientific_name": "Paracanthurus hepatus",
            "common_name": "Blue Tang",
            "image_url": "https://www.fishbase.se/images/species/Parhep_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "30 cm",
            "iucn_status": "LC",
            "description": "Bright blue fish with black patterns. Popular in aquariums."
        },
        {
            "scientific_name": "Hippocampus kuda",
            "common_name": "Common Seahorse",
            "image_url": "https://www.fishbase.se/images/species/Hipkud_u0.jpg",
            "habitat": "Seagrass beds",
            "location": "Indo-Pacific",
            "size": "17 cm",
            "iucn_status": "VU",
            "description": "Unique fish with horse-like head. Males carry eggs in brood pouch."
        },
        {
            "scientific_name": "Rhincodon typus",
            "common_name": "Whale Shark",
            "image_url": "https://www.fishbase.se/images/species/Rhityp_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical oceans worldwide",
            "size": "12 m",
            "iucn_status": "EN",
            "description": "Largest fish in the ocean. Gentle filter feeders."
        },
        {
            "scientific_name": "Manta birostris",
            "common_name": "Giant Manta Ray",
            "image_url": "https://www.fishbase.se/images/species/Manbir_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "7 m wingspan",
            "iucn_status": "VU",
            "description": "Majestic rays with large brain-to-body ratio."
        },
        {
            "scientific_name": "Acanthurus chirurgus",
            "common_name": "Doctorfish",
            "image_url": "https://www.fishbase.se/images/species/Acachu_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Western Atlantic",
            "size": "39 cm",
            "iucn_status": "LC",
            "description": "Surgeonfish with sharp spines on tail for defense."
        },
        {
            "scientific_name": "Balistoides conspicillum",
            "common_name": "Clown Triggerfish",
            "image_url": "https://www.fishbase.se/images/species/Balcon_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "50 cm",
            "iucn_status": "LC",
            "description": "Colorful triggerfish with strong jaws for crushing coral."
        },
        {
            "scientific_name": "Zebrasoma flavescens",
            "common_name": "Yellow Tang",
            "image_url": "https://www.fishbase.se/images/species/Zebfla_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Hawaiian Islands",
            "size": "20 cm",
            "iucn_status": "LC",
            "description": "Bright yellow surgeonfish endemic to Hawaii."
        },
        {
            "scientific_name": "Chaetodon auriga",
            "common_name": "Threadfin Butterflyfish",
            "image_url": "https://www.fishbase.se/images/species/Chaaur_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "23 cm",
            "iucn_status": "LC",
            "description": "Elegant butterflyfish with thread-like dorsal fin extension."
        },
        {
            "scientific_name": "Pterois volitans",
            "common_name": "Red Lionfish",
            "image_url": "https://www.fishbase.se/images/species/Ptevol_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific (invasive in Atlantic)",
            "size": "38 cm",
            "iucn_status": "LC",
            "description": "Venomous fish with striking red and white stripes."
        },
        {
            "scientific_name": "Thunnus albacares",
            "common_name": "Yellowfin Tuna",
            "image_url": "https://www.fishbase.se/images/species/Thualb_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "2.4 m",
            "iucn_status": "LC",
            "description": "Fast-swimming predator with yellow fins."
        },
        {
            "scientific_name": "Carcharodon carcharias",
            "common_name": "Great White Shark",
            "image_url": "https://www.fishbase.se/images/species/Carcar_u0.jpg",
            "habitat": "Coastal and open ocean",
            "location": "Worldwide",
            "size": "6 m",
            "iucn_status": "VU",
            "description": "Apex predator with powerful jaws and keen senses."
        },
        {
            "scientific_name": "Dasyatis americana",
            "common_name": "Southern Stingray",
            "image_url": "https://www.fishbase.se/images/species/Dasame_u0.jpg",
            "habitat": "Sandy bottoms",
            "location": "Western Atlantic",
            "size": "1.5 m wingspan",
            "iucn_status": "LC",
            "description": "Flat-bodied ray that buries in sand to ambush prey."
        },
        {
            "scientific_name": "Epinephelus itajara",
            "common_name": "Goliath Grouper",
            "image_url": "https://www.fishbase.se/images/species/Epiita_u0.jpg",
            "habitat": "Coral reefs and mangroves",
            "location": "Western Atlantic",
            "size": "2.5 m",
            "iucn_status": "CR",
            "description": "Massive grouper that can weigh over 300 kg."
        },
        {
            "scientific_name": "Lutjanus campechanus",
            "common_name": "Red Snapper",
            "image_url": "https://www.fishbase.se/images/species/Lutcam_u0.jpg",
            "habitat": "Reefs and wrecks",
            "location": "Gulf of Mexico and Caribbean",
            "size": "1 m",
            "iucn_status": "LC",
            "description": "Popular game fish with bright red coloration."
        },
        {
            "scientific_name": "Sphyraena barracuda",
            "common_name": "Great Barracuda",
            "image_url": "https://www.fishbase.se/images/species/Sphbar_u0.jpg",
            "habitat": "Coral reefs and open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "1.8 m",
            "iucn_status": "LC",
            "description": "Fearsome predator with sharp teeth and lightning speed."
        },
        {
            "scientific_name": "Acanthocybium solandri",
            "common_name": "Wahoo",
            "image_url": "https://www.fishbase.se/images/species/Acasol_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "2.5 m",
            "iucn_status": "LC",
            "description": "Fast-swimming mackerel with streamlined body."
        },
        {
            "scientific_name": "Coryphaena hippurus",
            "common_name": "Mahi Mahi",
            "image_url": "https://www.fishbase.se/images/species/Corhip_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "2 m",
            "iucn_status": "LC",
            "description": "Colorful fish with distinctive head shape."
        },
        {
            "scientific_name": "Xiphias gladius",
            "common_name": "Swordfish",
            "image_url": "https://www.fishbase.se/images/species/Xipgla_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and temperate oceans",
            "size": "4.5 m",
            "iucn_status": "NT",
            "description": "Large predator with distinctive sword-like bill."
        },
        {
            "scientific_name": "Makaira nigricans",
            "common_name": "Blue Marlin",
            "image_url": "https://www.fishbase.se/images/species/Maknig_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "4.2 m",
            "iucn_status": "VU",
            "description": "Powerful billfish with cobalt blue coloration."
        },
        {
            "scientific_name": "Istiophorus platypterus",
            "common_name": "Sailfish",
            "image_url": "https://www.fishbase.se/images/species/Istpla_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "3.4 m",
            "iucn_status": "LC",
            "description": "Fastest fish in the ocean with distinctive sail-like dorsal fin."
        }
    ]
    
    # Insert species data
    for species in species_data:
        cursor.execute('''
            INSERT OR REPLACE INTO species 
            (id, scientific_name, common_name, image_url, habitat, location, size, iucn_status, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            species['scientific_name'].replace(' ', '_').lower(),
            species['scientific_name'],
            species['common_name'],
            species['image_url'],
            species['habitat'],
            species['location'],
            species['size'],
            species['iucn_status'],
            species['description']
        ))
    
    # Commit and close
    conn.commit()
    conn.close()
    
    print(f"✅ Better species database created successfully!")
    print(f"📊 Added {len(species_data)} high-quality species to the database")
    print(f"🎯 Features: Varied habitats, correct sizes, proper IUCN status, concise descriptions")

if __name__ == "__main__":
    create_better_species_database() 