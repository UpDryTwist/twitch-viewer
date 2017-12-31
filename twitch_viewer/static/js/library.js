(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory)
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory()
    } else {
        root.library = factory()
    }
}(this, function () {
    'use strict'

    var library = {
    /** **********
     * Lookups
     ************/
        getCurrentPlaylist: function () {
            mopidy.tracklist.getTlTracks().then(processCurrentPlaylist, console.error)
        }
    }
    return library
}))
