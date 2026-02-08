# ReefLab Documentation Images

This directory contains images and visual assets for the ReefLab documentation.

## Creating the Tank Animation GIF

To create the `tank-animation.gif` referenced in the main README:

### Option 1: Screen Recording (Recommended)

1. Start the ReefLab frontend in development mode:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to a tank without a custom image (or temporarily remove a tank image)
   - The `DefaultTankAnimation` component will display the animated aquarium

3. Use a screen recording tool to capture the animation:
   - **macOS**: Use QuickTime Player or `screencapture`
   - **Windows**: Use Xbox Game Bar or OBS Studio
   - **Linux**: Use `ffmpeg` or SimpleScreenRecorder

4. Convert the recording to GIF using tools like:
   - [ezgif.com](https://ezgif.com/) - Online converter
   - FFmpeg: `ffmpeg -i recording.mov -vf "fps=15,scale=800:-1:flags=lanczos" -c:v gif tank-animation.gif`
   - Photoshop or GIMP

### Option 2: Browser Developer Tools

1. Open the ReefLab app in browser
2. Navigate to a tank showing the `DefaultTankAnimation`
3. Open browser DevTools (F12)
4. Use the "Capture node screenshot" feature to capture the animation
5. Create GIF from the frames using a GIF maker tool

### Option 3: Use Animated Screenshot Tool

Tools like [ScreenToGif](https://www.screentogif.com/) (Windows) or [Gifski](https://gif.ski/) (macOS) can capture and create GIFs directly.

### Recommended Settings

- **Dimensions**: 800x450px or similar 16:9 aspect ratio
- **Frame Rate**: 15-20 fps
- **Duration**: 5-10 seconds (looping)
- **Optimization**: Use tools like [gifsicle](https://www.lcdf.org/gifsicle/) to optimize file size
  ```bash
  gifsicle -O3 --colors 256 tank-animation.gif -o tank-animation-optimized.gif
  ```

## Current Files

- `tank-animation.gif` - Animated aquarium visualization (to be created)

## Contributing

If you create documentation images or diagrams for ReefLab, please:
1. Use clear, high-quality screenshots
2. Optimize file sizes
3. Use descriptive filenames
4. Add them to this directory
5. Reference them in the main README or other documentation
