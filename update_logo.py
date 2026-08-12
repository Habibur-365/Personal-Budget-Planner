import os

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Pillow library is missing. Please run: pip install Pillow")
    exit(1)

icons_dir = "icons"
original_path = os.path.join(icons_dir, "icon-512.png")

if not os.path.exists(original_path):
    print(f"Error: {original_path} not found!")
    exit(1)

# Open original image
img = Image.open(original_path).convert("RGBA")
draw = ImageDraw.Draw(img)

# Try to use an elegant serif font
try:
    font = ImageFont.truetype("georgiab.ttf", 150)
except:
    try:
        font = ImageFont.truetype("timesbd.ttf", 150)
    except:
        try:
            font = ImageFont.truetype("arialbd.ttf", 150)
        except:
            font = ImageFont.load_default()

text = "HR"
# Match the golden color of the logo
text_color = (255, 215, 0, 255) # Gold
shadow_color = (0, 0, 0, 150) # Dark shadow

# Get text dimensions
bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]

# Position slightly above the center so it sits nicely in the upper part of the shield
x = (img.width - text_w) / 2
y = (img.height - text_h) / 2 - 40 

# Draw shadow for 3D effect
draw.text((x + 4, y + 4), text, font=font, fill=shadow_color)
# Draw golden text
draw.text((x, y), text, font=font, fill=text_color)

# Save the updated main icon
img.save(original_path)
print(f"Updated: {original_path}")

# Resize and save other formats
sizes = [72, 96, 128, 144, 152, 192, 384]
for size in sizes:
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    save_path = os.path.join(icons_dir, f"icon-{size}.png")
    resized.save(save_path)
    print(f"Updated: {save_path}")

print("\nSuccess! All logos have been updated with 'HR'.")
