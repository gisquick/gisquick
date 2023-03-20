
# Project customization

Create `web/app/` directory in your QGIS/Gisquick project folder for the configuration file and assets

## Configuration file

Create JSON file `web/app/config.json` with following properties

#### Properties

- **theme_color** - color in hex notation used as primary color for UI components
- **logo** - filename of the main logo image
- **text_logo** - filename of the text logo image used mainly on places with limited height
- **text_logo_dark** - optional version of text logo image for dark background (login screen)
- **login_logo_style** - CSS styles for image logo on login screen. In this case, logo is applied as `background-image` CSS property.

#### Example
```json
{
	"theme_color": "#4e9a06",
	"logo": "logo.svg",
	"text_logo": "text-logo.svg",
	"text_logo_dark": "text-logo-dark.svg",
	"login_logo_style": {
		"max-width": "45vw",
		"background-size": "auto clamp(0px, 500px, 45vw)"
	}
}
```

If you prefer horizontaly centered login form without logo image, you can hide it with CSS style:
```
"login_logo_style": {
	"display": "none"
}
```

File paths should be relative to the `web/app/` directory and use forward slash `/` as path separator.
