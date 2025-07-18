export function extractVideoId(url = window.location.href) {
    console.log('Extracting video ID from:', url);
    const patterns = [
      /[?&]v=([^&]+)/,
      /youtu\.be\/([^?&]+)/,
      /embed\/([^?&]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        console.log('Found video ID:', match[1]);
        return match[1];
      }
    }
    console.log('No video ID found in URL');
    return null;
}

export function getCurrentTimestamp() {
    const video = document.getElementsByClassName("video-stream")[0];
    return video ? Math.floor(video.currentTime) : 0;
}

export function createAskPayload(userQuestion) {
    return {
        video_id: extractVideoId(),
        current_timestamp: getCurrentTimestamp(),
        question: userQuestion
    };
} 