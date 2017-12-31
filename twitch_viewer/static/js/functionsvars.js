/**
 * @author Wouter van Wijk
 *
 * all kinds functions and vars
 */

var mopidy
var syncedProgressTimer

// values for controls
var play = false
var random
var repeat
var single
var mute
var volumeChanging
var volumeSliding = false

var positionChanging

var initgui = true
var popupData = {}  // TODO: Refactor into one shared cache
var songlength = 0

var artistshtml = ''
var artiststext = ''
var songname = ''
var songdata = {'track': {}, 'tlid': -1}

// array of cached playlists (not only user-playlists, also search, artist, album-playlists)
var playlists = {}  // TODO: Refactor into one shared cache
var currentplaylist
var customTracklists = []  // TODO: Refactor into one shared cache

var ua = navigator.userAgent || navigator.vendor || window.opera

// constants
PROGRAM_NAME = $(document.body).data('program-name')
HOSTNAME = $(document.body).data('hostname')
ARTIST_TABLE = '#artiststable'
ALBUM_TABLE = '#albumstable'
BROWSE_TABLE = '#browsetable'
PLAYLIST_TABLE = '#playlisttracks'
CURRENT_PLAYLIST_TABLE = '#currenttable'
SEARCH_ALL_TABLE = '#allresulttable'
SEARCH_ALBUM_TABLE = '#albumresulttable'
SEARCH_ARTIST_TABLE = '#artistresulttable'
SEARCH_TRACK_TABLE = '#trackresulttable'

URI_SCHEME = 'mbw'

PLAY_NOW = 0
PLAY_NEXT = 1
ADD_THIS_BOTTOM = 2
ADD_ALL_BOTTOM = 3
PLAY_ALL = 4
DYNAMIC = 5
INSERT_AT_INDEX = 6

// the first part of Mopidy extensions which serve radio streams
var radioExtensionsList = ['somafm', 'tunein', 'dirble', 'audioaddict']

var uriClassList = [
    ['spotify', 'fa-spotify'],
    ['spotifytunigo', 'fa-spotify'],
    ['spotifyweb', 'fa-spotify'],
    ['local', 'fa-file-sound-o'],
    ['file', 'fa-file-sound-o'],
    ['m3u', 'fa-file-sound-o'],
    ['podcast', 'fa-rss-square'],
    ['podcast+file', 'fa-rss-square'],
    ['podcast+itunes', 'fa-apple'],
    ['dirble', 'fa-microphone'],
    ['tunein', 'fa-headphones'],
    ['soundcloud', 'fa-soundcloud'],
    ['sc', 'fa-soundcloud'],
    ['gmusic', 'fa-google'],
    ['internetarchive', 'fa-university'],
    ['somafm', 'fa-flask'],
    ['youtube', 'fa-youtube'],
    ['yt', 'fa-youtube'],
    ['audioaddict', 'fa-bullhorn'],
    ['subsonic', 'fa-folder-open']
]

// TODO: It should be possible to retrieve a user-friendly name for a given Mopidy scheme dynamically by
//       calling mopidy.library.browse() on the root dir:
//       1. each backend contained in the result will have a 'name' attribute that can be shown as-is in the UI.
//       2. the URI prefix of the backend result should === mopidy.getUriSchemes(), which can be used for the mapping.
//       3. only backends that cannot be 'browsed' (e.g. youtube) should have a static mapping defined here.
var uriHumanList = [
    ['spotify', 'Spotify'],
    ['spotifytunigo', 'Spotify browse'],
    ['spotifyweb', 'Spotify browse'],
    ['local', 'Local media'],
    ['m3u', 'Local playlists'],
    ['podcast', 'Podcasts'],
    ['podcast+itunes', 'iTunes Store: Podcasts'],
    ['dirble', 'Dirble'],
    ['tunein', 'TuneIn'],
    ['soundcloud', 'SoundCloud'],
    ['gmusic', 'Google Music'],
    ['internetarchive', 'Internet Archive'],
    ['somafm', 'Soma FM'],
    ['youtube', 'YouTube'],
    ['audioaddict', 'AudioAddict'],
    ['subsonic', 'Subsonic']
]

// List of known audio file extensions
// TODO: consider querying GStreamer for supported audio formats - see:https://discuss.mopidy.com/t/supported-codecs-file-formats/473
var audioExt = [
    'aa', 'aax',  // Audible.com
    'aac',  // Advanced Audio Coding format
    'aiff',  // Apple
    'au',  // Sun Microsystems
    'flac',  // Free Lossless Audio Codec
    'gsm',
    'iklax',
    'ivs',
    'm4a',
    'm4b',
    'm4p',
    'mp3',
    'mpc',  // Musepack
    'ogg', 'oga', 'mogg',  // Ogg-Vorbis
    'opus',  // Internet Engineering Task Force (IETF)
    'ra', 'rm',  // RealAudio
    'raw',
    'tta',  // True Audio
    'vox',
    'wav',
    'wma',  // Microsoft
    'wv',
    'webm'  // HTML5 video
]

function scroll2Id (anId) {
    console.log('ID2 = ' + anId)
    var offset = $('#' + anId).offset()
    console.log('Offset = ' + offset)
    var divtop = offset.top - 120
    console.log('Divtop = ' + divtop)
    $('#queue-list').animate({
        scrollTop: divtop
    }, 2000)
}

function scrollxxId (className) {
    var $container = $('html,body')
    var $scrollTo = $(className)

    $container.animate({scrollTop: $scrollTo.offset().top - $container.offset().top + $container.scrollTop(), scrollLeft: 0}, 300)
}

/** ******************************************************
 * break up results and put them in album tables
 *********************************************************/

function renderSongLi (previousTrack, track, nextTrack, uri, tlid, target, currentIndex, listLength) {
    var html = ''
    track.name = validateTrackName(track, currentIndex)
    // Streams
    if (track.length === -1) {
        html += '<li class="albumli"><a href="#"><h1><i class="' + getMediaClass(track) + '"></i> ' + track.name + ' [Stream]</h1></a></li>'
        return html
    }

    html += '<li class="song albumli" id="' + getjQueryID(target, track.uri) + '" tlid="' + tlid + '">'
    html += '<a href="#"><h1><i class="' + getMediaClass(track) + '"></i> ' + track.name + '</h1>'

    if (listLength === 1 || (!hasSameAlbum(previousTrack, track) && !hasSameAlbum(track, nextTrack))) {
        html += renderSongLiAlbumInfo(track)
    }
    html += '</a></li>'
    return html
}

/* Tracklist renderer for track artist and album name. */
function renderSongLiAlbumInfo (track, target) {
    var html = renderSongLiTrackArtists(track)
    if (track.album && track.album.name) {
        html += ' - <em>' + track.album.name + '</em></p>'
    }
    if (typeof target !== 'undefined' && target.length > 0) {
        target = getjQueryID(target, track.uri, true)
        $(target).children('a').eq(1).append(html)
    }
    return html
}

/* Tracklist renderer for track artist information. */
function renderSongLiTrackArtists (track) {
    var html = ''
    if (track.artists) {
        for (var i = 0; i < track.artists.length; i++) {
            html += track.artists[i].name
            html += (i === track.artists.length - 1) ? '' : ' / '
            // Stop after 3
            if (i > 2) {
                html += '...'
                break
            }
        }
    }
    return html
}

/* Tracklist renderer to insert dividers between albums. */
function renderSongLiDivider (previousTrack, track, nextTrack, target) {
    var html = ''
    // Render differently if part of an album.
    if (!hasSameAlbum(previousTrack, track) && hasSameAlbum(track, nextTrack)) {
        // Large divider with album cover.
        html +=
            '<li class="albumdivider"><a href="#" onclick="return library.showAlbum(\'' + track.album.uri + '\', mopidy);">' +
            '<img id="' + getjQueryID(target + '-cover', track.uri) + '" class="artistcover" width="30" height="30"/>' +
            '<h1>' + track.album.name + '</h1><p>' +
            renderSongLiTrackArtists(track) + '</p></a></li>'
        // Retrieve album covers
        images.setAlbumImage(track.uri, getjQueryID(target + '-cover', track.uri, true), mopidy, 'small')
    } else if (previousTrack && !hasSameAlbum(previousTrack, track)) {
        // Small divider
        html += '<li class="smalldivider"> &nbsp;</li>'
    }
    if (html.length > 0 && typeof target !== 'undefined' && target.length > 0) {
        target = getjQueryID(target, track.uri, true)
        $(target).before(html)
    }
    return html
}

function hasSameAlbum (track1, track2) {
    // 'true' if album for each track exists and has the same name
    var name1 = track1 ? (track1.album ? track1.album.name : undefined) : undefined
    var name2 = track2 ? (track2.album ? track2.album.name : undefined) : undefined
    return name1 && name2 && (name1 === name2)
}

function validateTrackName (track, trackNumber) {
    // Create name if there is none
    var name = ''
    if (!track.name || track.name === '') {
        name = track.uri.split('/')
        name = decodeURI(name[name.length - 1]) || 'Track ' + String(trackNumber)
    } else {
        name = track.name
    }
    return name
}

function resultsToTables (results, target, uri, onClickBack, backIsOptional) {
    $(target).empty()
    if (!results || results.length === 0) {
        return
    }
    $(target).attr('data', uri)

    var track, previousTrack, nextTrack, tlid
    var html = ''

    // Break into albums and put in tables
    for (i = 0; i < results.length; i++) {
        previousTrack = track || undefined
        nextTrack = i < results.length - 1 ? results[i + 1] : undefined
        track = results[i]
        if (track) {
            if ('tlid' in track) {
                // Get track information from TlTrack instance
                tlid = track.tlid
                track = track.track
                nextTrack = nextTrack ? nextTrack.track : undefined
            }
            popupData[track.uri] = track
            html += renderSongLiDivider(previousTrack, track, nextTrack, target)
            html += renderSongLi(previousTrack, track, nextTrack, uri, tlid, target, i, results.length)
        }
    }
    $(target).append(html)
    updatePlayIcons(songdata.track.uri, songdata.tlid)
}

function getUris (tracks) {
    var results = []
    for (var i = 0; i < tracks.length; i++) {
        results.push(tracks[i].uri)
    }
    return results
}

function getTracksFromUri (uri, full_track_data) {
    var returnTracksOrUris = function (tracks) {
        return full_track_data ? tracks : getUris(tracks)
    }
    if (customTracklists[uri]) {
        return returnTracksOrUris(customTracklists[uri])
    } else if (playlists[uri] && playlists[uri].tracks) {
        return returnTracksOrUris(playlists[uri].tracks)
    }
    return []
}

/** ****************
 * Modal dialogs  *
 ******************/
function showLoading (on) {
    if (on) {
        $('body').css('cursor', 'progress')
        $.mobile.loading('show', {
            text: 'Loading data from ' + PROGRAM_NAME + ' on ' + HOSTNAME + '. Please wait...',
            textVisible: true,
            theme: 'a'
        })
    } else {
        $('body').css('cursor', 'default')
        $.mobile.loading('hide')
    }
}

function showOffline (on) {
    if (on) {
        $.mobile.loading('show', {
            text: 'Trying to reach ' + PROGRAM_NAME + ' on ' + HOSTNAME + '. Please wait...',
            textVisible: true,
            theme: 'a'
        })
    } else {
        $.mobile.loading('hide')
    }
}

// from http://dzone.com/snippets/validate-url-regexp
function validUri (uri) {
    var regexp = /^(http|https|mms|rtmp|rtmps|rtsp):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regexp.test(uri)
}

function getScheme (uri) {
    return uri.split(':')[0].toLowerCase()
}

function isPlayable (track) {
    if (typeof track.type === 'undefined' || track.type === 'track') {
        if (track.uri && getScheme(track.uri) === 'file') {
            var ext = track.uri.split('.').pop().toLowerCase()
            if ($.inArray(ext, audioExt) === -1) {
                // Files must have the correct extension
                return false
            }
        }
        return true
    }
    return false
}

function isStreamUri (uri) {
    return validUri(uri) || radioExtensionsList.indexOf(getScheme(uri)) >= 0
}

function getMediaClass (track) {
    var defaultIcon = 'fa-file-sound-o'
    var type = track.type
    if (typeof type === 'undefined' || type === 'track') {
        if (!isPlayable(track)) {
            return 'fa fa-file-o'  // Unplayable file
        } else if (isStreamUri(track.uri)) {
            return 'fa fa-rss'  // Stream
        }
    } else if (type === 'directory') {
        return 'fa fa-folder-o'
    } else if (type === 'album') {
        // return 'fa fa-bullseye'  // Album
        defaultIcon = 'fa-folder-o'
    } else if (type === 'artist') {
        // return 'fa fa-user-circle-o'  // Artist
        defaultIcon = 'fa-folder-o'
    } else if (type === 'playlist') {
        // return 'fa fa-star'  // Playlist
    }
    if (track.uri) {
        var scheme = getScheme(track.uri)
        for (var i = 0; i < uriClassList.length; i++) {
            if (scheme === uriClassList[i][0]) {
                return 'fa ' + uriClassList[i][1]
            }
        }
        return 'fa ' + defaultIcon
    }
    return ''
}

/**
 * Converts a URI to a jQuery-safe identifier. jQuery identifiers need to be
 * unique per page and cannot contain special characters.
 *
 * @param {string} identifier - Identifier string to prefix to the URI. Can
 * be used to ensure that the generated ID will be unique for the page that
 * it will be included on. Also accepts jQuery identifiers starting with '#'.
 *
 * @param {string} uri - URI to encode, usually the URI of a Mopidy track.
 *
 * @param {boolean} includePrefix - Will prefix the generated identifier
 * with the '#' character if set to 'true', ready to be passed to $() or
 * jQuery().
 *
 * @return {string} - a string in the format '[#]identifier-encodedURI' that
 * is safe to use as a jQuery identifier.
 */
function getjQueryID (identifier, uri, includePrefix) {
    if (identifier.charAt(0) === '#' && !includePrefix) {
        identifier = identifier.substr(1)
    } else if (identifier.charAt(0) !== '#' && includePrefix) {
        identifier = '#' + identifier
    }
    return identifier + '-' + fixedEncodeURIComponent(uri).replace(/([;&,\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '')  // eslint-disable-line no-useless-escape
}

// Strict URI encoding as per https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function fixedEncodeURIComponent (str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16)
    })
}
