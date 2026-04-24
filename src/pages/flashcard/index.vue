<template>
  <view class="flashcard-container">
    <!-- 时间限制提醒横幅 -->
    <view class="time-limit-banner" v-if="timeLimitEnabled && remainingTimeStr">
      <text class="time-limit-icon">⏰</text>
      <text class="time-limit-text">今日剩余: {{ remainingTimeStr }}</text>
    </view>

    <!-- 顶部进度条 -->
    <view class="progress-bar">
      <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
    </view>
    <view class="progress-text">
      <text>{{ currentIndex + 1 }} / {{ todayWords.length }}</text>
    </view>

    <!-- 时间到遮罩 -->
    <view class="time-up-overlay" v-if="showTimeUpOverlay">
      <view class="time-up-card">
        <text class="time-up-icon">🌙</text>
        <text class="time-up-title">今日学习时间到！</text>
        <text class="time-up-desc">休息一下，明天继续加油哦~</text>
        <button class="time-up-btn" @tap="goHome">返回首页</button>
      </view>
    </view>

    <!-- 闪卡内容 -->
    <view class="card-area" v-if="currentWord && !showTimeUpOverlay">
      <view class="flashcard" :class="{ flipped: isFlipped }" @tap="flipCard">
        <!-- 正面 -->
        <view class="card-front">
          <text class="word-text">{{ currentWord.word }}</text>
          <text class="phonetic-text">{{ currentWord.phonetic }}</text>
          <!-- 单词配图 -->
          <image
            v-if="currentWord.imageUrl"
            class="word-image"
            :src="currentWord.imageUrl"
            mode="aspectFit"
          />
          <view v-else class="word-image-placeholder">
            <text class="placeholder-emoji">📖</text>
          </view>
        </view>
        <!-- 背面 -->
        <view class="card-back">
          <text class="word-text-sm">{{ currentWord.word }}</text>
          <text class="meaning-text">{{ currentWord.meaning }}</text>
          <view class="level-info">
            <text class="level-badge">Lv.{{ currentWord.level }}/6</text>
            <text class="review-count">已复习 {{ currentWord.reviewCount }} 次</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="!currentWord && todayWords.length === 0">
      <text class="empty-icon">🎉</text>
      <text class="empty-text">今日学习任务已完成！</text>
      <text class="empty-sub">明天继续加油哦~</text>
    </view>

    <!-- 操作按钮区域 -->
    <view class="action-area" v-if="currentWord && !showTimeUpOverlay">
      <!-- 发音和录音按钮 -->
      <view class="media-actions">
        <view class="media-btn" @tap="playPronunciation">
          <text class="media-icon">🔊</text>
          <text class="media-label">发音</text>
        </view>
        <view class="media-btn record-btn" :class="{ recording: isRecording }" @tap="toggleRecording">
          <text class="media-icon">{{ isRecording ? '⏹' : '🎙️' }}</text>
          <text class="media-label">{{ isRecording ? '停止' : '录音' }}</text>
        </view>
        <view class="media-btn" @tap="playRecording" v-if="recordFilePath">
          <text class="media-icon">🎧</text>
          <text class="media-label">回放</text>
        </view>
      </view>

      <!-- 录音评分 -->
      <view class="score-area" v-if="pronunciationScore !== null">
        <view class="score-display">
          <text class="score-label">发音评分</text>
          <text class="score-value" :class="scoreClass">{{ pronunciationScore }}</text>
          <text class="score-unit">分</text>
        </view>
        <view class="score-bar-bg">
          <view class="score-bar" :style="{ width: pronunciationScore + '%' }" :class="scoreClass"></view>
        </view>
      </view>

      <!-- 认识/不认识按钮 -->
      <view class="remember-actions" v-if="isFlipped">
        <button class="btn-forget" @tap="handleForget">😕 不认识</button>
        <button class="btn-remember" @tap="handleRemember">😊 认识</button>
      </view>
      <view class="hint-text" v-else>
        <text>👆 点击卡片查看释义</text>
      </view>
    </view>

    <!-- 本次学习统计 -->
    <view class="session-stats" v-if="sessionStarted">
      <text class="session-text">⏱ 本次学习: {{ formatDuration(sessionDuration) }} | 已学: {{ sessionWordCount }} 个</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWordStore } from '../../store/word'
import { saveFlashcardRecord } from '../../utils/study-record'
import { type ReviewWord } from '../../utils/ebbinghaus'
import { 
  getTimeLimitConfig, 
  isTimeLimitExceeded, 
  getRemainingTime, 
  addFlashcardTime,
  formatSeconds,
  TimeLimitChecker
} from '../../utils/time-limit'

const wordStore = useWordStore()

const isFlipped = ref(false)
const isRecording = ref(false)
const recordFilePath = ref('')
const pronunciationScore = ref<number | null>(null)
const sessionStarted = ref(false)
const sessionDuration = ref(0)
const sessionWordCount = ref(0)
const showTimeUpOverlay = ref(false)
const remainingTimeStr = ref('')
let timer: ReturnType<typeof setInterval> | null = null
let recorderManager: UniApp.RecorderManager | null = null
let innerAudioContext: UniApp.InnerAudioContext | null = null
let timeLimitChecker: TimeLimitChecker | null = null
let lastTrackedSecond = 0

const timeLimitEnabled = computed(() => getTimeLimitConfig().enabled)

const todayWords = computed(() => wordStore.state.todayWords)
const currentIndex = computed(() => wordStore.state.currentIndex)
const currentWord = computed((): ReviewWord | null => wordStore.getCurrentWord())

const progressPercent = computed(() => {
  if (todayWords.value.length === 0) return 0
  return Math.round(((currentIndex.value + 1) / todayWords.value.length) * 100)
})

const scoreClass = computed(() => {
  if (pronunciationScore.value === null) return ''
  if (pronunciationScore.value >= 80) return 'score-excellent'
  if (pronunciationScore.value >= 60) return 'score-good'
  return 'score-need-work'
})

const flipCard = () => {
  isFlipped.value = !isFlipped.value
}

const playPronunciation = () => {
  if (!currentWord.value) return
  
  const word = currentWord.value.word
  
  // #ifdef H5
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.9
    const voices = speechSynthesis.getVoices()
    const usVoice = voices.find(v => v.lang === 'en-US')
    if (usVoice) utterance.voice = usVoice
    speechSynthesis.speak(utterance)
  }
  // #endif

  // #ifdef MP-WEIXIN
  const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
  const audio = uni.createInnerAudioContext()
  audio.src = audioUrl
  audio.play()
  // #endif
}

const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

const startRecording = () => {
  isRecording.value = true
  pronunciationScore.value = null
  
  // #ifdef H5
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mediaRecorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        recordFilePath.value = URL.createObjectURL(blob)
        stream.getTracks().forEach(t => t.stop())
        simulateScore()
      }
      
      ;(window as any).__mediaRecorder = mediaRecorder
      mediaRecorder.start()
    }).catch(() => {
      uni.showToast({ title: '无法访问麦克风', icon: 'none' })
      isRecording.value = false
    })
  }
  // #endif

  // #ifdef MP-WEIXIN
  recorderManager = uni.getRecorderManager()
  recorderManager.onStop((res: any) => {
    recordFilePath.value = res.tempFilePath
    simulateScore()
  })
  recorderManager.start({
    format: 'mp3',
    duration: 60000,
  })
  // #endif
}

const stopRecording = () => {
  isRecording.value = false
  
  // #ifdef H5
  const mediaRecorder = (window as any).__mediaRecorder
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  // #endif

  // #ifdef MP-WEIXIN
  if (recorderManager) {
    recorderManager.stop()
  }
  // #endif
}

const simulateScore = () => {
  setTimeout(() => {
    pronunciationScore.value = Math.floor(Math.random() * 30 + 70)
  }, 500)
}

const playRecording = () => {
  if (!recordFilePath.value) return

  // #ifdef H5
  const audio = new Audio(recordFilePath.value)
  audio.play()
  // #endif

  // #ifdef MP-WEIXIN
  innerAudioContext = uni.createInnerAudioContext()
  innerAudioContext.src = recordFilePath.value
  innerAudioContext.play()
  // #endif
}

const handleRemember = () => {
  wordStore.markResult(true)
  sessionWordCount.value++
  isFlipped.value = false
  pronunciationScore.value = null
  recordFilePath.value = ''
  
  const next = wordStore.nextWord()
  if (!next) {
    finishSession()
  }
}

const handleForget = () => {
  wordStore.markResult(false)
  sessionWordCount.value++
  isFlipped.value = false
  pronunciationScore.value = null
  recordFilePath.value = ''
  
  const next = wordStore.nextWord()
  if (!next) {
    finishSession()
  }
}

const finishSession = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  
  // 累加今日学习时间
  const duration = wordStore.getSessionDuration()
  if (duration > lastTrackedSecond) {
    addFlashcardTime(duration - lastTrackedSecond)
    lastTrackedSecond = duration
  }
  
  const today = new Date().toISOString().split('T')[0]
  saveFlashcardRecord({
    date: today,
    duration,
    wordCount: sessionWordCount.value,
    correctCount: wordStore.state.sessionCorrectCount,
  })
  
  uni.showToast({ title: '🎉 本次学习完成！', icon: 'none', duration: 2000 })
}

const goHome = () => {
  uni.switchTab({ url: '/pages/home/index' })
}

const formatDuration = (seconds: number): string => {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}分${sec}秒`
}

const updateRemainingTime = () => {
  const config = getTimeLimitConfig()
  if (config.enabled) {
    const remaining = getRemainingTime()
    if (remaining === Infinity) {
      remainingTimeStr.value = ''
    } else {
      remainingTimeStr.value = formatSeconds(remaining)
    }
  } else {
    remainingTimeStr.value = ''
  }
}

onMounted(() => {
  // 检查是否已超时
  if (isTimeLimitExceeded()) {
    showTimeUpOverlay.value = true
    return
  }

  wordStore.loadTodayWords()
  sessionStarted.value = true
  
  // 启动计时器
  timer = setInterval(() => {
    sessionDuration.value = wordStore.getSessionDuration()
    
    // 每30秒累加一次时间到时间限制追踪
    const currentSecond = sessionDuration.value
    if (currentSecond - lastTrackedSecond >= 30) {
      addFlashcardTime(currentSecond - lastTrackedSecond)
      lastTrackedSecond = currentSecond
    }
    
    updateRemainingTime()
  }, 1000)

  // 启动时间限制检查器
  const config = getTimeLimitConfig()
  if (config.enabled) {
    timeLimitChecker = new TimeLimitChecker(
      // 提醒回调
      () => {
        const remaining = getRemainingTime()
        uni.showModal({
          title: '⏰ 学习时间提醒',
          content: `今日学习时间还剩${formatSeconds(remaining)}，请注意休息哦~`,
          showCancel: false,
          confirmText: '知道了',
        })
      },
      // 超时回调
      () => {
        showTimeUpOverlay.value = true
      }
    )
    timeLimitChecker.start(15)
  }

  updateRemainingTime()
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (isRecording.value) {
    stopRecording()
  }
  if (timeLimitChecker) {
    timeLimitChecker.stop()
  }
  // 保存最后的学习时间
  const currentSecond = sessionDuration.value
  if (currentSecond > lastTrackedSecond) {
    addFlashcardTime(currentSecond - lastTrackedSecond)
  }
})
</script>

<style scoped>
.flashcard-container {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}

.time-limit-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx 30rpx;
  background: linear-gradient(90deg, #fff3e0, #ffe0b2);
  gap: 10rpx;
}

.time-limit-icon {
  font-size: 28rpx;
}

.time-limit-text {
  font-size: 26rpx;
  color: #e65100;
  font-weight: bold;
}

.time-up-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.time-up-card {
  width: 600rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.time-up-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.time-up-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.time-up-desc {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.time-up-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 44rpx;
  border: none;
}

.time-up-btn::after {
  border: none;
}

.progress-bar {
  height: 8rpx;
  background: #e8e8e8;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s;
}

.progress-text {
  text-align: center;
  padding: 20rpx;
  font-size: 26rpx;
  color: #999;
}

.card-area {
  padding: 20rpx 40rpx;
}

.flashcard {
  height: 520rpx;
  perspective: 1000rpx;
  position: relative;
}

.flashcard .card-front,
.flashcard .card-back {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  transition: transform 0.6s;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.08);
}

.card-front {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: rotateY(0deg);
}

.card-back {
  background: #fff;
  transform: rotateY(180deg);
}

.flipped .card-front {
  transform: rotateY(-180deg);
}

.flipped .card-back {
  transform: rotateY(0deg);
}

.word-text {
  font-size: 72rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16rpx;
}

.phonetic-text {
  font-size: 30rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 30rpx;
}

.word-image {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
}

.word-image-placeholder {
  width: 200rpx;
  height: 200rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-emoji {
  font-size: 80rpx;
}

.word-text-sm {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.meaning-text {
  font-size: 40rpx;
  color: #667eea;
  font-weight: bold;
  margin-bottom: 30rpx;
}

.level-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.level-badge {
  background: #f0f0ff;
  color: #667eea;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.review-count {
  font-size: 24rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.empty-sub {
  font-size: 28rpx;
  color: #999;
}

.action-area {
  padding: 30rpx 40rpx;
}

.media-actions {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  margin-bottom: 30rpx;
}

.media-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 30rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.media-btn.record-btn {
  background: #fff0f0;
}

.media-btn.recording {
  background: #ff4444;
}

.media-btn.recording .media-icon,
.media-btn.recording .media-label {
  color: #fff;
}

.media-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.media-label {
  font-size: 22rpx;
  color: #666;
}

.score-area {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.score-display {
  display: flex;
  align-items: baseline;
  margin-bottom: 16rpx;
}

.score-label {
  font-size: 26rpx;
  color: #999;
  margin-right: 16rpx;
}

.score-value {
  font-size: 48rpx;
  font-weight: bold;
}

.score-unit {
  font-size: 24rpx;
  color: #999;
  margin-left: 8rpx;
}

.score-excellent {
  color: #52c41a;
}

.score-good {
  color: #faad14;
}

.score-need-work {
  color: #ff4d4f;
}

.score-bar-bg {
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.score-bar {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.5s;
}

.score-bar.score-excellent {
  background: #52c41a;
}

.score-bar.score-good {
  background: #faad14;
}

.score-bar.score-need-work {
  background: #ff4d4f;
}

.remember-actions {
  display: flex;
  gap: 30rpx;
}

.btn-forget,
.btn-remember {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 30rpx;
  font-weight: bold;
  border-radius: 44rpx;
  border: none;
}

.btn-forget {
  background: #fff0f0;
  color: #ff4d4f;
}

.btn-remember {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-forget::after,
.btn-remember::after {
  border: none;
}

.hint-text {
  text-align: center;
  padding: 30rpx;
  color: #999;
  font-size: 28rpx;
}

.session-stats {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 40rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.session-text {
  font-size: 24rpx;
  color: #999;
}
</style>
