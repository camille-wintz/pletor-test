Updated docker commands:

`docker compose -f docker-compose.prod.yml up -d --build # prod on :80
docker compose -f docker-compose.prod.yml down

docker compose up -d # dev on :5173`

# Download times

Several changes were made:

- Load thumbnails instead of full images,
- Only load in 20 images chunks,
- Cache the images and thumbnails,
- Production mode
- Cache

## Thumbnails

### Handling existing images

We currently have a fair amount of images without thumbnails (\* assuming here that the unsplash images are "pretend" images that have been upload by users, not actual unsplash images). Those images should have thumbnails to make the current experience immediately better.

Selected option: a migration script rather than re-generating on first request. We only have 2k images, which makes the script fast enough, and avoids striking a random user with mass-generation as they scroll. Also, this allows us to run the generation on low usage times rather than randomly.

### Thumbnail size

Width 300px width, the thumbnails will look a bit lower quality on Retina screens. If we want to handle those use case, we could increase the size for bigger resolution and accept slower loading times. Given that the app is picto share rather than a portfolio app, we assumed that the loading speed mattered more than high quality visuals on Retina.

### Production mode

The docker file didn't handle production mode yet, causing slow loading times of the js files.

### Cache

The images weren't cached, they are cached now.

# Masonry layout

The height and width of each image is determined during the upload and sent to the clients via the API. The masonic lib is used to avoid having images move from one column to another, and to free memory when scrolling down.

## Scroll stability

Since we're handling different image sizes, there are new width/height properties to allow the frontend to build the visual structure before images are loaded.

## Navigating back and forth

The page and image are stored in the URL, which allows us to change the layout if needed without breaking the URL patterns (so users' bookmarks and shared links keep working.) This means that scrolling halfway through an image will refresh on top of the image, and not exactly where the person was.

# Upload

## New component

After scrolling, the upload form isn't visible anymore and it's impossible to track running uploads. There is therefore a floating component allowing both to upload more files and track currently uploaded files. The existing component has been left as is, with the assumption that it's front and center to encourage users to upload (put the emphasis on upload rather than image consulting.)

## Dropped preview

For convenience and especially for mass uploads, validating each image isn't hugely practical. The validation step has been removed and the image is uploaded immediately.

# Refactoring

While the app is basically fine, it lacked several basic strucural elements:

- Added a tsconfig file for proper ts project management
- Added a gitignore file to exclude python cache
- Reorganized the main component in logical hooks and components
- Added a Claude.md and skills for basic context
- Added a prod docker for js minification and loading times

# Time and priorities

Given the time imparted (1.5h) plus the state of the app (single component, no prod build) I decided to prioritize features over time. While the app isn't great, it's useable until the next update arrives. In this case, it's better to take longer and avoid having to rework later than to make small fixes urgently.

My choice would have been different if the features were more controversial. But given that it's thumbnails/minification/multiple upload, I felt like there wasn't much risk in making the change.

Other tasks skipped:

## Tailwind

Currently, the CSS is simply inline. Given a bit more time, I would have moved the CSS to a tailwind config, and defined purely stylistic components.

## Transitions

The bottom component doesn't have transitions and looks basic. With more time, I would have polished it more.

## Bonus

While Playwright has real value to avoid regressions, the other two are expanding on the scope. For the video, it would need to generate a clean thumbnail via canvas, and play with the video tag inline. For the toggle, while the feature is simple, it can cause some side-effects that would need to be tested cleanly.
