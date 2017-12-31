(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory)
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory()
    } else {
        root.controls = factory()
    }
}(this, function () {
    'use strict'

    var controls = {

        /* Getter function for 'action' variable. Also checks config settings and cookies if required. */
        getAction: function (action) {
            if (typeof action === 'undefined' || action.length === 0) {  // Action parameter not provided, use defaults
                action = window[$(document.body).data('on-track-click')]
            }
            if (action === DYNAMIC) {  // Re-use last action stored in cookie.
                action = $.cookie('onTrackClick')
                if (typeof action === 'undefined') {
                    action = PLAY_ALL  // Backwards-compatible default value.
                }
            }
            return action
        },

        /* Retrieves the Font Awesome character for the given action. */
        getIconForAction: function (action) {
            action = controls.getAction(action)

            switch (parseInt(action)) {
                case PLAY_ALL:
                    return 'fa fa-play-circle'
                case PLAY_NOW:
                    return 'fa fa-play-circle-o'
                case INSERT_AT_INDEX:
                    return 'fa fa-long-arrow-left'
                case PLAY_NEXT:
                    return 'fa fa-level-down'
                case ADD_THIS_BOTTOM:
                    return 'fa fa-plus-square-o'
                case ADD_ALL_BOTTOM:
                    return 'fa fa-plus-square'
                default:
                    throw new Error('Unkown tracklist action identifier: ' + action)
            }
        },

        /* Retrieves the relevant track URIs for the given action. */
        _getTrackURIsForAction: function (action, trackUri, playlistUri) {
            var trackUris = []
            // Fill 'trackUris', by determining which tracks should be added.
            switch (parseInt(action)) {
                case PLAY_NOW:
                case PLAY_NEXT:
                case INSERT_AT_INDEX:
                case ADD_THIS_BOTTOM:
                    // Process single track
                    trackUris.push(trackUri)
                    break
                case PLAY_ALL:
                case ADD_ALL_BOTTOM:
                    // Process all tracks in playlist
                    trackUris = getTracksFromUri(playlistUri, false)
                    break
                default:
                    throw new Error('Unexpected tracklist action identifier: ' + action)
            }
            return trackUris
        },

        /** ***********
         *  Buttons  *
         *************/

        /* Toggle state of play button */
        setPlayState: function (nwplay) {
            if (nwplay) {
                $('#btplayNowPlaying >i').removeClass('fa-play').addClass('fa-pause')
                $('#btplayNowPlaying').attr('title', 'Pause')
                $('#btplay >i').removeClass('fa-play').addClass('fa-pause')
                $('#btplay').attr('title', 'Pause')
                mopidy.playback.getTimePosition().then(processCurrentposition, console.error)
                syncedProgressTimer.start()
            } else {
                $('#btplayNowPlaying >i').removeClass('fa-pause').addClass('fa-play')
                $('#btplayNowPlaying').attr('title', 'Play')
                $('#btplay >i').removeClass('fa-pause').addClass('fa-play')
                $('#btplay').attr('title', 'Play')
                syncedProgressTimer.stop()
            }
            play = nwplay
        },
        /** *********************************************
         * Track Slider                                *
         * Use a timer to prevent looping of commands  *
         ***********************************************/
        doSeekPos: function (value) {
            if (!positionChanging) {
                positionChanging = value
                mopidy.playback.seek({'time_position': Math.round(value)}).then(function () {
                    positionChanging = null
                })
            }
        },

        setPosition: function (pos) {
            if (!positionChanging && $('#trackslider').val() !== pos) {
                syncedProgressTimer.set(pos)
            }
        },

        /** *********************************************
         * Volume slider                               *
         * Use a timer to prevent looping of commands  *
         ***********************************************/

        setVolume: function (value) {
            if (!volumeChanging && !volumeSliding && $('#volumeslider').val() !== value) {
                $('#volumeslider').off('change')
                $('#volumeslider').val(value).slider('refresh')
                $('#volumeslider').on('change', function () {
                    controls.doVolume($(this).val())
                })
            }
        },

        doVolume: function (value) {
            if (!volumeChanging) {
                volumeChanging = value
                mopidy.playback.setVolume({'volume': parseInt(volumeChanging)}).then(function () {
                    volumeChanging = null
                })
            }
        },

        setMute: function (nwmute) {
            if (mute !== nwmute) {
                mute = nwmute
                if (mute) {
                    $('#mutebt').attr('class', 'fa fa-volume-off')
                } else {
                    $('#mutebt').attr('class', 'fa fa-volume-up')
                }
            }
        },

        getUriSchemes: function () {
            uriSchemes = {}
            return mopidy.getUriSchemes().then(function (schemes) {
                for (var i = 0; i < schemes.length; i++) {
                    uriSchemes[schemes[i].toLowerCase()] = true
                }
            })
        }
    }

    return controls
}))
