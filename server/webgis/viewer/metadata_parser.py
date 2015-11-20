# -*- coding: utf-8 -*-

import json


class MetadataParser(object):

    def __init__(self, filename):
        self._get_metadata(filename)

    def _get_metadata(self, filename):
        with open(filename, 'r') as f:
            self.metadata = json.load(f)

    def __getattr__(self, name):
        return self.metadata.get(name)
