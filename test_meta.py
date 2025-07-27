#!/usr/bin/env python3

from fish_meta.fish_meta import get as meta_for

# Test the meta_for function
scientific_name = "Caranx ignobilis"
print(f"Testing meta_for for: {scientific_name}")
print("=" * 50)

try:
    meta = meta_for(scientific_name)
    print("Raw meta data:")
    print(meta)
    print("\n" + "=" * 50)
    
    # Check specific fields
    fields = ['common_name', 'description', 'habitat', 'distribution', 'max_length_cm', 'conservation_status', 'fun_facts', 'visual_cues']
    
    for field in fields:
        value = meta.get(field, 'NOT_FOUND')
        print(f"{field}: {value}")
        
except Exception as e:
    print(f"Error: {e}") 