#!/bin/bash

# Post-install bash script for npm web packages.

# Apply patch to angular-material
cp node_modules/angular-material/angular-material.js node_modules/angular-material/angular-material.gislab.js
patch node_modules/angular-material/angular-material.gislab.js < patches/angular-material.js.patch
