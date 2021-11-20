const config = {
  namespace: 'urn:x-cast:com.google.cast.mediacast',
  defaultApplicationId: 'CC1AD845', // DEFAULT_MEDIA_RECEIVER_APP_ID
  // applicationId: 'A55EBA47',
  // applicationId: 'B24212A8', // DEV
  defaultUrl: 'https://demo.unified-streaming.com/video/tears-of-steel/tears-of-steel-dash-widevine.ism/.mpd',
  defaultSubtitleUrl: 'https://raw.githubusercontent.com/alxhotel/chromecast-api/master/test/captions_styled.vtt',
  defaultLicenseUrl: 'https://widevine-proxy.appspot.com/proxy',
  defaultDrm: 'none'
}

export default config;
