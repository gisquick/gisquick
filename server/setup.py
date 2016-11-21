#!/usr/bin/env python

import os
from setuptools import setup, find_packages

# see https://github.com/gislab-npo/gislab-web/issues/46
if os.environ.get('USER','') == 'vagrant':
    del os.link

# classifiers
classifiers = [
    'Development Status :: 4 - Beta',
    'Environment :: Web Environment',
    'Framework :: Django',
    'Intended Audience :: Developers',
    'Intended Audience :: Science/Research',
    'License :: OSI Approved :: GNU General Public License version 2.0 (GPLv2)',
    'Operating System :: OS Independent',
    'Programming Language :: Python',
    'Topic :: Scientific/Engineering :: GIS',
]

exclude_from_packages = [
    'webgis.conf.project_template',
]

# requirements
with open("requirements.txt") as f:
    requirements = f.read().splitlines()

# setup
setup(name='gislab-web',
    version=(__import__('webgis').VERSION),
    description='GIS.lab Web client',
    author='GIS.lab Web Developers',
    author_email='gis.lab@lists.osgeo.org',
    url='https://github.com/gislab-npo/gislab-web/',
    packages=find_packages(),
    include_package_data=True,
    classifiers=classifiers,
    install_requires=requirements
)

# vim: set ts=8 sts=4 sw=4 et:
