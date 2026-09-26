"""Make one illustration per department for story cards (Task 2, Phase 3).

Every story (data or news) from the same department shares one image, e.g. all Transport Canada stories
get public/story-images/tc.webp. Reads the departments used in pipeline/stories.json and
pipeline/news_stories.json and only generates the missing ones, so it's safe to re-run.

Needs GEMINI_API_KEY on a paid tier (the free tier allows 0 image requests).

Usage:
  python3 pipeline/make_images.py
  python3 pipeline/build_stories.py && python3 pipeline/build_news.py   # then rebuild to fill image_url
"""

import io
import json
from pathlib import Path

HERE = Path(__file__).parent
IMAGES = HERE.parent / "public" / "story-images"
MODEL = "gemini-3.1-flash-image"

PROMPT = """Flat, minimal editorial illustration representing the work of {department} (Government of
Canada). Simple shapes, muted colours, calm and neutral. No text, letters, logos, flags or recognizable
people."""


def image_url(dept_code):
    """Path the app serves for this department's image, or None if it hasn't been made yet."""
    name = f"{dept_code.lower()}.webp"
    return f"/story-images/{name}" if (IMAGES / name).exists() else None


def main():
    from google import genai
    from google.genai import errors, types
    from PIL import Image

    from build_news import env_key

    depts = {}
    for f in ["stories.json", "news_stories.json"]:
        for s in json.loads((HERE / f).read_text()) if (HERE / f).exists() else []:
            depts[s["dept_code"]] = s["department"]
    todo = {code: name for code, name in sorted(depts.items()) if not image_url(code)}
    print(f"{len(depts)} departments, {len(todo)} need an image")

    IMAGES.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=env_key())
    config = types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(aspect_ratio="16:9"),
    )
    for code, name in todo.items():
        try:
            res = client.models.generate_content(model=MODEL, contents=PROMPT.format(department=name), config=config)
        except errors.APIError as e:
            if e.code == 429:
                raise SystemExit("Image quota reached (free tier allows 0 image requests). Try again on a paid tier.")
            raise
        data = next((p.inline_data.data for p in res.candidates[0].content.parts if p.inline_data), None)
        if not data:
            print(f"  {code}: no image returned, skipped")
            continue
        img = Image.open(io.BytesIO(data)).convert("RGB")
        img.thumbnail((1200, 675))
        img.save(IMAGES / f"{code.lower()}.webp", quality=80)
        print(f"  {code}: {name}")


if __name__ == "__main__":
    main()
