# -*- coding: utf-8 -*-

import json


class MetadataParser(dict):
    def __init__(self, filename):
        with open(filename, 'r') as f:
            super().__init__(json.load(f))

    def __getattr__(self, key):
        try:
            return self[key]
        except KeyError as k:
            return None

    def __setattr__(self, key, value):
        self[key] = value

    def __delattr__(self, key):
        try:
            del self[key]
        except KeyError as k:
            pass
