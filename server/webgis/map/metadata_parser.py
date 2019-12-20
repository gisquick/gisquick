# -*- coding: utf-8 -*-

import json


class MetadataParser(object):

    def __init__(self, filename):
        self._read_metadata(filename)

    def _read_metadata(self, filename):
        with open(filename, 'r') as f:
            self.metadata = json.load(f)

    def __getattr__(self, name):
        return self.metadata.get(name)

    def get(self, name, *args):
        return self.metadata.get(name, *args)
