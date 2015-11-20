# BSD Licensed, Copyright (c) 2006-2008 MetaCarta, Inc.
import time

class Cache (object):
    def __init__ (self, timeout = 30.0, stale_interval = 300.0, **kwargs):
        self.stale = float(stale_interval)
        self.timeout = float(timeout)

    def lock (self, filename, blocking = True):
        start_time = time.time()
        result = self.attempt_lock(filename)
        if result:
            return True
        elif not blocking:
            return False
        while result is not True:
            if time.time() - start_time > self.timeout:
                raise Exception("You appear to have a stuck lock. You may wish to remove the lock named:\n%s" % filename)
            time.sleep(0.25)
            result = self.attempt_lock(filename)
        return True

    def get_tile_key (self, tile):
        raise NotImplementedError()

    def get_legend_key (self, layer, z):
        raise NotImplementedError()

    def get_tile_lock_name (self, tile):
        return self.get_tile_key(tile) + ".lck"

    def get_legend_lock_name (self, layer, z):
        return self.get_legend_key(layer, z) + ".lck"

    def lock_tile (self, tile, blocking = True):
        return self.lock(self.get_tile_lock_name(tile), blocking=blocking)

    def lock_legend (self, layer, z, blocking = True):
        return self.lock(self.get_legend_lock_name(layer, z), blocking=blocking)

    def attempt_lock (self, name):
        raise NotImplementedError()

    def unlock (self, name):
        raise NotImplementedError()

    def unlock_tile (self, tile):
        self.unlock(self.get_tile_lock_name(tile))

    def unlock_legend (self, layer, z):
        self.unlock(self.get_legend_lock_name(layer, z))

    def get (self, filename):
        raise NotImplementedError()

    def set (self, filename, data):
        raise NotImplementedError()

    def set_tile (self, tile):
        filename = self.get_tile_key(tile)
        return self.set(filename, tile.data)

    def get_tile (self, tile):
        filename = self.get_tile_key(tile)
        tile.data = self.get(filename)
        return tile.data

    def set_legend (self, layer, z, image):
        filename = self.get_legend_key(layer, z)
        return self.set(filename, image)

    def get_legend (self, layer, z):
        filename = self.get_legend_key(layer, z)
        return self.get(filename)

    def delete(self, tile):
        raise NotImplementedError()

    def delete_layer_cache (self, layer):
        raise NotImplementedError()

# vim: set ts=4 sts=4 sw=4 noet:
