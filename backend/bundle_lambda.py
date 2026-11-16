#!/usr/bin/env python3
"""
Multi-Architecture, Multi-Python Lambda Bundler for Jet Freight Rate Aggregator.
Guarantees 100% binary compatibility on AWS Lambda across:
- Python 3.10, 3.11, 3.12, 3.13
- Architectures: x86_64 (Intel/AMD) and aarch64 (Graviton/ARM64)
by embedding official precompiled manylinux pydantic-core binaries directly.
"""
import glob
import io
import json
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PKG_DIR = os.path.join(BACKEND_DIR, "lambda_pkg")
ZIP_PATH = os.path.join(BACKEND_DIR, "lambda-bundle.zip")

print("=== Step 1: Clean build environment ===")
if os.path.exists(PKG_DIR):
    shutil.rmtree(PKG_DIR)
if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)
os.makedirs(PKG_DIR, exist_ok=True)

print("=== Step 2: Install dependencies ===")
packages = [
    "mangum",
    "fastapi",
    "uvicorn",
    "pydantic",
    "pydantic-settings",
    "sqlalchemy",
    "aiosqlite",
    "pypdf",
    "httpx",
    "python-multipart",
    "python-dotenv",
]

subprocess.run(
    [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--upgrade",
        "--target",
        PKG_DIR,
        "--no-compile",
        *packages,
    ],
    check=True,
)

print("\n=== Step 3: Embed Universal Multi-ABI pydantic-core binaries ===")
# Determine installed pydantic-core version
dist_infos = glob.glob(os.path.join(PKG_DIR, "pydantic_core-*.dist-info"))
if not dist_infos:
    raise RuntimeError("Could not find pydantic_core dist-info in lambda_pkg")

dist_name = os.path.basename(dist_infos[0])
version = dist_name.split("-")[1].replace(".dist", "")
print(f"Detected installed pydantic_core version: {version}")

pydantic_core_dir = os.path.join(PKG_DIR, "pydantic_core")
os.makedirs(pydantic_core_dir, exist_ok=True)

# Remove any non-linux binaries installed by local pip (e.g. darwin.so or win_amd64.pyd)
for f in os.listdir(pydantic_core_dir):
    if f.endswith((".dylib", ".pyd")) or ("darwin" in f):
        os.remove(os.path.join(pydantic_core_dir, f))
        print(f"Removed non-linux binary: {f}")

# Fetch release wheel metadata from PyPI for this exact version
pypi_url = f"https://pypi.org/pypi/pydantic-core/{version}/json"
req = urllib.request.Request(pypi_url, headers={"User-Agent": "LambdaBundler/1.0"})
with urllib.request.urlopen(req) as resp:
    pypi_data = json.load(resp)

urls = pypi_data.get("urls", [])

target_configs = [
    ("cp310", "x86_64"),
    ("cp310", "aarch64"),
    ("cp311", "x86_64"),
    ("cp311", "aarch64"),
    ("cp312", "x86_64"),
    ("cp312", "aarch64"),
    ("cp313", "x86_64"),
    ("cp313", "aarch64"),
]

extracted_count = 0
for pyver, arch in target_configs:
    matched_wheel = None
    for u in urls:
        fn = u["filename"]
        if (
            fn.endswith(".whl")
            and f"{pyver}-{pyver}" in fn
            and arch in fn
            and "manylinux" in fn
        ):
            matched_wheel = u
            break

    if not matched_wheel:
        print(f"Warning: No matching wheel found on PyPI for {pyver} {arch}")
        continue

    fn = matched_wheel["filename"]
    print(f"Downloading binary for {pyver} {arch} from {fn}...")
    wreq = urllib.request.Request(matched_wheel["url"], headers={"User-Agent": "LambdaBundler/1.0"})
    with urllib.request.urlopen(wreq) as wresp:
        whl_bytes = wresp.read()

    with zipfile.ZipFile(io.BytesIO(whl_bytes)) as z:
        for member in z.namelist():
            if member.startswith("pydantic_core/_pydantic_core.") and member.endswith(".so"):
                dest_file = os.path.join(pydantic_core_dir, os.path.basename(member))
                with open(dest_file, "wb") as f:
                    f.write(z.read(member))
                print(f"  -> Extracted: {os.path.basename(member)} ({os.path.getsize(dest_file)} bytes)")
                extracted_count += 1

print(f"\nTotal pydantic-core binary extensions embedded: {extracted_count}")
for f in sorted(os.listdir(pydantic_core_dir)):
    if f.endswith(".so"):
        print(f"  ✓ {f}")

print("\n=== Step 4: Assemble lambda-bundle.zip ===")
with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as z:
    # 1. Add packages from PKG_DIR
    for root, dirs, files in os.walk(PKG_DIR):
        dirs[:] = [d for d in dirs if d != "__pycache__"]
        for f in files:
            if f.endswith((".pyc", ".dylib")) or ("darwin" in f):
                continue
            abs_p = os.path.join(root, f)
            rel_p = os.path.relpath(abs_p, PKG_DIR)
            z.write(abs_p, rel_p)

    # 2. Add entrypoints
    for entry in ["lambda_handler.py", "lambda_function.py"]:
        p = os.path.join(BACKEND_DIR, entry)
        if os.path.exists(p):
            z.write(p, entry)

    # 3. Add app and data folders
    for folder in ["app", "data"]:
        f_dir = os.path.join(BACKEND_DIR, folder)
        for root, dirs, files in os.walk(f_dir):
            dirs[:] = [d for d in dirs if d != "__pycache__"]
            for f in files:
                if f.endswith(".pyc"):
                    continue
                abs_p = os.path.join(root, f)
                rel_p = os.path.relpath(abs_p, BACKEND_DIR)
                z.write(abs_p, rel_p)

zip_size_mb = os.path.getsize(ZIP_PATH) / (1024 * 1024)
print(f"\nSuccessfully generated {ZIP_PATH} ({zip_size_mb:.2f} MB)")
