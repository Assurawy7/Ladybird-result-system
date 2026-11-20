# Per-school app name and icon

Every school uses the same code. Each school's installed app (phone icon, app
name, Android APK) gets its own look from SETTINGS on that school's Netlify
site plus a small folder of pictures here.

## 1. Make the pictures (once per school)
Make two square PNG pictures of the school logo:
- `icon-192.png`  exactly 192 x 192 pixels
- `icon-512.png`  exactly 512 x 512 pixels
Optional: `icon-maskable-512.png` (512 x 512, logo kept inside the middle 80%
so phones can crop it into a circle without cutting the logo).

Free way: open pwabuilder.com/imageGenerator, upload the logo, download the
pack, and take the 192 and 512 pictures from it.

## 2. Put them in a folder named after the school
    brand/greenfield/icon-192.png
    brand/greenfield/icon-512.png
Use lowercase letters, numbers and dashes only. Commit and push.

## 3. Set these on that school's Netlify site (Site configuration > Environment variables)
| Name | Example |
|---|---|
| `BRAND` | `greenfield` (the folder name) |
| `APP_NAME` | `Greenfield Academy Results` |
| `APP_SHORT_NAME` | `Greenfield` (12 letters or fewer) |
| `THEME_COLOR` | `#0B6B3A` (optional) |

Then Deploys > Trigger deploy > Clear cache and deploy site. Phones that
already installed the app pick up the new name and icon after it is closed and
reopened (Android sometimes needs the app removed and installed again).

A school with none of these settings (such as the first school) keeps the
Ladybird name and icon. Never set these on your own computer: they rewrite
`manifest.json`, `index.html` and the `icons` folder.
