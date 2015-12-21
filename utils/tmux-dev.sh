#!/bin/bash
# Launch simple development environment in TMUX.
# Author: Ivan Mincik, ivan.mincik@gmail.com


if [ "$(hostname)" != "gislab-web" ]; then
    echo "Must be executed in GIS.lab Web virtual machine !"
    exit 1
fi

tmux has-session -t development
if [ $? != 0 ]; then
    tmux new-session -s development -n servers -d

    tmux split-window -v -t development
    tmux select-pane -t 0
    tmux split-window -v -t development
    tmux select-pane -t 2
    tmux split-window -h -t development

    tmux send-keys -t development:0.0 'cd /vagrant/dev' C-m
    tmux send-keys -t development:0.0 'workon gislab-web' C-m
    tmux send-keys -t development:0.0 'nvm use stable' C-m
    tmux send-keys -t development:0.0 'clear' C-m

    tmux send-keys -t development:0.1 'cd /vagrant/dev' C-m
    tmux send-keys -t development:0.1 'workon gislab-web' C-m
    tmux send-keys -t development:0.1 'python ./manage.py runsslserver 0.0.0.0:8000' C-m

    tmux send-keys -t development:0.2 'sudo tail -n 0 -f /var/log/lighttpd/access.log /var/log/lighttpd/error.log' C-m
    tmux send-keys -t development:0.3 'sudo tail -n 0 -f /var/log/lighttpd/qgis-mapserver.log' C-m

    tmux select-window -t development:0
    tmux select-pane -t 0
fi
tmux attach -t development

# vim: set ts=8 sts=4 sw=4 et:
