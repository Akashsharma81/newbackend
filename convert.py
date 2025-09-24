import sys
import os
from pdf2docx import Converter

if len(sys.argv) != 3:
    print("Usage: python3 convert.py <input.pdf> <output.docx>")
    sys.exit(1)

input_file = sys.argv[1]
output_file = sys.argv[2]

try:
    # Ensure output directory exists
    output_dir = os.path.dirname(output_file)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Convert PDF → DOCX
    cv = Converter(input_file)
    cv.convert(output_file, start=0, end=None)
    cv.close()

    print(f"✅ Conversion successful: {output_file}")

except Exception as e:
    print(f"❌ Conversion failed: {e}", file=sys.stderr)
    sys.exit(1)
