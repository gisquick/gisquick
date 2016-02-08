# -*- mode: ruby -*-
# vi: set ft=ruby :

# Set APT_PROXY environment variable before provisioning to speed up packages
# installation using Apt proxy.
# Example:
#   $ export APT_PROXY=http://192.168.99.118:3142

Vagrant.require_version ">= 1.7.0"

BOX = "trusty-canonical-32"
BOX_URL = "http://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-i386-vagrant-disk1.box"


Vagrant.configure(2) do |config|
  # fix for https://github.com/ansible/ansible/issues/8644
  ENV['PYTHONIOENCODING'] = "utf-8"

  config.vm.box = BOX
  config.vm.box_url = BOX_URL
  config.vm.synced_folder '.', '/vagrant'
  config.vm.hostname = "gislab-web"

  config.ssh.forward_agent = true

    config.vm.define "gislab-web" do |server|

      # port forwarding
      config.vm.network "forwarded_port", guest: 90, host: 8090
      config.vm.network "forwarded_port", guest: 8000, host: 8000
      config.vm.network "forwarded_port", guest: 8100, host: 8100
      config.vm.network "forwarded_port", guest: 8200, host: 8200
      config.vm.network "forwarded_port", guest: 35729, host: 35729

      # deployment
      server.vm.provision "install", type: "ansible" do |ansible|
        ansible.playbook = "provision/deployment.yml"
        ansible.verbose = "vv"
      end

      # test
      server.vm.provision "test", type: "ansible" do |ansible|
        ansible.playbook = "provision/test.yml"
        ansible.verbose = "vv"
      end

      # VirtualBox configuration
      server.vm.provider "virtualbox" do |vb, override|
        vb.customize ["modifyvm", :id, "--memory", "1024"]
        vb.customize ["modifyvm", :id, "--nictype1", "virtio"]
#       vb.gui = true
      end
    end
end
