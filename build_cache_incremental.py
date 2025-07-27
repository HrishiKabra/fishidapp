#!/usr/bin/env python3
"""
Incremental Fish Cache Builder
Processes a small number of species at a time
"""

import json
import time
import shelve
import os
import sys
from fish_meta.fish_meta import get as meta_for
from fish_fallback_data import FISH_FALLBACK_DATA

def build_cache_incremental(start_index=0, count=20):
    """Build cache for a small number of species"""
    
    print(f"🐟 Incremental Cache Builder")
    print(f"Processing species {start_index + 1} to {start_index + count}")
    print("=" * 50)
    
    # Load species catalog
    with open('fish_meta/species_catalog.json', 'r') as f:
        species_list = json.load(f)
    
    total_species = len(species_list)
    end_index = min(start_index + count, total_species)
    
    cached = 0
    errors = 0
    
    with shelve.open("fish_cache") as db:
        for i in range(start_index, end_index):
            species = species_list[i]
            scientific_name = species['scientific_name']
            common_name = species['common_name']
            
            print(f"[{i + 1}/{total_species}] {scientific_name} ({common_name})")
            
            try:
                # Get metadata from APIs
                meta = meta_for(scientific_name)
                
                # Get fallback data if available
                fallback = FISH_FALLBACK_DATA.get(scientific_name, {})
                
                # Merge data
                combined_data = {
                    'scientific_name': scientific_name,
                    'common_name': meta.get('common_name') or common_name,
                    'description': meta.get('intro', 'No description available'),
                    'habitat': meta.get('habitat') or fallback.get('habitat', 'Habitat information not available'),
                    'distribution': meta.get('distribution') or fallback.get('distribution', 'Distribution information not available'),
                    'max_length_cm': meta.get('max_length_cm') or fallback.get('max_length_cm', ''),
                    'conservation_status': meta.get('iucn_status') or fallback.get('conservation_status', ''),
                    'fun_facts': meta.get('fun_facts') or fallback.get('fun_facts', 'Fun facts not available'),
                    'reference_image': meta.get('picture', ''),
                    'visual_cues': meta.get('visual_cues') or fallback.get('visual_cues', 'Visual cues not available'),
                    '_ts': time.time()
                }
                
                # Store in cache
                db[scientific_name] = combined_data
                cached += 1
                print(f"  ✅ Cached successfully")
                
                # Small delay
                time.sleep(0.3)
                
            except Exception as e:
                print(f"  ❌ Error: {e}")
                errors += 1
                continue
    
    print(f"\n✅ Batch complete: {cached} cached, {errors} errors")
    return cached, errors

def show_cache_stats():
    """Show current cache statistics"""
    
    print("\n📋 Cache Statistics:")
    print("=" * 40)
    
    try:
        with shelve.open("fish_cache") as db:
            cache_size = len(db)
            print(f"Total cached species: {cache_size}")
            
            if cache_size > 0:
                print("\nSample cached species:")
                count = 0
                for key in list(db.keys())[:5]:
                    data = db[key]
                    print(f"  • {key}: {data.get('common_name', 'Unknown')}")
                    count += 1
                    if count >= 5:
                        break
    except Exception as e:
        print(f"Error reading cache: {e}")

if __name__ == "__main__":
    # Check if GROQ_API_KEY is set
    if not os.getenv("GROQ_API_KEY"):
        print("⚠️  Warning: GROQ_API_KEY not set. Fun facts and visual cues will be limited.")
    
    # Parse command line arguments
    start_index = 0
    count = 20
    
    if len(sys.argv) >= 2:
        try:
            start_index = int(sys.argv[1])
        except ValueError:
            print("Error: start_index must be a number")
            sys.exit(1)
    
    if len(sys.argv) >= 3:
        try:
            count = int(sys.argv[2])
        except ValueError:
            print("Error: count must be a number")
            sys.exit(1)
    
    # Build cache for specified range
    cached, errors = build_cache_incremental(start_index, count)
    
    # Show stats
    show_cache_stats()
    
    print(f"\n💡 To continue building cache, run:")
    print(f"   python build_cache_incremental.py {start_index + count} {count}  # Next batch")
    print(f"   python build_cache_incremental.py {start_index + count * 2} {count}  # Next batch")
    print(f"   # And so on...") 