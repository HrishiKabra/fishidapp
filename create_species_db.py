import sqlite3
import json
import os
from fish_meta.fish_meta import get as meta_for

def create_species_database():
    """Create and populate the species database"""
    
    # Create database connection
    conn = sqlite3.connect('species.db')
    cursor = conn.cursor()
    
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
    
    # Get species catalog
    species_catalog = meta_for("_list")
    
    # Sample species data with proper information
    sample_species = [
        {
            "scientific_name": "Amphiprion ocellatus",
            "common_name": "Clownfish",
            "image_url": "https://www.fishbase.se/images/species/Amocel_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "Up to 11 cm",
            "iucn_status": "LC",
            "description": "Bright orange fish with white stripes, lives symbiotically in sea anemones. Made famous by the movie Finding Nemo."
        },
        {
            "scientific_name": "Paracanthurus hepatus",
            "common_name": "Blue Tang",
            "image_url": "https://www.fishbase.se/images/species/Parhep_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "Up to 30 cm",
            "iucn_status": "LC",
            "description": "Bright blue fish with black patterns, popular in aquariums and known as 'Dory' from Finding Nemo."
        },
        {
            "scientific_name": "Hippocampus kuda",
            "common_name": "Common Seahorse",
            "image_url": "https://www.fishbase.se/images/species/Hipkud_u0.jpg",
            "habitat": "Seagrass beds",
            "location": "Indo-Pacific",
            "size": "Up to 17 cm",
            "iucn_status": "VU",
            "description": "Unique fish with horse-like head and prehensile tail. Males carry the eggs in a brood pouch."
        },
        {
            "scientific_name": "Rhincodon typus",
            "common_name": "Whale Shark",
            "image_url": "https://www.fishbase.se/images/species/Rhityp_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical oceans worldwide",
            "size": "Up to 12 m",
            "iucn_status": "EN",
            "description": "The largest fish in the ocean, gentle filter feeders that can grow up to 40 feet long."
        },
        {
            "scientific_name": "Manta birostris",
            "common_name": "Giant Manta Ray",
            "image_url": "https://www.fishbase.se/images/species/Manbir_u0.jpg",
            "habitat": "Open ocean",
            "location": "Tropical and subtropical oceans",
            "size": "Up to 7 m wingspan",
            "iucn_status": "VU",
            "description": "Majestic rays with the largest brain-to-body ratio of any fish. Known for their graceful swimming."
        },
        {
            "scientific_name": "Acanthurus chirurgus",
            "common_name": "Doctorfish",
            "image_url": "https://www.fishbase.se/images/species/Acachu_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Western Atlantic",
            "size": "Up to 39 cm",
            "iucn_status": "LC",
            "description": "Surgeonfish with sharp spines on the tail. Named for the scalpel-like spines they use for defense."
        },
        {
            "scientific_name": "Balistoides conspicillum",
            "common_name": "Clown Triggerfish",
            "image_url": "https://www.fishbase.se/images/species/Balcon_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "Up to 50 cm",
            "iucn_status": "LC",
            "description": "Colorful triggerfish with distinctive patterns. Known for their strong jaws that can crush coral."
        },
        {
            "scientific_name": "Zebrasoma flavescens",
            "common_name": "Yellow Tang",
            "image_url": "https://www.fishbase.se/images/species/Zebfla_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Hawaiian Islands",
            "size": "Up to 20 cm",
            "iucn_status": "LC",
            "description": "Bright yellow surgeonfish endemic to Hawaii. Popular in aquariums and important for reef health."
        },
        {
            "scientific_name": "Chaetodon auriga",
            "common_name": "Threadfin Butterflyfish",
            "image_url": "https://www.fishbase.se/images/species/Chaaur_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific",
            "size": "Up to 23 cm",
            "iucn_status": "LC",
            "description": "Elegant butterflyfish with distinctive thread-like extension on the dorsal fin."
        },
        {
            "scientific_name": "Pterois volitans",
            "common_name": "Red Lionfish",
            "image_url": "https://www.fishbase.se/images/species/Ptevol_u0.jpg",
            "habitat": "Coral reefs",
            "location": "Indo-Pacific (invasive in Atlantic)",
            "size": "Up to 38 cm",
            "iucn_status": "LC",
            "description": "Venomous fish with striking red and white stripes. Invasive species in the Atlantic Ocean."
        }
    ]
    
    # Insert sample species data
    for species in sample_species:
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
    
    # Add some species from the catalog with basic info
    for i, species in enumerate(species_catalog[:50]):  # Limit to first 50
        # Get basic details if available
        details = meta_for(species['scientific_name'])
        
        # Create species object with fallback values
        species_data = {
            'scientific_name': species['scientific_name'],
            'common_name': species['common_name'],
            'image_url': details.get('picture', '/placeholder.svg?height=200&width=300&query=fish') if details else '/placeholder.svg?height=200&width=300&query=fish',
            'habitat': details.get('habitat', 'Coral reefs') if details else 'Coral reefs',
            'location': details.get('distribution', 'Indo-Pacific') if details else 'Indo-Pacific',
            'size': f"Up to {details.get('max_length_cm', 20)} cm" if details and details.get('max_length_cm') else "Up to 20 cm",
            'iucn_status': details.get('iucn_status', 'LC') if details else 'LC',
            'description': details.get('description', f"A {species['common_name'].lower()} found in marine environments.") if details else f"A {species['common_name'].lower()} found in marine environments."
        }
        
        cursor.execute('''
            INSERT OR REPLACE INTO species 
            (id, scientific_name, common_name, image_url, habitat, location, size, iucn_status, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            species_data['scientific_name'].replace(' ', '_').lower(),
            species_data['scientific_name'],
            species_data['common_name'],
            species_data['image_url'],
            species_data['habitat'],
            species_data['location'],
            species_data['size'],
            species_data['iucn_status'],
            species_data['description']
        ))
    
    # Commit and close
    conn.commit()
    conn.close()
    
    print(f"✅ Species database created successfully!")
    print(f"📊 Added {len(sample_species) + min(50, len(species_catalog))} species to the database")

if __name__ == "__main__":
    create_species_database() 