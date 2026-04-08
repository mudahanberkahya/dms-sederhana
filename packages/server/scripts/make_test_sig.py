from PIL import Image, ImageDraw, ImageFont

def create_signature(filename="/Users/pdt/Documents/DMS/test_signature.png"):
    # Create a new image with transparent background (120x60 is our stamp size)
    img = Image.new('RGBA', (120, 60), (255, 255, 255, 0))
    d = ImageDraw.Draw(img)
    
    # Draw a simple text path mimicking a signature
    d.text((10, 20), "Budi Signature", fill=(0, 0, 0, 255))
    
    img.save(filename)

if __name__ == "__main__":
    create_signature()
    print("Test PNG Signature Created.")
