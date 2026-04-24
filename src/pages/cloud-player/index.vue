<template>
  <view class="player-container">
    <!-- 顶部文件信息 -->
    <view class="file-header">
      <text class="file-type-icon">{{ typeIcon }}</text>
      <view class="file-detail">
        <text class="file-name">{{ fileName }}</text>
        <text class="file-type">{{ mediaTypeLabel }}</text>
      </view>
    </view>

    <!-- 视频播放 -->
    <view class="video-area" v-if="mediaType === 'video'">
      <video
        id="myVideo"
        class="video-player"
        :src="fileUrl"
        :autoplay="true"
        :show-fullscreen-btn="true"
        :show-play-btn="true"
        :enable-progress-gesture="true"
        :playback-rate="playbackRates"
        @timeupdate="onVideoTimeUpdate"
        @ended="onPlayEnded"
        @play="onPlayStart"
        @pause="onPlayPause"
        @error="onVideoError"
      ></video>
    </view>

    <!-- 音频播放 -->
    <view class="audio-area" v-if="mediaType === 'audio'">
      <view class="audio-visual">
        <view class="disc" :class="{ spinning: isPlaying }">
          <text class="disc-icon">🎵</text>
        </view>
      </view>
      <view class="song-title">
        <text class="song-name">{{ fileName }}</text>
      </view>
      <view class="audio-progress">
        <text class="time-text">{{ formatTime(currentTime) }}</text>
        <slider
          class="progress-slider"
          :value="currentTime"
          :min="0"
          :max="duration || 100"
          :block-size="12"
          activeColor="#667eea"
          backgroundColor="#e8e8e8"
          @change="onSliderChange"
        />
        <text class="time-text">{{ formatTime(duration) }}</text>
      </view>
      <view class="audio-controls">
        <text class="ctrl-btn" @tap="seekBackward">⏪</text>
        <text class="ctrl-btn main" @tap="toggleAudioPlay">{{ isPlaying ? '⏸' : '▶️' }}</text>
        <text class="ctrl-btn" @tap="seekForward">⏩</text>
      </view>
    </view>

    <!-- PDF 文件 -->
    <view class="pdf-area" v-if="mediaType === 'pdf'">
      <view class="pdf-placeholder">
        <text class="pdf-icon">📄</text>
        <text class="pdf-name">{{ fileName }}</text>
        <text class="pdf-hint">PDF文件预览</text>
        <button class="pdf-open-btn" @tap="openPdf">打开PDF</button>
      </view>
    </view>

    <!-- 播放速度控制 -->
    <view class="speed-control" v-if="mediaType !== 'pdf'">
      <text class="speed-label">播放速度</text>
      <view class="speed-options">
        <view
          class="speed-btn"
          v-for="rate in speedOptions"
          :key="rate"
          :class="{ active: currentRate === rate }"
          @tap="setSpeed(rate)"
        >
          <text class="speed-text">{{ rate }}x</text>
        </view>
      </view>
    </view>

    <!-- 后台播放提示 -->
    <view class="bg-play-tip" v-if="mediaType === 'audio'">
      <text class="tip-icon">🎧</text>
      <text class="tip-text">支持后台播放，锁屏也能听</text>
    </view>

    <!-- 学习记录 -->
    <view class="study-record">
      <text class="record-title">📊 本次学习</text>
      <view class="record-items">
        <view class="record-item">
          <text class="record-label">已播放</text>
          <text class="record-value">{{ formatTime(currentTime) }}</text>
        </view>
        <view class="record-item">
          <text class="record-label">播放速度</text>
          <text class="record-value">{{ currentRate }}x</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { saveFilePlayRecord } from '../../utils/study-record'

const fileName = ref('')
const filePath = ref('')
const mediaType = ref<'audio' | 'video' | 'pdf' | 'other'>('audio')
const fileUrl = ref('')
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const currentRate = ref(1.0)

const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const playbackRates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

let audioContext: UniApp.InnerAudioContext | null = null
let playTimer: ReturnType<typeof setInterval> | null = null
let videoContext: UniApp.VideoContext | null = null

const typeIcon = computed(() => {
  if (mediaType.value === 'audio') return '🎵'
  if (mediaType.value === 'video') return '🎬'
  if (mediaType.value === 'pdf') return '📄'
  return '📎'
})

const mediaTypeLabel = computed(() => {
  if (mediaType.value === 'audio') return '音频文件'
  if (mediaType.value === 'video') return '视频文件'
  if (mediaType.value === 'pdf') return 'PDF文件'
  return '文件'
})

const toggleAudioPlay = () => {
  if (!audioContext) return
  if (isPlaying.value) {
    audioContext.pause()
  } else {
    audioContext.play()
  }
}

const seekBackward = () => {
  const newTime = Math.max(0, currentTime.value - 10)
  if (audioContext) {
    audioContext.seek(newTime)
  }
  currentTime.value = newTime
}

const seekForward = () => {
  const newTime = Math.min(duration.value, currentTime.value + 10)
  if (audioContext) {
    audioContext.seek(newTime)
  }
  currentTime.value = newTime
}

const onSliderChange = (e: any) => {
  const time = e.detail.value
  if (audioContext) {
    audioContext.seek(time)
  }
  currentTime.value = time
}

const setSpeed = (rate: number) => {
  currentRate.value = rate
  if (audioContext) {
    // #ifdef H5
    const audioEl = (audioContext as any)?.$audio || document.querySelector('audio')
    if (audioEl) audioEl.playbackRate = rate
    // #endif
  }
}

const onVideoTimeUpdate = (e: any) => {
  currentTime.value = e.detail.currentTime
  duration.value = e.detail.duration
}

const onPlayStart = () => {
  isPlaying.value = true
}

const onPlayPause = () => {
  isPlaying.value = false
}

const onPlayEnded = () => {
  isPlaying.value = false
  saveRecord()
}

const onVideoError = () => {
  uni.showToast({ title: '视频加载失败，请检查网络', icon: 'none' })
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const initAudio = () => {
  if (mediaType.value !== 'audio') return

  audioContext = uni.createInnerAudioContext()
  audioContext.src = fileUrl.value

  audioContext.onPlay(() => {
    isPlaying.value = true
  })

  audioContext.onPause(() => {
    isPlaying.value = false
  })

  audioContext.onTimeUpdate(() => {
    if (audioContext) {
      currentTime.value = audioContext.currentTime
      duration.value = audioContext.duration
    }
  })

  audioContext.onEnded(() => {
    isPlaying.value = false
    saveRecord()
  })

  audioContext.onError((err) => {
    console.error('音频加载失败:', err)
    uni.showToast({ title: '音频加载失败', icon: 'none' })
  })
}

const openPdf = () => {
  // #ifdef H5
  window.open(fileUrl.value, '_blank')
  // #endif

  // #ifndef H5
  uni.downloadFile({
    url: fileUrl.value,
    success: (res) => {
      uni.openDocument({
        filePath: res.tempFilePath,
        showMenu: true,
      })
    },
    fail: () => {
      uni.showToast({ title: 'PDF打开失败', icon: 'none' })
    },
  })
  // #endif
}

const saveRecord = () => {
  const today = new Date().toISOString().split('T')[0]
  const fileTypeMap: Record<string, 'mp3' | 'mp4' | 'pdf'> = {
    audio: 'mp3',
    video: 'mp4',
    pdf: 'pdf',
  }
  saveFilePlayRecord({
    fileName: fileName.value,
    filePath: filePath.value,
    fileType: fileTypeMap[mediaType.value] || 'mp3',
    playDuration: Math.floor(currentTime.value),
    totalDuration: Math.floor(duration.value),
    date: today,
  })
}

// 定时保存学习记录
const startAutoSave = () => {
  playTimer = setInterval(() => {
    if (isPlaying.value) {
      saveRecord()
    }
  }, 30000)
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const options = page?.options || page?.$page?.options || {}

  fileName.value = decodeURIComponent(options.name || '未知文件')
  filePath.value = decodeURIComponent(options.path || '')
  mediaType.value = options.type || 'audio'
  fileUrl.value = decodeURIComponent(options.url || '')

  if (mediaType.value === 'video') {
    videoContext = uni.createVideoContext('myVideo')
  } else if (mediaType.value === 'audio') {
    initAudio()
  }

  startAutoSave()
})

onUnmounted(() => {
  if (audioContext) {
    audioContext.destroy()
  }
  if (playTimer) {
    clearInterval(playTimer)
  }
  saveRecord()
})
</script>

<style scoped>
.player-container {
  min-height: 100vh;
  background: #0a0a1a;
  padding: 30rpx;
}

.file-header {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  margin-bottom: 20rpx;
}

.file-type-icon {
  font-size: 56rpx;
  margin-right: 20rpx;
}

.file-detail {
  flex: 1;
}

.file-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 6rpx;
}

.file-type {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* Video */
.video-area {
  margin-bottom: 30rpx;
}

.video-player {
  width: 100%;
  border-radius: 16rpx;
}

/* Audio */
.audio-area {
  padding: 40rpx 0;
}

.audio-visual {
  display: flex;
  justify-content: center;
  margin-bottom: 40rpx;
}

.disc {
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20rpx 60rpx rgba(102, 126, 234, 0.3);
}

.disc.spinning {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.disc-icon {
  font-size: 80rpx;
}

.song-title {
  text-align: center;
  margin-bottom: 40rpx;
}

.song-name {
  font-size: 30rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.audio-progress {
  display: flex;
  align-items: center;
  padding: 0 10rpx;
  margin-bottom: 40rpx;
}

.time-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
  width: 80rpx;
  text-align: center;
}

.progress-slider {
  flex: 1;
  margin: 0 16rpx;
}

.audio-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60rpx;
}

.ctrl-btn {
  font-size: 44rpx;
  color: #fff;
  padding: 20rpx;
}

.ctrl-btn.main {
  font-size: 72rpx;
}

/* PDF */
.pdf-area {
  padding: 60rpx 0;
}

.pdf-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
}

.pdf-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}

.pdf-name {
  font-size: 30rpx;
  color: #fff;
  margin-bottom: 10rpx;
}

.pdf-hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 30rpx;
}

.pdf-open-btn {
  width: 400rpx;
  height: 76rpx;
  line-height: 76rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
  border-radius: 38rpx;
  border: none;
}

.pdf-open-btn::after {
  border: none;
}

/* Speed Control */
.speed-control {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 30rpx;
}

.speed-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16rpx;
  display: block;
}

.speed-options {
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
}

.speed-btn {
  flex: 1;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12rpx;
  transition: all 0.2s;
}

.speed-btn.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.speed-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.speed-btn.active .speed-text {
  color: #fff;
  font-weight: bold;
}

/* Background Play Tip */
.bg-play-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30rpx;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12rpx;
}

.tip-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
}

.tip-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* Study Record */
.study-record {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 30rpx;
}

.record-title {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16rpx;
  display: block;
}

.record-items {
  display: flex;
  gap: 40rpx;
}

.record-item {
  display: flex;
  flex-direction: column;
}

.record-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 6rpx;
}

.record-value {
  font-size: 30rpx;
  color: #667eea;
  font-weight: bold;
}
</style>
