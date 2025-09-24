
# import sys
# from pdf2docx import Converter

# if len(sys.argv) != 3:
#     print("Usage: python convert.py input.pdf output.docx")
#     sys.exit(1)

# input_file = sys.argv[1]
# output_file = sys.argv[2]

# try:
#     cv = Converter(input_file)
#     cv.convert(output_file, start=0, end=None)
#     cv.close()
#     print(f"Conversion successful: {output_file}")
# except Exception as e:
#     print(f"Conversion failed: {e}")
#     sys.exit(1)

import sys
import subprocess
import os

def convert(input_file, output_file):
    try:
        output_dir = os.path.dirname(output_file)

        # Ensure output directory exists
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # Try using absolute path for Render
        libreoffice_paths = [
            "/usr/bin/libreoffice",   # Render / Linux default
            "/usr/bin/soffice",       # Some distros
            "libreoffice",            # Fallback
            "soffice"                 # Fallback
        ]

        lo_command = None
        for path in libreoffice_paths:
            if subprocess.call(f"which {path}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
                lo_command = path
                break

        if not lo_command:
            raise FileNotFoundError("LibreOffice not found in system path")

        # Run conversion
        subprocess.run([
            lo_command,
            "--headless",
            "--nologo",
            "--nofirststartwizard",
            "--convert-to", "docx",
            "--outdir", output_dir,
            input_file
        ], check=True)

        print(f"✅ Converted: {input_file} -> {output_file}")

    except Exception as e:
        print("❌ Conversion failed:", str(e))
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 convert.py <input_file> <output_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    convert(input_file, output_file)

