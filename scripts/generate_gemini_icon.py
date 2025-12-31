"""
Generate Gemini-specific icon with blue background for OctoGPT extension.
"""

from PIL import Image, ImageDraw


def create_gemini_icon(size: int) -> Image.Image:
    """
    Create a Gemini icon at the given size with blue background.
    Design: Rounded rectangle with horizontal lines (representing prompts).
    Color scheme: Blue background for Gemini.
    """
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors - blue background for Gemini
    bg_color = (66, 133, 244)  # Google Blue
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
    # Generate only 48px icon for sidebar use
    size = 48
    icon = create_gemini_icon(size)
    filename = f"assets/icons/icon48-gemini.png"
    icon.save(filename, "PNG")
    print(f"Created {filename}")


if __name__ == "__main__":
    main()
