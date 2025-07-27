#!/usr/bin/env python3

from fish_meta.fish_meta import get as meta_for
from fish_fallback_data import get_fallback_data

# Test the fix
scientific_name = "Caranx ignobilis"
print(f"Testing fix for: {scientific_name}")
print("=" * 50)

meta = meta_for(scientific_name)
fallback = get_fallback_data(scientific_name)

print("Meta data from APIs:")
print(f"  description: {meta.get('intro', 'NOT_FOUND')}")
print(f"  habitat: {meta.get('habitat', 'NOT_FOUND')}")
print(f"  distribution: {meta.get('distribution', 'NOT_FOUND')}")
print(f"  fun_facts: {meta.get('fun_facts', 'NOT_FOUND')}")
print(f"  visual_cues: {meta.get('visual_cues', 'NOT_FOUND')}")

print("\nFallback data:")
print(f"  habitat: {fallback.get('habitat', 'NOT_FOUND')}")
print(f"  distribution: {fallback.get('distribution', 'NOT_FOUND')}")
print(f"  fun_facts: {fallback.get('fun_facts', 'NOT_FOUND')}")
print(f"  visual_cues: {fallback.get('visual_cues', 'NOT_FOUND')}")

print("\nCombined result (what the API will return):")
print(f"  description: {meta.get('intro', 'No description available')}")
print(f"  habitat: {meta.get('habitat') or fallback.get('habitat', 'Habitat information not available')}")
print(f"  distribution: {meta.get('distribution') or fallback.get('distribution', 'Distribution information not available')}")
print(f"  fun_facts: {meta.get('fun_facts') or fallback.get('fun_facts', 'Fun facts not available')}")
print(f"  visual_cues: {meta.get('visual_cues') or fallback.get('visual_cues', 'Visual identification cues not available')}") 