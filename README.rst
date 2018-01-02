*************************
Twitch-Viewer
*************************

.. image:: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat
    :target: http://standardjs.com/
    :alt: JavaScript Standard Style

Twitch Viewer is a frontend extension based on hacking up `Mopidy MusicBox Webclient
(MMW) <https://github.com/pimusicbox/mopidy-musicbox-webclient/>`_ for
`Mopidy <http://www.mopidy.com/>`_, and intended to provide a passive "what's playing" display
for Mopidy.  It's built to be run on the same Musicbox as Mopidy (although can run separately).

Features
========

- Passive display of "what's playing" on Mopidy
- QR code to allow guests (or spouse) to quickly pull up the web interface to control Mopidy

Roadmap
=======

- Doesn't currently work with Spotify Connect.  While I think the QR code makes it easy-enough to control using
the mobile web interface, would be nice to show what's being cast through Spotify Connect.  However, figuring out
Spotify authentication is making my brain hurt, so we'll see if/when that gets touched!

- Would like to add "previously played" and "up next" cards to the main display.  That's probably next on the list.

Dependencies
============

- This has only been tested in my own configuration, so your mileage may vary!

- ``Mopidy`` >= 1.1.0. An extensible music server that plays music from local disk, Spotify, SoundCloud, Google
  Play Music, and more.

Installation
============

Install by cloning the repository and run ``sudo python setup.py install`` from within the project directory. e.g. ::

    $ git clone https://github.com/UpDryTwist/twitch-viewer
    $ cd twitch-viewer
    $ sudo python setup.py install


Configuration
=============

Twitch-viewer sets the websocket_host to 6680 in the ``ext.conf`` file.  This is because going to port 80 when attempting
to interact with the Mopidy REST API on the same box doesn't work due to the rerouting (ip tables) of port 80 in
Musicbox, as far as I can tell.  If for some reason you moved the port, you'd need to change this.

- ``musicbox_webclient/websocket_host``: Optional setting to specify the target host for Mopidy websocket connections.

- ``musicbox_webclient/websocket_port``: Optional setting to specify the target port for Mopidy websocket connections.

There is a QR image (``musicbox-mobile.png``) in the images directory that you should replace with your own image (the
one in there now is going to point to my own internal IP address, which won't do you any good unless you happen to run
a 10.35.71.* subnet in your house!).  This image should have the URL to the mobile Mopidy web app in your
environment.  The purpose of this image is to allow anyone (say, a spouse, a child or a guest) to walk up to the screen
and easily pull up the control interface.
- I recommend using a fixed IP for the URL, rather than musicbox.local, as I got iffy DNS resolution on musicbox.local
from some of the phones in our house.  That assumes, of course, that you've assigned a static IP to your Musicbox.
- So then the URL is something like (depending on your subnets):  ``http://192.168.1.74/mobile/``

You should then set up your Musicbox to auto-login a user into X and run Chromium, pointed at this viewer.  Complete
instructions for this are beyond the scope of this setup, but a few pointers from my own setup:

- I created a user "kiosk" (``adduser kiosk``)
- I'm using LXDE and lightdm for my windows system
- I set up lightdm to autologin this user (in ``/etc/lightdm/lightdm.conf`` in ``[SeatDefaults]``:
``autologin-user=kiosk`` and ``autologin-user-timeout=0``).
- In ``/home/kiosk/.config/lxsession/LXDE/autostart`` ::

    @xset s off
    @xset -dpms
    @xset s noblank
    @unclutter -idle 5 -root
    @rm -rf /home/kiosk/.cache/chromium
    @chromium-browser --noerrdialogs --disable-restore-session-state --disable-session-crashed-bubble --disable-infobars --kiosk http://musicbox.local:6680/twitch_viewer/ --incognito

Usage
=====

If you've configured it, then the usage is just to stare at your TV/monitor!

Project resources
=================

- `Source code <https://github.com/UpDryTwist/twitch-viewer>`_
- `Issue tracker <https://github.com/UpDryTwist/twitch-viewer/issues>`_

Changelog
=========

(UNRELEASED)
------------

v0.0.3 (2018-01-02)
-------------------

- First release.
