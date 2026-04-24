<template>
  <view class="home-container">
    <!-- 顶部欢迎区 -->
    <view class="welcome-section">
      <view class="welcome-info">
        <text class="greeting">Hi, {{ userStore.state.userInfo?.nickname || '同学' }} 👋</text>
        <text class="sub-greeting">今天也要加油学习哦！</text>
      </view>
      <view class="streak-badge" v-if="stats.streak > 0">
        <text class="streak-icon">🔥</text>
        <text class="streak-num">{{ stats.streak }}</text>
        <text class="streak-text">天连续</text>
      </view>
    </view>

    <!-- 今日学习概况 -->
    <view class="stats-section">
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-num">{{ stats.totalWords }}</text>
          <text class="stat-label">总单词数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ masteredCount }}</text>
          <text class="stat-label">已掌握</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ learningCount }}</text>
          <text class="stat-label">学习中</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ newCount }}</text>
          <text class="stat-label">待学习</text>
        </view>
      </view>
    </view>

    <!-- 今日学习时间进度（启用时间限制时显示） -->
    <view class="time-progress-section" v-if="timeLimitEnabled">
      <view class="time-progress-card">
        <view class="time-progress-header">
          <text class="time-progress-title">⏰ 今日学习时间</text>
          <text class="time-progress-value">{{ todayUsageMinutes }} / {{ timeLimitConfig.dailyLimitMinutes }} 分钟</text>
        </view>
        <view class="time-progress-bar-bg">
          <view 
            class="time-progress-bar" 
            :class="{ 'time-warning': todayUsagePercent >= 80, 'time-up': todayUsagePercent >= 100 }"
            :style="{ width: Math.min(todayUsagePercent, 100) + '%' }"
          ></view>
        </view>
        <text class="time-progress-hint" v-if="todayUsagePercent >= 100">今日学习时间已到，请休息~</text>
      </view>
    </view>

    <!-- PWA 安装提示（仅 iOS Safari 显示） -->
    <view class="pwa-tip-section" v-if="showPwaTip">
      <view class="pwa-tip-card">
        <text class="pwa-tip-icon">📲</text>
        <view class="pwa-tip-content">
          <text class="pwa-tip-title">添加到主屏幕</text>
          <text class="pwa-tip-desc">点击 Safari 底部的分享按钮，选择"添加到主屏幕"，即可全屏使用</text>
        </view>
        <text class="pwa-tip-close" @tap="dismissPwaTip">✕</text>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="feature-section">
      <view class="feature-card flashcard" @tap="goFlashcard">
        <view class="feature-icon-wrap">
          <text class="feature-icon">📇</text>
        </view>
        <view class="feature-info">
          <text class="feature-name">闪卡学习</text>
          <text class="feature-desc">艾宾浩斯遗忘曲线科学复习</text>
        </view>
        <text class="feature-arrow">›</text>
      </view>

      <view class="feature-card cloud" @tap="goCloud">
        <view class="feature-icon-wrap">
          <text class="feature-icon">☁️</text>
        </view>
        <view class="feature-info">
          <text class="feature-name">云资源</text>
          <text class="feature-desc">音视频学习资源在线播放</text>
        </view>
        <text class="feature-arrow">›</text>
      </view>
    </view>

    <!-- 学习统计 -->
    <view class="chart-section">
      <text class="section-title">📊 本周学习统计</text>
      <view class="chart-card">
        <view class="chart-row" v-for="(day, idx) in weekData" :key="idx">
          <text class="chart-day">{{ day.label }}</text>
          <view class="chart-bar-bg">
            <view class="chart-bar" :style="{ width: day.value + '%' }"></view>
          </view>
          <text class="chart-value">{{ day.minutes }}分钟</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../store/user'
import { useWordStore } from '../../store/word'
import { getStudyStats, getRecentFlashcardRecords, getRecentPlayRecords } from '../../utils/study-record'
import { getTimeLimitConfig, getTodayUsage, type TimeLimitConfig } from '../../utils/time-limit'

const userStore = useUserStore()
const wordStore = useWordStore()

const stats = ref({
  totalDays: 0,
  totalFlashcardTime: 0,
  totalWords: 0,
  totalPlayTime: 0,
  streak: 0,
})

const timeLimitConfig = ref<TimeLimitConfig>(getTimeLimitConfig())
const timeLimitEnabled = computed(() => timeLimitConfig.value.enabled)
const todayUsageMinutes = computed(() => {
  const usage = getTodayUsage()
  return Math.round(usage.totalSeconds / 60)
})
const todayUsagePercent = computed(() => {
  if (!timeLimitEnabled.value) return 0
  const usage = getTodayUsage()
  const limit = timeLimitConfig.value.dailyLimitMinutes * 60
  return Math.round((usage.totalSeconds / limit) * 100)
})

const showPwaTip = ref(false)

const masteredCount = computed(() => wordStore.getMasteredCount())
const learningCount = computed(() => wordStore.getLearningCount())
const newCount = computed(() => wordStore.getNewCount())

const weekData = ref<Array<{ label: string; value: number; minutes: number }>>([])

const loadStats = () => {
  stats.value = getStudyStats()
  timeLimitConfig.value = getTimeLimitConfig()
  
  // 生成本周数据
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日']
  const now = new Date()
  const today = now.getDay() || 7 // 周日=7
  const records = getRecentFlashcardRecords(7)
  const playRecords = getRecentPlayRecords(7)

  const data = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - (today - 1 - i))
    const dateStr = d.toISOString().split('T')[0]
    
    const fcTime = records
      .filter(r => r.date === dateStr)
      .reduce((sum, r) => sum + r.duration, 0)
    const playTime = playRecords
      .filter(r => r.date === dateStr)
      .reduce((sum, r) => sum + r.playDuration, 0)
    
    const totalMinutes = Math.round((fcTime + playTime) / 60)
    const maxMinutes = 60
    data.push({
      label: dayLabels[i],
      value: Math.min(totalMinutes / maxMinutes * 100, 100),
      minutes: totalMinutes,
    })
  }
  weekData.value = data
}

const checkPwaTip = () => {
  // #ifdef H5
  // 检查是否是 iOS Safari 且未以 PWA 模式运行
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)
  const isStandalone = (window.navigator as any).standalone === true
  const dismissed = uni.getStorageSync('pwaTipDismissed')
  
  if (isIOS && isSafari && !isStandalone && !dismissed) {
    showPwaTip.value = true
  }
  // #endif
}

const dismissPwaTip = () => {
  showPwaTip.value = false
  uni.setStorageSync('pwaTipDismissed', true)
}

onMounted(() => {
  loadStats()
  checkPwaTip()
})

onShow(() => {
  loadStats()
  // 确保单词数据加载
  wordStore.state.allWords = uni.getStorageSync('allWords') || []
})

const goFlashcard = () => {
  uni.navigateTo({ url: '/pages/flashcard/index' })
}

const goCloud = () => {
  uni.navigateTo({ url: '/pages/cloud-resource/index' })
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 120rpx;
}

.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60rpx 40rpx 80rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.greeting {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 10rpx;
}

.sub-greeting {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.streak-badge {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
}

.streak-icon {
  font-size: 32rpx;
  margin-right: 8rpx;
}

.streak-num {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFD700;
  margin-right: 8rpx;
}

.streak-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
}

.stats-section {
  padding: 0 30rpx;
  margin-top: -40rpx;
}

.stats-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 36rpx 20rpx;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.06);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
  margin-top: 8rpx;
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: #f0f0f0;
}

/* 今日学习时间进度 */
.time-progress-section {
  padding: 0 30rpx;
  margin-top: 20rpx;
}

.time-progress-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.time-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.time-progress-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.time-progress-value {
  font-size: 24rpx;
  color: #667eea;
  font-weight: bold;
}

.time-progress-bar-bg {
  height: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}

.time-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 8rpx;
  transition: width 0.5s;
}

.time-progress-bar.time-warning {
  background: linear-gradient(90deg, #faad14, #fa8c16);
}

.time-progress-bar.time-up {
  background: linear-gradient(90deg, #ff4d4f, #cf1322);
}

.time-progress-hint {
  font-size: 24rpx;
  color: #ff4d4f;
  margin-top: 12rpx;
  display: block;
}

/* PWA 安装提示 */
.pwa-tip-section {
  padding: 20rpx 30rpx 0;
}

.pwa-tip-card {
  background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
  border-radius: 20rpx;
  padding: 24rpx 30rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  border: 2rpx solid #c8e6c9;
}

.pwa-tip-icon {
  font-size: 40rpx;
  flex-shrink: 0;
}

.pwa-tip-content {
  flex: 1;
}

.pwa-tip-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #2e7d32;
  display: block;
  margin-bottom: 8rpx;
}

.pwa-tip-desc {
  font-size: 24rpx;
  color: #558b2f;
  line-height: 1.5;
}

.pwa-tip-close {
  font-size: 28rpx;
  color: #999;
  padding: 8rpx;
  flex-shrink: 0;
}

.feature-section {
  padding: 30rpx;
}

.feature-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 36rpx 30rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.feature-card.flashcard {
  border-left: 8rpx solid #667eea;
}

.feature-card.cloud {
  border-left: 8rpx solid #f093fb;
}

.feature-icon-wrap {
  width: 90rpx;
  height: 90rpx;
  border-radius: 20rpx;
  background: #f5f6fa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.feature-icon {
  font-size: 44rpx;
}

.feature-info {
  flex: 1;
}

.feature-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.feature-desc {
  font-size: 24rpx;
  color: #999;
}

.feature-arrow {
  font-size: 40rpx;
  color: #ccc;
  margin-left: 20rpx;
}

.chart-section {
  padding: 0 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.chart-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.chart-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.chart-row:last-child {
  margin-bottom: 0;
}

.chart-day {
  width: 40rpx;
  font-size: 24rpx;
  color: #666;
}

.chart-bar-bg {
  flex: 1;
  height: 20rpx;
  background: #f0f0f0;
  border-radius: 10rpx;
  margin: 0 20rpx;
  overflow: hidden;
}

.chart-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 10rpx;
  transition: width 0.3s;
  min-width: 4rpx;
}

.chart-value {
  width: 100rpx;
  font-size: 22rpx;
  color: #999;
  text-align: right;
}
</style>
