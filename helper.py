# read a .txt file with scientific names and common names - formatted like scientific name common name - convert to json - use regex - first two words are scientific name, rest is commmon
import json, pathlib

fish_info = open("fishspecies.txt", "r").readlines()
fish_dict = {}
for line in fish_info:
    parts = line.split()
    scientific_name = parts[0] + " " + parts[1]
    common_name = parts[2:]
    fish_dict[scientific_name] = " ".join(common_name)
    
rows = [
    {"scientific_name": sci, "common_name": com}
    for sci, com in fish_dict.items()
]
out_path = pathlib.Path("fish_meta/species_catalog.json")
out_path.write_text(json.dumps(rows, indent=2))
print("Wrote", out_path, len(rows), "rows")