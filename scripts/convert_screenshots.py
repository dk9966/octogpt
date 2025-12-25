#!/usr/bin/env python3
"""Convert screenshots to Chrome Web Store specs: 1280x800, 24-bit PNG (no alpha)"""

from PIL import Image
import os

SCREENSHOTS_DIR = "screenshots"
OUTPUT_DIR = "screenshots/store"
TARGET_SIZE = (1280, 800)

def convert_screenshot(input_path, output_path):
    """Resize and convert image to 24-bit PNG without alpha."""
    img = Image.open(input_path)
    
    # Convert to RGB (removes alpha channel)
    if img.mode in ('RGBA', 'LA', 'P'):
        # Create white background for transparency
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        if img.mode in ('RGBA', 'LA'):
            background.paste(img, mask=img.split()[-1])
            img = background
        else:
            img = img.convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Calculate resize to fit 1280x800 while maintaining aspect ratio
    # Then center-crop or pad to exact dimensions
    orig_w, orig_h = img.size
    target_w, target_h = TARGET_SIZE
    
    # Scale to cover the target area
    scale = max(target_w / orig_w, target_h / orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    
    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center crop to exact dimensions
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    img = img.crop((left, top, left + target_w, top + target_h))
    
    # Save as 24-bit PNG (no alpha since we're in RGB mode)
    img.save(output_path, 'PNG', optimize=True)
    print(f"Converted: {input_path} -> {output_path} ({img.size})")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    screenshots = [f for f in os.listdir(SCREENSHOTS_DIR) 
                   if f.lower().endswith(('.png', '.jpg', '.jpeg')) 
                   and not f.startswith('.')]
    
    for filename in sorted(screenshots)[:5]:  # Max 5 screenshots
        input_path = os.path.join(SCREENSHOTS_DIR, filename)
        output_name = os.path.splitext(filename)[0] + '.png'
        output_path = os.path.join(OUTPUT_DIR, output_name)
        convert_screenshot(input_path, output_path)
    
    print(f"\nDone! Converted {min(len(screenshots), 5)} screenshots to {OUTPUT_DIR}/")

if __name__ == "__main__":
    main()
