# BSD Licensed, Copyright (c) 2006-2008 MetaCarta, Inc.

import os
import sys
import time
import warnings
import shutil
import subprocess

from webgis.mapcache.cache import Cache

class Disk (Cache):
    def __init__ (self, base = None, umask = '2', **kwargs):
        Cache.__init__(self, **kwargs)
        self.basedir = base
        self.umask = int(umask, 0)
        if not self.access(base, 'read'):
            self.makedirs(base)

    def makedirs(self, path, hide_dir_exists=True):
        old_umask = os.umask(self.umask)
        try:
            os.makedirs(path)
        except OSError as E:
            # os.makedirs can suffer a race condition because it doesn't check
            # that the directory  doesn't exist at each step, nor does it
            # catch errors. This lets 'directory exists' errors pass through,
            # since they mean that as far as we're concerned, os.makedirs
            # has 'worked'
            if E.errno != 17 or not hide_dir_exists:
                raise E
        os.umask(old_umask)

    def access(self, path, type='read'):
        if type =="read":
            return os.access(path, os.R_OK)
        else:
            return os.access(path, os.W_OK)

    def get_tile_key (self, tile):
        components = ( self.basedir,
                       tile.layer.project,
                       tile.layer.publish,
                       "tile",
                       tile.layer.name,
                       "%d" % tile.z,
                       "%d" % tile.x,
                       "%d.%s" % (tile.y, tile.layer.image_format)
                    )
        filename = os.path.join( *components )
        return filename

    def get_legend_key (self, layer, z):
        components = ( self.basedir,
                       layer.project,
                       layer.publish,
                       "legend",
                       layer.name,
                       "%s.%s" % (z, layer.image_format)
                    )
        return os.path.join( *components )

    def get (self, filename):
        if self.access(filename, 'read'):
            data = open(filename, "rb").read()
            return data
        else:
            return None

    def set (self, filename, data):
        dirname  = os.path.dirname(filename)
        if not self.access(dirname, 'write'):
            self.makedirs(dirname)

        tmpfile = filename + ".%d.tmp" % os.getpid()
        io_error = False
        old_umask = None
        output = None
        try:
            old_umask = os.umask(self.umask)
            output = open(tmpfile, "wb")
            output.write(data)
        except:
            io_error = True
        finally:
            if output:
                output.close()
            if old_umask is not None:
                os.umask( old_umask )
            if io_error:
                if os.path.exists(tmpfile):
                    os.unlink(tmpfile)
                raise
        
        try:
            os.rename(tmpfile, filename)
        except OSError:
            io_error = True
            try:
                os.unlink(filename)
                os.rename(tmpfile, filename)
            except OSError:
                io_error = True
        finally:
            if io_error:
                if os.path.exists(tmpfile):
                    os.unlink(tmpfile)
                raise

        return data

    def delete (self, tile):
        filename = self.get_tile_key(tile)
        if self.access(filename, 'read'):
            os.unlink(filename)

    def delete_project_cache (self, project, publish=None):
        if not publish:
            cache_dir = os.path.join(self.basedir, project)
        else:
            cache_dir = os.path.join(self.basedir, project, publish)
        if os.path.exists(cache_dir):
            # Deletes folder in another process. Folder will be renamed immediately,
            # so the original cache folder will not exists after the function will return.
            # Deletion of this renamed folder will be started, but there is no guaranty
            # where or even if it will be completely done.
            tmp_name = "%s-%f" % (cache_dir, time.time())
            shutil.move(cache_dir, tmp_name)
            subprocess.Popen(["rm", "-rf", tmp_name])

    def attempt_lock (self, name):
        try:
            self.makedirs(name, hide_dir_exists=False)
            return True
        except OSError:
            pass
        try:
            st = os.stat(name)
            if st.st_ctime + self.stale < time.time():
                warnings.warn("removing stale lock %s" % name)
                # remove stale lock
                self.unlock(name)
                self.makedirs(name)
                return True
        except OSError:
            pass
        return False 

    def unlock (self, name):
        try:
            os.rmdir(name)
        except OSError as E:
            sys.stderr.write("unlock %s failed: %s \n" % (name, str(E)))

# vim: set ts=4 sts=4 sw=4 noet:
