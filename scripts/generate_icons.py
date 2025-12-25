"""
Generate OctoGPT extension icons.
Simple design: a sidebar/list representing prompt navigation.

Requirements: pip install Pillow
"""

from PIL import Image, ImageDraw


def create_icon(size: int) -> Image.Image:
    """
    Create an icon at the given size.
    Design: Rounded rectangle with horizontal lines (representing prompts).
    Color scheme inspired by ChatGPT's teal/green.
    """
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors
    bg_color = (16, 163, 127)  # ChatGPT's signature teal/green
    line_color = (255, 255, 255)  # White lines for contrast

    # Dimensions (proportional to size)
    padding = size * 0.1
    corner_radius = size * 0.18

    # Draw rounded rectangle background
    x0, y0 = padding, padding
    x1, y1 = size - padding, size - padding
    draw.rounded_rectangle(
        [(x0, y0), (x1, y1)],
        radius=corner_radius,
        fill=bg_color
    )

    # Draw 3 horizontal lines representing prompts/navigation
    line_padding_x = size * 0.25
    line_height = size * 0.06
    line_spacing = size * 0.18
    first_line_y = size * 0.28

    for i in range(3):
        ly = first_line_y + (i * line_spacing)
        # Each line gets slightly shorter (visual interest)
        line_width_ratio = [0.55, 0.45, 0.35][i]
        lx1 = line_padding_x + (size * line_width_ratio)

        draw.rounded_rectangle(
            [(line_padding_x, ly), (lx1, ly + line_height)],
            radius=line_height / 2,
            fill=line_color
        )

    return img


def main():
    sizes = [16, 48, 128]

    for size in sizes:
        icon = create_icon(size)
        filename = f"assets/icons/icon{size}.png"
        icon.save(filename, "PNG")
        print(f"Created {filename}")

    print("\nDone! Now update manifest.json to use PNG icons.")


if __name__ == "__main__":
    main()
