import sys
import json

json_file = sys.argv[1]

with open(json_file, "r") as f:
    data = json.load(f)

with open(json_file.replace(".json", ".csv"), "w") as f:
    for k, v in data.items():
        score, x, y = v[0], v[1], v[2]
        f.write(f"{k},{score},{x},{y}\n")

print(f"Converted {json_file} to {json_file.replace('.json', '.csv')}")
