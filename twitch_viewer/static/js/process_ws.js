/**
 * @author Wouter van Wijk
 *
 * these functions communication with ws server
 *
 */

/** ******************************************************
 * process results of a (new) currently playing track
 *********************************************************/
function processCurrenttrack (data) {
    setSongInfo(data)
}

/** ******************************************************
 * process results of volume
 *********************************************************/
function processVolume (data) {
    controls.setVolume(data)
}

/** ******************************************************
 * process results of mute
 *********************************************************/
function processMute (data) {
    controls.setMute(data)
}

/** ******************************************************
 * process results of current position
 *********************************************************/
function processCurrentposition (data) {
    controls.setPosition(parseInt(data))
}

/** ******************************************************
 * process results of the queue, the current playlist
 *********************************************************/
function processCurrentPlaylist (resultArr) {
    currentplaylist = resultArr
    resultsToTables(currentplaylist, CURRENT_PLAYLIST_TABLE)
    mopidy.playback.getCurrentTlTrack().then(processCurrenttrack, console.error)
    updatePlayIcons(songdata.track.uri, songdata.tlid, controls.getIconForAction())
}

/** ******************************************************
 * process results playstate
 *********************************************************/
function processPlaystate (data) {
    if (data === 'playing') {
        controls.setPlayState(true)
    } else {
        controls.setPlayState(false)
    }
}

/** ******************************************************
 * process results of a returned list of playlist track refs
 *********************************************************/
function processPlaylistItems (resultDict) {
    if (resultDict.items.length === 0) {
        console.log('Playlist', resultDict.uri, 'is empty')
        showLoading(false)
        return
    }
    var trackUris = []
    for (i = 0; i < resultDict.items.length; i++) {
        trackUris.push(resultDict.items[i].uri)
    }
    return mopidy.library.lookup({'uris': trackUris}).then(function (tracks) {
        // Transform from dict to list and cache result
        var newplaylisturi = resultDict.uri
        var track
        playlists[newplaylisturi] = {'uri': newplaylisturi, 'tracks': []}
        for (i = 0; i < trackUris.length; i++) {
            track = tracks[trackUris[i]][0] || resultDict.items[i]  // Fall back to using track Ref if lookup failed.
            playlists[newplaylisturi].tracks.push(track)
        }
        showLoading(false)
        return playlists[newplaylisturi].tracks
    })
}
