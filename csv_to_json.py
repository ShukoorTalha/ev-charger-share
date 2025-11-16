import csv
import json
import sys

def main():
    if len(sys.argv) != 3:
        print("Usage: python csv_to_json.py <input_csv> <output_json>")
        sys.exit(1)

    input_csv = sys.argv[1]
    output_json = sys.argv[2]

    try:
        with open(input_csv, mode='r', encoding='utf-8') as csv_file:
            csv_reader = csv.DictReader(csv_file)
            data = list(csv_reader)

        with open(output_json, mode='w', encoding='utf-8') as json_file:
            json.dump(data, json_file, indent=4)

        print(f"Successfully converted {input_csv} to {output_json}")

    except FileNotFoundError:
        print(f"Error: The file {input_csv} was not found.")
        sys.exit(1)
    except PermissionError:
        print(f"Error: Permission denied when accessing {input_csv} or {output_json}.")
        sys.exit(1)

if __name__ == "__main__":
    main()
