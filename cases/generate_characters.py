"""Generate flat vector child character illustrations using Gemini google.genai."""
from google import genai
from google.genai import types
import os

client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY', 'AIzaSyBOOkaSrprYWH2LjA8zl_U9e_EOnDFBy6I'))

output_dir = "v4/public/images/cases"

prompts = {
    "boy_small": "Flat vector illustration of a small young Asian boy, about 8-10 years old, standing facing right, looking up hopefully. Simple clean design, minimal details, soft blue t-shirt and dark blue shorts, short black hair, warm skin tone. Full body, white background, no shadow, no text. Cute friendly style, similar to health app illustrations.",
    "boy_big": "Flat vector illustration of a tall Asian teenage boy, about 16-18 years old, standing facing left, looking confident with a gentle smile. Simple clean design, minimal details, blue t-shirt and dark blue pants, short black hair, warm skin tone. Full body, white background, no shadow, no text. Same art style as a cute health app illustration.",
    "girl_small": "Flat vector illustration of a small young Asian girl, about 8-10 years old, standing facing right, looking up hopefully. Simple clean design, minimal details, soft pink top and magenta skirt, long black hair with ponytail, warm skin tone. Full body, white background, no shadow, no text. Cute friendly style, similar to health app illustrations.",
    "girl_big": "Flat vector illustration of a tall Asian teenage girl, about 16-18 years old, standing facing left, looking confident with a gentle smile. Simple clean design, minimal details, pink top and magenta skirt, long black hair with ponytail, warm skin tone. Full body, white background, no shadow, no text. Same art style as a cute health app illustration.",
}

for name, prompt in prompts.items():
    print(f"Generating {name}...")
    try:
        response = client.models.generate_images(
            model='imagen-4.0-generate-001',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="9:16",
            ),
        )
        img = response.generated_images[0].image
        path = f"{output_dir}/{name}.png"
        img.save(path)
        print(f"  Saved: {path}")
    except Exception as e:
        print(f"  Error: {e}")

print("Done!")
