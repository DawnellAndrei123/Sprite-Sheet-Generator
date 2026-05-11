# AI Sprite Sheet Generator

A static web app for generating pixel-art sprite sheet prototypes from front, back, and side character references. It produces rows for `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, and `NW`, with action sets for idle, walking, running, attack, and dying.

## What works now

- Upload front, back, and side view references.
- Choose 2 to 16 frames per animation.
- Choose sprite cell sizes from 16 px to 2048 px.
- Generate an 8-direction sprite sheet preview in the browser.
- Export PNG plus JSON metadata.
- Copy a production AI prompt or send the job to a private AI backend URL.

## AI plan

The browser app intentionally does not store an AI API key. A production setup should add a private backend endpoint such as `/api/generate` that accepts the three uploaded views, prompt, frame count, cell size, animations, and directions, then returns a sprite sheet PNG and metadata JSON.

The current research direction is image-conditioned generation rather than training a new model from only three drawings. Public tools in this space use a similar shape: PixelLab advertises text animation, skeleton-based animation, 4-direction and 8-direction rotation, and style-consistent editing; GenSprite describes 8-direction rotation, motion-transfer sprite animation, background removal, and spritesheet export. OpenAI's current image documentation supports image generation and editing with text and image inputs, which fits a private backend workflow.

Sources:

- https://www.pixellab.ai/
- https://www.gensprite.ai/
- https://developers.openai.com/api/docs/guides/images-vision

## Publish with GitHub Pages

This is a plain static app, so publish it directly from the `main` branch root:

1. Open repository Settings.
2. Open Pages in the left sidebar.
3. Under Build and deployment, set Source to Deploy from a branch.
4. Select branch `main` and folder `/ (root)`.
5. Click Save.

After GitHub finishes the Pages deployment, the app will be available at:

`https://dawnellandrei123.github.io/Sprite-Sheet-Generator/`

GitHub says Pages can take up to 10 minutes to publish after setup.

## Local use

Open `index.html` in a browser. No build step is required.
