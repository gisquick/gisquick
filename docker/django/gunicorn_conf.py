bind = '0.0.0.0:8000'

loglevel = 'info'
errorlog = '/var/log/gunicorn/error.log'
accesslog = '/var/log/gunicorn/access.log'


import os

for k,v in os.environ.items():
    if k.startswith("GUNICORN_"):
        key = k.split('_', 1)[1].lower()
        globals()[key] = v
