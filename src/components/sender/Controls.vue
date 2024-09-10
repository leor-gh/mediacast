<template>
  <div class="controls container">
    <label for="application">Chromecast Receiver Application</label>
    <select v-model="applicationId" class="u-full-width" id="application">
      <option value="CC1AD845">Default Media Receiver</option>
      <option value="A55EBA47">MediaCast Receiver</option>
      <!-- <option value="B24212A8">MediaCast Receiver Dev</option> -->
    </select>

    <label>Media URL</label>
    <input
      v-model="mediaUrl"
      class="u-full-width"
      type="text"
    />

    <label>Subtitle URL</label>
    <input
      v-model="subtitleUrl"
      class="u-full-width"
      type="text"
    />

    <label>License Server URL</label>
    <input
      v-model="licenseUrl"
      class="u-full-width"
      type="text"
    />

    <label for="drm">DRM</label>
    <select v-model="drm" class="u-full-width" id="drm">
      <option value="none">None</option>
      <option value="widevine">Widevine</option>
      <option value="playready">PlayReady</option>
    </select>

    <div class="control-buttons">
      <button v-on:click="connect" class="button active" v-if="connected">Connected</button>
      <button v-on:click="connect" class="button-primary" :disabled="!isChrome" v-else>Connect</button>
      <span v-if="!isChrome">Google Chrome required!</span>
      <span v-if="connected" style="margin-left: 0px">
        <button v-on:click="loadMedia">Load Media</button>
        <button v-on:click="stop">Stop</button>
        <button v-on:click="nextAudio" v-if="audioTracks.length > 1">Next Audio</button>
        <button v-for="(item, idx) in textTracks" :key=item.id
          :class="item.active ? 'button active' : ''"
          v-on:click="toggleTrack(item.id)">Subtitle {{idx + 1}}</button>
        <span v-if="debuggable" style="margin-left: 0px">
          <button v-on:click="testMessage">Test Message</button>
          <label class="debug-toggle" for="checkbox">
            <input type="checkbox" id="checkbox" v-model="debugEnabled" @change="onDebugChange($event)">
            <span>Debug Panel</span>
          </label>
        </span>
      </span>
    </div>


    <div class="player-controls" v-if="connected">
      <button class="material-icons" v-on:click="pause" v-if="playing">pause_arrow</button>
      <button class="material-icons" v-on:click="play" v-else>play_arrow</button>
      <input class="seekBar" type="range" step="any" min="0" v-bind:max="duration" v-bind:value="currentTime" @change="onSeekChange">
      <button class="material-icons" v-on:click="rewind" v-if="duration > 0">fast_rewind</button>
      <div class="currentTime">{{timeString}}</div>
      <button class="material-icons" v-on:click="forward">fast_forward</button>
      <button class="muteButton material-icons" v-on:click="setMute" v-if="muted">volume_mute</button>
      <button class="muteButton material-icons" v-on:click="setMute" v-else>volume_up</button>
      <input
        class="volumeBar"
        type="range"
        step="any"
        min="0"
        max="1"
        v-bind:value="volume"
        v-bind:style="{ background: 'linear-gradient(to right, rgb(204, 204, 204) ' + volume * 100 + '%, rgb(0, 0, 0) ' + volume * 100 + '%, rgb(0, 0, 0) 100%)' }"
        @change="onVolumeChange"
      />
    </div>

    <Log v-bind:logs="debugLog" />
  </div>
</template>

<script>
import config from '@/config';
import utils from '@/lib/utils';
import Log from '@/components/sender/Log.vue';
import '@/assets/normalize.css';
import '@/assets/skeleton.css';
import '@/assets/player-controls.css';

const { namespace, defaultApplicationId, defaultUrl, defaultSubtitleUrl, defaultLicenseUrl, defaultDrm } = config;

export default {
  name: 'sender',
  components: {
    Log,
  },
  data() {
    return {
      applicationId: defaultApplicationId,
      mediaUrl: defaultUrl,
      subtitleUrl: defaultSubtitleUrl,
      licenseUrl: defaultLicenseUrl,
      drm: defaultDrm,
      connected: false,
      loaded: false,
      debugEnabled: false,
      playing: false,
      seeking: false,
      duration: 0,
      currentTime: 0,
      prevTime: 0,
      volume: 0.70,
      savedVolume: 0.70,
      muted: false,
      debugLog: [],
      tracks: {
        loaded: false,
      },
    }
  },
  computed: {
    timeString: function() {
      return utils.buildTimeString(this.currentTime);
    },
    isChrome: function() {
      return utils.isChrome();
    },
    debuggable: function() {
      return (this.applicationId == 'A55EBA47' || this.applicationId == 'B24212A8');
    },
    textTracks: function() {
      if (!this.tracks.loaded) return []; // Makes this computed property reactive dependent on tracks.loaded
      let ret = this.tracks[chrome.cast.media.TrackType.TEXT];
      return Array.isArray(ret) ? ret : [];
    },
    audioTracks: function() {
      if (!this.tracks.loaded) return [];
      let ret = this.tracks[chrome.cast.media.TrackType.AUDIO];
      return Array.isArray(ret) ? ret : [];
    },
  },
  mounted() {
    this.setQueryParams();
    this.init();
  },
  methods: {
    setQueryParams() {
      // Check if query params are set.
      if (this.$route.query.application) {
        this.applicationId = this.$route.query.application;
      }

      if (this.$route.query.url) {
        this.mediaUrl = this.$route.query.url;
      }

      if (this.$route.query.subtitleUrl) {
        this.subtitleUrl = this.$route.query.subtitleUrl;
      }

      if (this.$route.query.licenseUrl) {
        this.licenseUrl = this.$route.query.licenseUrl;
      }

      if (this.$route.query.drm) {
        this.drm = this.$route.query.drm.toLowerCase();
      }
    },
    init() {
      window['__onGCastApiAvailable'] = (isAvailable) => {
          if (isAvailable) {
            setTimeout(() => {
              this.initializeCastApi();
            }, 50);
          }
      };
    },

    reset() {
      this.loaded = false;
      this.debugEnabled = false;
      this.playing = false;
      this.seeking = false;
      this.duration = 0;
      this.currentTime = 0;
      this.prevTime = 0;
      this.volume = 0.70;
      this.savedVolume = 0.70;
      this.muted = false;
      // this.debugLog = [];
      this.tracks = { loaded: false };
    },

    initializeCastApi() {
      this.log('[mediacast] - Initializing Cast API');
      window.cast.framework.setLoggerLevel(cast.framework.LoggerLevel.DEBUG);
      this.setPlayerEvents();
    },

    connect() {
      var id = !this.applicationId ? chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID : this.applicationId;
      window.cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: id,
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
      });
      this.log('[mediacast] - Connecting to: ', id);
      if (cast) {
        cast.framework.CastContext.getInstance().requestSession();
      }
    },

    loadMedia() {
      const { mediaUrl, subtitleUrl, licenseUrl, drm } = this;

      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const mediaInfo = new window.chrome.cast.media.MediaInfo(mediaUrl, 'video/mp4');
      mediaInfo.customData = { licenseUrl, drm };

      if (drm != "none" && this.applicationId == chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID) {
        this.log('[mediacast:loadMedia] - Default Media Receiver cannot play DRM content');
        return;
      }

      var pathname = new URL(mediaUrl).pathname.toLowerCase();
      if (pathname.endsWith('.m3u8')) {
        mediaInfo.contentType = 'application/x-mpegURL';
        mediaInfo.hlsSegmentFormat = chrome.cast.media.HlsSegmentFormat.TS;
      } else if (pathname.endsWith('.ts')) {
        mediaInfo.contentType = 'video/MP2T';
        // mediaInfo.hlsSegmentFormat = chrome.cast.media.HlsSegmentFormat.TS;
      } else if (pathname.endsWith('.mpd')) {
        mediaInfo.contentType = 'application/dash+xml';
      } else if (pathname.endsWith('.ism')) {
        mediaInfo.contentType = 'application/vnd.ms-sstr+xml';
      }

      var subt = null;
      if (subtitleUrl) {
        // assume English subtitle
        subt = new chrome.cast.media.Track(1, // track ID
          chrome.cast.media.TrackType.TEXT);
        subt.trackContentId = subtitleUrl;
        // subt.trackContentType = 'text/vtt';
        subt.subtype = chrome.cast.media.TextTrackType.SUBTITLES;
        subt.name = 'English Subtitles';
        subt.language = 'en-US';
        subt.customData = null;
        mediaInfo.tracks = [subt];
      }

      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);


      this.sendMessage('trying to load mediaUrl: ' + mediaUrl);
      castSession.loadMedia(request).then(() => {
        this.log('[mediacast] - Load succeeded');
        // this.setPlayerEvents();
      }, (err) => {
        this.log('[mediacast] - Error:' + err);
      });
    },

    setPlayerEvents() {
      const player = new window.cast.framework.RemotePlayer();
      const playerController = new window.cast.framework.RemotePlayerController(player);

      playerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
        this.onIsConnectedChanged,
      );

      playerController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_MEDIA_LOADED_CHANGED,
        (event) => {
          this.log('[mediacast:onIsMediaLoadedChanged] - ', event.value);
          this.loaded = event.value;
          if (!this.loaded) this.reset();
        }
      );

      playerController.addEventListener(
        cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
        this.onCurrentTimeChanged,
      );

      playerController.addEventListener(
        cast.framework.RemotePlayerEventType.DURATION_CHANGED,
        (event) => {
          this.log('[mediacast:onDurationChanged] - ', event.value);
        }
      );

      playerController.addEventListener(
        cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED,
        this.onMediaInfoChanged,
      );

      playerController.addEventListener(
        cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED,
        this.onPlayerStateChanged,
      );

      playerController.addEventListener(
        cast.framework.RemotePlayerEventType.VIDEO_INFO_CHANGED,
        this.onVideoInfoChanged,
      );

      // For debugging.
      // playerController.addEventListener(
      //   cast.framework.RemotePlayerEventType.ANY_CHANGE,
      //   (event) => {
      //     this.log(JSON.stringify(event));
      //   }
      // )
    },

    play() {
      this.log('[mediacast:play]');
      this.sendMessage("play");

      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const media = castSession.getMediaSession();

      if (!media) {
        this.loadMedia();
        return;
      }

      castSession.sendMessage('urn:x-cast:com.google.cast.media', {
        type: 'PLAY',
        requestId: 1,
        mediaSessionId: media.mediaSessionId,
      });
    },

    pause() {
      this.log('[mediacast:pause]');
      this.sendMessage("pause");

      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const media = castSession.getMediaSession();
      castSession.sendMessage('urn:x-cast:com.google.cast.media', {
        type: 'PAUSE',
        requestId: 1,
        mediaSessionId: media.mediaSessionId,
      });
    },

    stop() {
      this.log('[mediacast:stop]');
      this.sendMessage("stop");

      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const media = castSession.getMediaSession();
      if (media) {
        castSession.sendMessage('urn:x-cast:com.google.cast.media', {
          type: 'STOP',
          requestId: 1,
          mediaSessionId: media.mediaSessionId,
        });
      }
    },

    seekTo(value) {
      this.log('[mediacast:seekTo] - ', value);
      this.sendMessage("seekTo to: " + value);

      this.seeking = true;

      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const media = castSession.getMediaSession();
      castSession.sendMessage('urn:x-cast:com.google.cast.media', {
        type: 'SEEK',
        requestId: 1,
        mediaSessionId: media.mediaSessionId,
        currentTime: value,
      });
      this.play();
    },

    rewind() {
      this.log('[mediacast:rewind] - rewind 30 seconds');
      this.seekTo(this.currentTime - 30);
    },

    forward() {
      this.log('[mediacast:forward] - forward 30 seconds');
      var to = this.currentTime + 30;
      if (this.duration > 0 && to > this.duration)
        to = this.duration - 1;
      this.seekTo(to);
    },

    setVolume(value) {
      this.log('[mediacast:setVolume] - ', value);
      this.sendMessage("setVolume to: " + value);
      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      castSession.setVolume(parseFloat(value));
      this.volume = value;

      if (this.volume > 0) {
        this.muted = false;
      }
    },

    setMute() {
      this.log('[mediacast:setMute] - ', !this.muted);
      this.sendMessage("setMute to: " + !this.muted);
      this.muted = !this.muted;
      if (this.muted) {
        this.savedVolume = this.volume;
        this.volume = 0;
      } else {
        this.volume = this.savedVolume;
      }
      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      castSession.setMute(this.muted);
    },

    toggleTrack(track) {
      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const media = castSession.getMediaSession();

      if (media) {
        let req = [];
        Object.keys(this.tracks).forEach(e => {
          e = parseInt(e);
          if (Number.isNaN(e)) return;
          if (e == track) {
            if (!this.tracks[e].active) req.push(e);
          }
          else if (this.tracks[e].active) req.push(e);
        });

        media.editTracksInfo(new chrome.cast.media.EditTracksInfoRequest(req), () => {
          this.tracks[track].active = !this.tracks[track].active;
          this.log('[mediacast:toggleTrack] - Track', track, 'is now', (this.tracks[track].active ? '' : 'in') + 'active');
        }, this.editTrackFailed('toggleTrack'));
      }
    },

    nextAudio() {
      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const media = castSession.getMediaSession();

      if (media) {
        const audio = this.tracks[chrome.cast.media.TrackType.AUDIO];
        if (audio === undefined) return;
        let req = [];
        for (let i = 0; i < audio.length; ++i) {
          if (audio[i].active) {
            req.push(audio[++i % audio.length].id);
            break;
          }
        }

        Object.keys(this.tracks).forEach(e => {
          e = parseInt(e);
          if (Number.isNaN(e)) return;
          if (this.tracks[e].type == chrome.cast.media.TrackType.AUDIO) return;
          if (this.tracks[e].active) req.push(e);
        });

        let success = () => {
          let active = 0;
          audio.forEach(e => e.active = false);
          media.activeTrackIds.forEach(e => {
            if (this.tracks[e].type == chrome.cast.media.TrackType.AUDIO) {
              this.tracks[e].active = true;
              active = e;
            }
          });
          this.log('[mediacast:toggleTrack] - Audio switched to TrackId ' + active);
        };

        media.editTracksInfo(new chrome.cast.media.EditTracksInfoRequest(req),
          success, this.editTrackFailed('nextAudio'));
      }
    },

    editTrackFailed(method) {
      return (e) => this.log('[mediacast:' + method + '] - editTracksInfo failed', JSON.stringify(e));
    },

    testMessage() {
      this.sendMessage("Test");
    },

    sendMessage(message) {
      this.log('[mediacast:sendMessage] - ', message);
      if (!this.debuggable) return;
      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      castSession.sendMessage(namespace, { message: message });
    },

    onDebugChange() {
      if (!this.debuggable) return;
      this.log('[mediacast:setDebugPanel] - ', this.debugEnabled);
      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      castSession.sendMessage(namespace, { action: 'setDebugPanel', message: this.debugEnabled });
    },

    onSeekChange(event) {
      this.log('[mediacast:onSeekChange] - ', event.target.value);
      this.seeking = true;
      if (event.target && event.target.value) {
        this.seekTo(event.target.value);
      }
    },

    onVolumeChange(event) {
      this.log('[mediacast:onVolumeChange] - ', event.target.value);
      this.volume = event.target.value;
      if (event.target && event.target.value) {
        this.setVolume(event.target.value);
      }
    },

    onMediaInfoChanged(event) {
      this.log('[mediacast:onMediaInfoChanged] - ', JSON.stringify(event));
      this.duration = event.value && event.value.duration;

      if (this.loaded && !this.tracks.loaded) {
        var tracks = event.value && event.value.tracks;
        if (tracks) {
          tracks.forEach(e => {
            let o = { id: e.trackId, type: e.type, active: false };
            this.tracks[o.id] = o;
            if (this.tracks[o.type] === undefined) this.tracks[o.type] = [];
            this.tracks[o.type].push(o);
          });
        }
        this.tracks.loaded = true;

        const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
        const media = castSession.getMediaSession();
        if (media) media.activeTrackIds.forEach(e => this.tracks[e].active = true);

        this.log('[mediacast:onMediaInfoChanged] - tracks loaded');
        Object.keys(this.tracks).forEach(e => {
          if (Array.isArray(this.tracks[e]))
            this.log('[mediacast:onMediaInfoChanged] -', e, 'tracks found:', this.tracks[e].length);
        });
        if (media) media.activeTrackIds.forEach(e =>
          this.log('[mediacast:onMediaInfoChanged] - Track', e, 'is active'));
      }
    },

    onCurrentTimeChanged(event) {
      // this.log('[mediacast:onCurrentTimeChanged] - ', event.value);
      if (!this.seeking) {
        this.prevTime = this.currentTime;
        this.currentTime = event.value;
      }
    },

    onIsConnectedChanged(event) {
      this.log('[mediacast:onIsConnectedChanged] - ', event.value);
      this.connected = event.value;
      if (this.connected && this.applicationId == 'A55EBA47')
        this.debugEnabled = true;
      if (!this.connected) {
        window.cast.framework.CastContext.getInstance().endCurrentSession();
        this.reset(); 
      }
    },

    onPlayerStateChanged(event) {
      this.log('[mediacast:onPlayerStateChanged] - ', event.value);
      this.playing = event.value === 'PLAYING' || event.value === 'BUFFERING';

      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const media = castSession.getMediaSession();

      if (event.value === 'PLAYING') {
        this.seeking = false;
        this.log('[mediacast:onPlayerStateChanged] - videoInfo: ', JSON.stringify(media.videoInfo));
      }
      if (event.value === 'IDLE') {
        if (media) {
          this.log('[mediacast:onPlayerStateChanged] - idle Reason: ', media.idleReason);
        }
        this.log('[mediacast:onPlayerStateChanged] - last played position: ', this.prevTime);
      }
    },

    onVideoInfoChanged(event) {
      this.log('[mediacast:onVideoInfoChanged] - ', JSON.stringify(event));
    },

    log(...message) {
      console.log(message.join(' '));
      // debugLog gets updated and passed to <Log /> prop.
      this.debugLog = this.debugLog.concat(message.join(' '));
    },
  }
}
</script>

<style scoped>
.controls {
  text-align: left;
}

.controls button {
  margin: 0 2px;
}

.control-buttons {
  display: inline-block;
}

.control-buttons button {
  margin-bottom: 10px;
}

.control-buttons span {
  margin-left: 10px;
}

.active {
  background-color: #005a00;
  border-color: #005a00;
  color: #FFF;
}

button:disabled,
button[disabled] {
  border: 1px solid #999999;
  background-color: #cccccc;
  color: #666666;
}

.debug-toggle {
  display: inline;
  margin: 0 10px;
}

.cast-button {
  float: left;
  width: 40px;
  height: 40px;
  opacity: 0.7;
  border: none;
  outline: none;
  margin-right: 5px;
}
</style>


