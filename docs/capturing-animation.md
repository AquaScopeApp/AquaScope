# Creating the Tank Animation GIF

This guide provides multiple methods to create the animated aquarium GIF for the README.

## Quick Start (Automated)

### Method 1: Using the Capture Script (Recommended)

1. **Install dependencies**:
   ```bash
   npm install --save-dev puppeteer gifencoder pngjs
   ```

2. **Start your dev server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Run the capture script**:
   ```bash
   node scripts/capture-tank-animation.js
   ```

4. **Optimize the output**:
   ```bash
   gifsicle -O3 --colors 256 docs/images/tank-animation.gif -o docs/images/tank-animation-optimized.gif
   mv docs/images/tank-animation-optimized.gif docs/images/tank-animation.gif
   ```

## Manual Methods

### Method 2: Screen Recording (macOS)

1. **Start the app**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate** to a tank without a custom image or the Tanks dashboard

3. **Record with QuickTime**:
   - Open QuickTime Player
   - File → New Screen Recording
   - Select the animation area (800x450 recommended)
   - Record for 5-10 seconds
   - Stop and save as `tank-recording.mov`

4. **Convert to GIF with ffmpeg**:
   ```bash
   ffmpeg -i tank-recording.mov \
     -vf "fps=15,scale=800:-1:flags=lanczos,crop=800:450:0:0" \
     -c:v gif \
     docs/images/tank-animation.gif
   ```

5. **Optimize**:
   ```bash
   gifsicle -O3 --colors 256 \
     docs/images/tank-animation.gif \
     -o docs/images/tank-animation-optimized.gif
   ```

### Method 3: Screen Recording (Windows)

1. **Start the app**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Record with Xbox Game Bar**:
   - Press `Win + G` to open Xbox Game Bar
   - Click the record button
   - Record the animation for 5-10 seconds
   - Stop recording (Win + Alt + R)
   - Video saved to `%USERPROFILE%\Videos\Captures`

3. **Convert to GIF**:
   - Use online tool: [ezgif.com/video-to-gif](https://ezgif.com/video-to-gif)
   - Or install ffmpeg and use the command from Method 2

### Method 4: Screen Recording (Linux)

1. **Install SimpleScreenRecorder**:
   ```bash
   sudo apt install simplescreenrecorder  # Ubuntu/Debian
   # or
   sudo dnf install simplescreenrecorder  # Fedora
   ```

2. **Start the app**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Record** with SimpleScreenRecorder:
   - Select the animation area
   - Record for 5-10 seconds
   - Save as MP4 or WebM

4. **Convert to GIF**:
   ```bash
   ffmpeg -i recording.mp4 \
     -vf "fps=15,scale=800:-1:flags=lanczos" \
     -c:v gif \
     docs/images/tank-animation.gif
   ```

### Method 5: Using Gifski (macOS - Best Quality)

1. **Install Gifski**:
   ```bash
   brew install gifski
   ```

2. **Record with QuickTime** (see Method 2)

3. **Convert with Gifski** (better quality than ffmpeg):
   ```bash
   gifski \
     --fps 15 \
     --width 800 \
     --quality 90 \
     -o docs/images/tank-animation.gif \
     tank-recording.mov
   ```

### Method 6: Using ScreenToGif (Windows - Easy)

1. **Download ScreenToGif**:
   - Visit: [screentogif.com](https://www.screentogif.com/)
   - Install the application

2. **Start the app and record**:
   - Open ScreenToGif
   - Click "Recorder"
   - Position the recording frame over the animation
   - Click Record
   - Let it record for 5-10 seconds
   - Click Stop

3. **Edit and export**:
   - Trim frames if needed
   - File → Save As
   - Choose "Gif" format
   - Optimize settings (15fps, 800px width)
   - Save to `docs/images/tank-animation.gif`

## Online Conversion Tools

If you have a video but no local tools:

1. **ezgif.com** - [ezgif.com/video-to-gif](https://ezgif.com/video-to-gif)
   - Upload your video
   - Set size to 800px width
   - Set frame rate to 15 FPS
   - Click "Convert to GIF"
   - Download and save to `docs/images/tank-animation.gif`

2. **CloudConvert** - [cloudconvert.com](https://cloudconvert.com/)
   - Upload video
   - Convert to GIF
   - Configure quality settings
   - Download result

## Optimization

After creating the GIF, always optimize it to reduce file size:

### Using gifsicle (Recommended)

```bash
# Install gifsicle
brew install gifsicle  # macOS
sudo apt install gifsicle  # Ubuntu/Debian
choco install gifsicle  # Windows (with Chocolatey)

# Optimize
gifsicle -O3 --colors 256 \
  docs/images/tank-animation.gif \
  -o docs/images/tank-animation-optimized.gif

# Replace original if smaller
mv docs/images/tank-animation-optimized.gif docs/images/tank-animation.gif
```

### Using Online Tools

- [ezgif.com/optimize](https://ezgif.com/optimize) - GIF optimizer
- Set compression level to 35-50
- Choose "Lossy GIF" for better compression

## Recommended Settings

For the best balance of quality and file size:

- **Dimensions**: 800x450px (16:9 aspect ratio)
- **Frame Rate**: 15 FPS
- **Duration**: 5-10 seconds (looping)
- **Colors**: 256 colors max
- **Optimization Level**: High (gifsicle -O3)
- **Target File Size**: < 2MB for GitHub README

## Tips for Best Results

1. **Clean Background**: Ensure browser window is clean, no dev tools visible
2. **Steady Recording**: Keep the recording area stable
3. **Full Animation Cycle**: Capture at least one complete swim cycle of all fish
4. **No UI Elements**: Hide browser chrome, toolbars, and bookmarks
5. **Consistent Lighting**: Use the same theme/appearance settings
6. **Test First**: Create a test GIF before final capture

## Troubleshooting

### GIF is too large (> 5MB)

- Reduce dimensions: `scale=600:-1` instead of 800
- Lower frame rate: `fps=10` instead of 15
- Reduce colors: `--colors 128` instead of 256
- Shorten duration: 5 seconds instead of 10

### GIF looks pixelated

- Increase quality in conversion tool
- Use Gifski instead of ffmpeg (better dithering)
- Increase color count: `--colors 256`
- Use higher source video quality

### Animation is choppy

- Increase frame rate: `fps=20`
- Ensure source recording is smooth
- Check browser performance during recording

### Colors look wrong

- Use `flags=lanczos` for better color interpolation
- Increase color palette: `--colors 256`
- Check original video colors before conversion

## Verification

After creating the GIF, verify:

1. ✅ File size < 2MB (ideally < 1MB)
2. ✅ Dimensions are 800x450px (or proportional)
3. ✅ Animation loops smoothly
4. ✅ All fish, bubbles, and seaweed are visible
5. ✅ No browser UI elements visible
6. ✅ Colors look correct (blue ocean gradient)

## Updating the README

Once you have the final GIF:

1. Save it as `docs/images/tank-animation.gif`
2. Update README.md to reference the GIF instead of SVG:
   ```markdown
   ![ReefLab Animated Demo](docs/images/tank-animation.gif)
   ```
3. Commit and push to GitHub
4. Verify it displays correctly on GitHub README

## Need Help?

If you encounter issues:

1. Check that the frontend is running correctly
2. Verify the DefaultTankAnimation component is rendering
3. Try the automated script first (Method 1)
4. Use online tools as a fallback (ezgif.com)
5. Ask for help in [GitHub Discussions](https://github.com/AquaScopeApp/AquaScope/discussions)
