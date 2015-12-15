#!/bin/bash

### USAGE
function usage() {
    echo "USAGE: $(basename $0) [OPTIONS] <tag>,<tag>,..."
    echo "Run requested tags only."
    echo -e "\nOPTIONS
    -h display this help
    "
    exit 255
}


### OPTIONS
while getopts "h" OPTION
do
        case "$OPTION" in
            h) usage ;;
            \?) exit 1;;
        esac
done
shift $(($OPTIND - 1))

TAGS=$1


### VARIABLES
ansible_cmd="ansible-playbook \
  --private-key=$(pwd)/.vagrant/machines/gislab-web/virtualbox/private_key \
  --user=vagrant \
  --connection=ssh \
  --limit=gislab-web \
  --inventory-file=$(pwd)/.vagrant/provisioners/ansible/inventory \
  --verbose"

if [ "$TAGS" != "" ]; then
    tags="--tags $TAGS"
else
    tags=""
fi


### MAIN SCRIPT
# run tags
PYTHONUNBUFFERED=1
ANSIBLE_FORCE_COLOR=true
ANSIBLE_HOST_KEY_CHECKING=false
ANSIBLE_SSH_ARGS='\
    -o UserKnownHostsFile=/dev/null \
    -o ForwardAgent=yes \
    -o ControlMaster=auto \
    -o ControlPersist=60s' \
$ansible_cmd $tags provision/development.yml

# vim: set ts=8 sts=4 sw=4 et:
