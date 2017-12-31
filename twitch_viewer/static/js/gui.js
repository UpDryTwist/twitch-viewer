/* gui interactions here
* set- functions only set/update the gui elements
* do- functions interact with the server
* show- functions do both
*/
/** ******************
 * Song Info Sreen  *
 ********************/
function resetSong () {
    controls.setPlayState(false)
    controls.setPosition(0)
    var data = {}
    data.tlid = -1
    data.track = {}
    data.track.name = ''
    data.track.artists = ''
    data.track.length = 0
    data.track.uri = ''
    setSongInfo(data)
}

function resizeMb () {
    $('#infoname').html(songdata.track.name)
    $('#infoartist').html(artiststext)
}

function setSongTitle (track, refresh_ui) {
    songdata.track.name = track.name
    $('#modalname').html('<a href="#">' + track.name + '</span></a>')
    if (refresh_ui) {
        resizeMb()
    }
}

function setSongInfo (data) {
    if (!data) { return }
    if (data.tlid === songdata.tlid) { return }
    if (!data.track.name || data.track.name === '') {
        var name = data.track.uri.split('/')
        data.track.name = decodeURI(name[name.length - 1])
    }

    updatePlayIcons(data.track.uri, data.tlid)
    artistshtml = ''
    artiststext = ''

    if (validUri(data.track.name)) {
        for (var key in streamUris) {
            rs = streamUris[key]
            if (rs && rs[1] === data.track.name) {
                data.track.name = (rs[0] || rs[1])
            }
        }
    }

    songdata = data

    setSongTitle(data.track, false)
    songlength = Infinity

    if (!data.track.length || data.track.length === 0) {
        $('#trackslider').next().find('.ui-slider-handle').hide()
        $('#trackslider').slider('disable')
        // $('#streamnameinput').val(data.track.name);
        // $('#streamuriinput').val(data.track.uri);
    } else {
        songlength = data.track.length
        $('#trackslider').slider('enable')
        $('#trackslider').next().find('.ui-slider-handle').show()
    }

    var arttmp = ''

    if (data.track.artists) {
        for (var j = 0; j < data.track.artists.length; j++) {
            artistshtml += '<a href="#" onclick="return library.showArtist(\'' + data.track.artists[j].uri + '\', mopidy);">' + data.track.artists[j].name + '</a>'
            artiststext += data.track.artists[j].name
            if (j !== data.track.artists.length - 1) {
                artistshtml += ', '
                artiststext += ', '
            }
        }
        arttmp = artistshtml
    }
    if (data.track.album && data.track.album.name) {
        $('#modalalbum').html('<a href="#" onclick="return library.showAlbum(\'' + data.track.album.uri + '\', mopidy);">' + data.track.album.name + '</a>')
    } else {
        $('#modalalbum').html('')
    }
    images.setAlbumImage(data.track.uri, '#infocover, #albumCoverImg', mopidy)
    $('#modalartist').html(arttmp)

    $('#trackslider').attr('min', 0)
    $('#trackslider').attr('max', songlength)
    syncedProgressTimer.reset().set(0, songlength)
    if (play) {
        syncedProgressTimer.start()
    }

    resizeMb()
}

/** ********************
 * initialize sockets *
 **********************/

function initSocketevents () {
    mopidy.on('state:online', function () {
        showOffline(false)
        library.getCurrentPlaylist()
        updateStatusOfAll()
        showLoading(false)
        $(window).hashchange()
    })

    mopidy.on('state:offline', function () {
        resetSong()
        showOffline(true)
    })

    // GCT:  mopidy.on('event:optionsChanged', updateOptions)

    mopidy.on('event:trackPlaybackStarted', function (data) {
        setSongInfo(data.tl_track)
        controls.setPlayState(true)
    })

    mopidy.on('event:trackPlaybackResumed', function (data) {
        setSongInfo(data.tl_track)
        controls.setPlayState(true)
    })

    mopidy.on('event:playlistsLoaded', function (data) {
        showLoading(true)
        library.getPlaylists()
    })

    mopidy.on('event:playlistChanged', function (data) {
        delete playlists[data.playlist.uri]
        library.getPlaylists()
    })

    mopidy.on('event:playlistDeleted', function (data) {
        $('#playlisttracksdiv').hide()
        $('#playlistslistdiv').show()
        delete playlists[data.uri]
        library.getPlaylists()
    })

    mopidy.on('event:volumeChanged', function (data) {
        controls.setVolume(data.volume)
    })

    mopidy.on('event:muteChanged', function (data) {
        controls.setMute(data.mute)
    })

    mopidy.on('event:playbackStateChanged', function (data) {
        switch (data.new_state) {
            case 'paused':
            case 'stopped':
                controls.setPlayState(false)
                break
            case 'playing':
                controls.setPlayState(true)
                break
        }
    })

    mopidy.on('event:tracklistChanged', function (data) {
        library.getCurrentPlaylist()
        mopidy.tracklist.getTracks().then(function (tracks) {
            if (tracks.length === 0) {
                // Last track in queue was deleted, reset UI.
                resetSong()
            }
        })
    })

    mopidy.on('event:seeked', function (data) {
        controls.setPosition(parseInt(data.time_position))
        if (play) {
            syncedProgressTimer.start()
        }
    })

    mopidy.on('event:streamTitleChanged', function (data) {
        // Update all track info.
        mopidy.playback.getCurrentTlTrack().then(processCurrenttrack, console.error)
    })
}

/** ************
 * gui stuff  *
 **************/

// update everything as if reloaded
function updateStatusOfAll () {
    mopidy.playback.getCurrentTlTrack().then(processCurrenttrack, console.error)
    mopidy.playback.getTimePosition().then(processCurrentposition, console.error)
    mopidy.playback.getState().then(processPlaystate, console.error)

    mopidy.playback.getVolume().then(processVolume, console.error)
    mopidy.mixer.getMute().then(processMute, console.error)
}

/** *********************
 * initialize software *
 ***********************/
$(document).ready(function (event) {
    showOffline(true)
    // check for websockets
    if (!window.WebSocket) {
        $('#nowPlayingpane').html('<h2>Old Browser</h2><p>Sorry. Your browser isn\'t modern enough for this webapp. Modern versions of Chrome, Firefox, Safari all will do. Maybe Opera and Internet Explorer 10 also work, but it\'s not tested.</p>')
        exit
    }

    initgui = false
    // navigation stuff

    $(window).resize(resizeMb).resize()

    // Connect to server
    var websocketUrl = $(document.body).data('websocket-url')
    var connectOptions = {callingConvention: 'by-position-or-by-name'}
    if (websocketUrl) {
        connectOptions['webSocketUrl'] = websocketUrl
    }

    mopidy = new Mopidy(connectOptions)
    // initialize events
    initSocketevents()
    syncedProgressTimer = new SyncedProgressTimer(8, mopidy)
    resetSong()
})

function updatePlayIcons (uri, tlid) {
    // Update styles of listviews
    if (arguments.length < 2) {
        throw new Error('Missing parameters for "updatePlayIcons" function call.')
    }
    var target = CURRENT_PLAYLIST_TABLE.substr(1)
    if (uri && typeof tlid === 'number' && tlid >= 0) {
        $(CURRENT_PLAYLIST_TABLE).children('li.song.albumli').each(function () {
            var eachTlid = $(this).attr('tlid')
            if (typeof eachTlid !== 'undefined') {
                eachTlid = parseInt(eachTlid)
            }
            if (this.id === getjQueryID(target, uri) && eachTlid === tlid) {
                if (!$(this).hasClass('currenttrack')) {
                    $(this).addClass('currenttrack')
                    scroll2Id(this.id)
                }
            } else if ($(this).hasClass('currenttrack')) {
                $(this).removeClass('currenttrack')
            }
        })
    }
}
