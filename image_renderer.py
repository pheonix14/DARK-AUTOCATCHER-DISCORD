"""
image_renderer.py — Generates dynamic premium glassmorphic cards in Chinese Han / Black Myth Wukong style.
Uses silver, slate, jade and gold color schemes with organic borders and the Sumi-e dragon watermark.
"""
import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_PATH = os.path.join(BASE_DIR, "logo.png")

# Wukong Sumi-e Palette
TEXT_SILVER = (226, 226, 231, 255)
TEXT_MUTED = (94, 92, 104, 255)
ACCENT_JADE = (61, 143, 120, 255)
ACCENT_GOLD = (197, 160, 89, 255)
BG_DARK = (8, 8, 10, 255)
BG_GLASS = (14, 14, 18, 200)       # Frosted charcoal glass
BG_GLASS_HIGHLIGHT = (20, 20, 26, 230)

def generate_glass_card(title, lines, output_filename="response.png"):
    """
    Renders a premium Black Myth Wukong styled card response with dynamic height.
    """
    # 1. Base dimensions with dynamic height calculation
    width = 750
    line_count = len(lines)
    card_padding = 20
    header_h = 75
    line_height = 28
    
    # Calculate required height dynamically
    content_height = header_h + 30 + (line_count * line_height) + 60
    height = max(450, content_height)
    
    base_img = Image.new("RGBA", (width, height), BG_DARK)
    
    # Create overlay for translucent drawings
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # 2. Draw organic glass card background
    card_padding = 20
    cx0, cy0 = card_padding, card_padding
    cx1, cy1 = width - card_padding, height - card_padding
    
    # Custom rounded shape simulating scroll
    draw.rounded_rectangle([cx0, cy0, cx1, cy1], radius=18, fill=BG_GLASS)
    
    # Inner overlapping header segment
    header_h = 75
    draw.rounded_rectangle([cx0 + 10, cy0 + 10, cx1 - 10, cy0 + header_h], radius=10, fill=BG_GLASS_HIGHLIGHT)

    # 3. Draw calligraphic solid outlines (Silver & Slate)
    # Inner border
    draw.rounded_rectangle([cx0 + 5, cy0 + 5, cx1 - 5, cy1 - 5], radius=15, outline=TEXT_MUTED, width=1)
    # Outer border
    draw.rounded_rectangle([cx0 + 2, cy0 + 2, cx1 - 2, cy1 - 2], radius=16, outline=TEXT_SILVER, width=1)

    # 4. Load & overlay translucent sumi-e dragon watermark
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert("RGBA")
            logo_w, logo_h = 240, 240
            logo = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
            
            # Extract alpha channel and apply low translucency (0.05)
            r, g, b, a = logo.split()
            a = a.point(lambda p: int(p * 0.05))
            translucent_logo = Image.merge("RGBA", (r, g, b, a))
            
            pos_x = cx1 - logo_w - 30
            pos_y = (height - logo_h) // 2
            overlay.paste(translucent_logo, (pos_x, pos_y), translucent_logo)
            
            # Corner logo in header
            corner_w, corner_h = 36, 36
            corner_logo = logo.resize((corner_w, corner_h), Image.Resampling.LANCZOS)
            r2, g2, b2, a2 = corner_logo.split()
            a2 = a2.point(lambda p: int(p * 0.5))
            corner_logo = Image.merge("RGBA", (r2, g2, b2, a2))
            overlay.paste(corner_logo, (cx0 + 20, cy0 + 20), corner_logo)
        except Exception as e:
            print(f"[DARK] Logo rendering error: {e}")

    # 5. Load fonts
    font_names = ["consolab.ttf", "consolas.ttf", "lucon.ttf", "cour.ttf", "arial.ttf"]
    font_title = None
    font_body = None
    font_small = None
    
    for f_name in font_names:
        try:
            font_title = ImageFont.truetype(f_name, 22)
            font_body = ImageFont.truetype(f_name, 16)
            font_small = ImageFont.truetype(f_name, 11)
            break
        except OSError:
            continue

    if not font_title:
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # 6. Draw Text Info
    # Title (Gold Calligraphic highlight)
    draw.text((cx0 + 70, cy0 + 28), title.upper(), fill=ACCENT_GOLD, font=font_title)
    
    # Dynamic Catcher Engaged status badge overlay
    from utils import read_config
    try:
        conf = read_config()
        if conf.get("catch_enabled", "true") == "true":
            draw.text((cx1 - 250, cy0 + 30), "[DARK CATCHER ENGAGED]", fill=ACCENT_GOLD, font=font_small)
    except Exception:
        pass

    # Body lines
    start_y = cy0 + header_h + 30
    line_height = 28
    for i, line in enumerate(lines):
        y_pos = start_y + (i * line_height)
        if ":" in line:
            key, val = line.split(":", 1)
            # Use jade for keys
            draw.text((cx0 + 30, y_pos), key + ":", fill=ACCENT_JADE, font=font_body)
            draw.text((cx0 + 30 + draw.textlength(key + ":", font=font_body) + 5, y_pos), val, fill=TEXT_SILVER, font=font_body)
        else:
            draw.text((cx0 + 30, y_pos), line, fill=TEXT_SILVER, font=font_body)

    # 7. Footers (Monochrome Wukong styling)
    draw.text((cx0 + 30, cy1 - 25), "developed by pheonix14", fill=TEXT_MUTED, font=font_small)
    # Clearly written: "GET PREMIUM FOR BETTER"
    draw.text((cx1 - 220, cy1 - 25), "★ GET PREMIUM FOR BETTER", fill=ACCENT_GOLD, font=font_small)

    # Blend and save
    final_img = Image.alpha_composite(base_img, overlay)
    output_path = os.path.join(BASE_DIR, output_filename)
    final_img.save(output_path, "PNG")
    return output_path
