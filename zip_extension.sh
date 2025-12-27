#!/bin/bash

# Remove existing zip if it exists
rm -f octogpt.zip

# Create zip file with extension files
zip -r octogpt.zip \
    manifest.json \
    content/ \
    assets/ \
    README.md \
    -x "*.DS_Store" \
    -x "*__MACOSX*"

echo "Extension zipped successfully: octogpt.zip"
