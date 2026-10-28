"""Composite CABEK's rendered category films onto the app's near-white stage.

Run with Python 3 and Pillow after render_categories.py. Transparent Cycles
frames preserve physical contact shadows; this finish step avoids a grey video
rectangle and writes lightweight WebP posters and H.264 films using ffmpeg.
"""

import argparse
from pathlib import Path
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/cinematic"
BACKGROUND = (250, 250, 250, 255)


def composite_image(source):
    image = Image.open(source).convert("RGBA")
    background = Image.new("RGBA", image.size, BACKGROUND)
    return Image.alpha_composite(background, image).convert("RGB")


def finish_poster(category):
    source = OUTPUT / f"{category}-poster.png"
    if not source.exists() and (OUTPUT / f"{category}.webp").exists():
        return
    composite = composite_image(source)
    composite.save(OUTPUT / f"{category}.webp", quality=92, method=6)
    composite.save(source)


def finish_photograph():
    source = OUTPUT / "vehicle-photograph.png"
    composite_image(source).save(source)


def finish_film(category, frame_rate, interpolate=True):
    source_directory = Path("/tmp/cabek-cinematic") / category
    selected_frames = [*range(1, 46, 2), 48]
    frame_paths = [source_directory / f"frame-{frame:04d}.png" for frame in selected_frames]
    if any(not path.exists() for path in frame_paths):
        raise RuntimeError(f"The 24 rendered poses are incomplete for {category}")
    composited_directory = source_directory / "composited"
    composited_directory.mkdir(exist_ok=True)
    for index, path in enumerate(frame_paths):
        composite_image(path).save(composited_directory / f"frame-{index + 1:04d}.png")
    arguments = [
        "ffmpeg", "-y", "-loglevel", "warning", "-framerate", "12" if interpolate else "24",
        "-i", str(composited_directory / "frame-%04d.png"),
        "-filter_threads", "2", "-threads", "2",
    ]
    if interpolate:
        arguments.extend([
            "-vf", "tpad=stop_mode=clone:stop_duration=0.25,"
            "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
            "-t", "2",
        ])
    arguments.extend([
        "-r", str(frame_rate),
        "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
        str(OUTPUT / f"{category}.mp4"),
    ])
    subprocess.run(arguments, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("category", choices=("expertise", "quick", "verification"))
    parser.add_argument("--film", action="store_true")
    parser.add_argument("--photograph", action="store_true")
    parser.add_argument("--no-interpolate", action="store_true")
    parser.add_argument("--frame-rate", type=int, default=24)
    options = parser.parse_args()
    if options.photograph:
        finish_photograph()
        return
    finish_poster(options.category)
    if options.film:
        finish_film(options.category, options.frame_rate, not options.no_interpolate)
    print(f"Finished {options.category} assets in {OUTPUT}")


if __name__ == "__main__":
    main()
