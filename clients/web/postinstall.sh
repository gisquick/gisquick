#!/bin/bash

# Post-install bash script for npm web packages.

# Apply patch to angular-ui-layout library (in dist/ target directory)
mkdir -p node_modules/angular-ui-layout/dist/
cp node_modules/angular-ui-layout/src/ui-layout.css node_modules/angular-ui-layout/dist/ui-layout.css
cp node_modules/angular-ui-layout/src/ui-layout.js node_modules/angular-ui-layout/dist/ui-layout.js
patch node_modules/angular-ui-layout/dist/ui-layout.js < patches/ui-layout.js.patch
