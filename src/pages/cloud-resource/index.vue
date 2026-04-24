<template>
  <view class="cloud-container">
    <!-- 未配置COS -->
    <view class="login-section" v-if="!cloudStore.state.isConfigured">
      <text class="cloud-icon">☁️</text>
      <text class="cloud-title">云资源</text>
      <text class="cloud-desc">连接腾讯云COS，访问音视频学习资源</text>
      <button class="login-btn" @tap="goSetting">
        前往配置
      </button>
      <view class="setup-guide">
        <text class="guide-title">📖 配置步骤</text>
        <text class="guide-step">1. 注册腾讯云，开通COS服务</text>
        <text class="guide-step">2. 创建存储桶（公有读、私有写）</text>
        <text class="guide-step">3. 获取API密钥（SecretId/Key）</text>
        <text class="guide-step">4. 用COSBrowser上传文件到存储桶</text>
        <text class="guide-step">5. 在家长设置中填入配置信息</text>
      </view>
    </view>

    <!-- 文件浏览 -->
    <view class="file-section" v-if="cloudStore.state.isConfigured">
      <!-- 路径导航 -->
      <view class="path-nav">
        <text class="path-item" @tap="navigateToRoot">🏠 根目录</text>
        <text
          class="path-sep"
          v-for="(segment, idx) in pathSegments"
          :key="idx"
        > / <text class="path-item" @tap="navigateToPath(idx)">{{ segment }}</text></text>
      </view>

      <!-- 刷新按钮 -->
      <view class="action-bar">
        <text class="action-btn" @tap="refreshFiles">🔄 刷新</text>
        <text class="current-count" v-if="cloudStore.state.fileList.length > 0">
          {{ cloudStore.state.fileList.length }} 个项目
        </text>
      </view>

      <!-- 加载中 -->
      <view class="loading-area" v-if="cloudStore.state.loading">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 文件列表 -->
      <view class="file-list" v-if="!cloudStore.state.loading">
        <view
          class="file-item"
          v-for="file in cloudStore.state.fileList"
          :key="file.key"
          @tap="handleFileClick(file)"
        >
          <view class="file-icon">
            <text>{{ getFileIcon(file) }}</text>
          </view>
          <view class="file-info">
            <text class="file-name">{{ file.name }}</text>
            <text class="file-meta" v-if="!file.isDir">
              {{ formatSize(file.size) }} · {{ formatDate(file.lastModified) }}
            </text>
            <text class="file-meta" v-else>文件夹</text>
          </view>
          <text class="file-arrow" v-if="file.isDir">›</text>
          <text class="file-play-hint" v-if="!file.isDir && isPlayable(file)">▶</text>
        </view>

        <view class="empty-files" v-if="cloudStore.state.fileList.length === 0">
          <text class="empty-icon">📭</text>
          <text class="empty-text">该文件夹为空</text>
          <text class="empty-hint">请在电脑上使用COSBrowser上传文件</text>
        </view>
      </view>
    </view>

    <!-- 底部播放控制条 -->
    <view class="player-bar" v-if="cloudStore.state.playingFile" @tap="openPlayer">
      <view class="player-info">
        <text class="player-icon">{{ getFileIcon(cloudStore.state.playingFile) }}</text>
        <view class="player-text">
          <text class="player-name">{{ cloudStore.state.playingFile.name }}</text>
          <text class="player-status">{{ cloudStore.state.isPlaying ? '正在播放' : '已暂停' }} · {{ formatPlayRate(cloudStore.state.playRate) }}</text>
        </view>
      </view>
      <view class="player-controls">
        <text class="control-btn" @tap.stop="togglePlay">⏯</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCloudResourceStore } from '../../store/cloud-resource'
import { 
  listCosFiles, 
  getFileUrl, 
  getSignedUrl, 
  isCosConfigured,
  getFileIcon as cosGetFileIcon, 
  formatFileSize, 
  isPlayableFile,
  getFileMediaType,
  type CosFileInfo 
} from '../../utils/cos-client'

const cloudStore = useCloudResourceStore()

const pathSegments = computed(() => {
  const path = cloudStore.state.currentPath
  return path.split('/').filter(s => s)
})

const goSetting = () => {
  uni.switchTab({ url: '/pages/setting/index' })
}

const refreshFiles = () => {
  loadFiles(cloudStore.state.currentPath)
}

const loadFiles = async (dirPath: string) => {
  cloudStore.setLoading(true)
  cloudStore.setCurrentPath(dirPath)

  try {
    const result = await listCosFiles(dirPath)
    cloudStore.setFileList(result.files)
  } catch (e: any) {
    console.error('加载文件列表失败:', e)
    uni.showToast({ 
      title: e.message || '加载失败，请检查COS配置', 
      icon: 'none',
      duration: 3000
    })
  } finally {
    cloudStore.setLoading(false)
  }
}

const handleFileClick = (file: CosFileInfo) => {
  if (file.isDir) {
    loadFiles(file.key)
  } else {
    if (!isPlayableFile(file.name)) {
      uni.showToast({ title: '暂不支持此文件类型', icon: 'none' })
      return
    }

    cloudStore.setPlayingFile(file)
    const mediaType = getFileMediaType(file.name)
    const fileUrl = getFileUrl(file.key)

    uni.navigateTo({
      url: `/pages/cloud-player/index?path=${encodeURIComponent(file.key)}&name=${encodeURIComponent(file.name)}&type=${mediaType}&url=${encodeURIComponent(fileUrl)}`,
    })
  }
}

const navigateToRoot = () => {
  loadFiles('')
}

const navigateToPath = (idx: number) => {
  const segments = pathSegments.value.slice(0, idx + 1)
  const path = segments.join('/') + '/'
  loadFiles(path)
}

const getFileIcon = (file: CosFileInfo): string => {
  if (file.isDir) return '📁'
  return cosGetFileIcon(file.name)
}

const formatSize = (bytes: number): string => {
  return formatFileSize(bytes)
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return ''
  }
}

const isPlayable = (file: CosFileInfo): boolean => {
  return !file.isDir && isPlayableFile(file.name)
}

const formatPlayRate = (rate: number): string => {
  return rate.toFixed(1) + 'x'
}

const togglePlay = () => {
  cloudStore.setIsPlaying(!cloudStore.state.isPlaying)
}

const openPlayer = () => {
  if (cloudStore.state.playingFile) {
    const file = cloudStore.state.playingFile
    const mediaType = getFileMediaType(file.name)
    const fileUrl = getFileUrl(file.key)
    uni.navigateTo({
      url: `/pages/cloud-player/index?path=${encodeURIComponent(file.key)}&name=${encodeURIComponent(file.name)}&type=${mediaType}&url=${encodeURIComponent(fileUrl)}`,
    })
  }
}

onMounted(() => {
  const configured = isCosConfigured()
  cloudStore.setConfigured(configured)
  if (configured) {
    loadFiles('')
  }
})

onShow(() => {
  // 每次显示时检查配置是否变化
  const configured = isCosConfigured()
  cloudStore.setConfigured(configured)
  if (configured && cloudStore.state.fileList.length === 0) {
    loadFiles(cloudStore.state.currentPath || '')
  }
})
</script>

<style scoped>
.cloud-container {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 120rpx;
}

.login-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}

.cloud-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.cloud-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.cloud-desc {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 60rpx;
  text-align: center;
}

.login-btn {
  width: 500rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: bold;
  border-radius: 44rpx;
  border: none;
}

.login-btn::after {
  border: none;
}

.setup-guide {
  width: 100%;
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-top: 40rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.guide-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.guide-step {
  font-size: 24rpx;
  color: #666;
  line-height: 2;
  display: block;
}

.path-nav {
  background: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.path-item {
  font-size: 26rpx;
  color: #667eea;
  white-space: nowrap;
}

.path-sep {
  color: #ccc;
  font-size: 26rpx;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 30rpx;
  background: #fff;
  border-bottom: 2rpx solid #f5f6fa;
}

.action-btn {
  font-size: 26rpx;
  color: #667eea;
  padding: 8rpx 20rpx;
  background: #f0f0ff;
  border-radius: 20rpx;
}

.current-count {
  font-size: 24rpx;
  color: #999;
}

.loading-area {
  display: flex;
  justify-content: center;
  padding: 100rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.file-list {
  padding: 10rpx 30rpx;
}

.file-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.file-icon {
  font-size: 44rpx;
  margin-right: 20rpx;
  width: 60rpx;
  text-align: center;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
  margin-bottom: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  font-size: 22rpx;
  color: #999;
}

.file-arrow {
  font-size: 36rpx;
  color: #ccc;
  margin-left: 16rpx;
}

.file-play-hint {
  font-size: 28rpx;
  color: #667eea;
  margin-left: 16rpx;
  font-weight: bold;
}

.empty-files {
  text-align: center;
  padding: 100rpx 40rpx;
}

.empty-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #ccc;
  display: block;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #ddd;
  display: block;
}

.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 16rpx 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.player-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.player-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.player-text {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 26rpx;
  color: #333;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 400rpx;
}

.player-status {
  font-size: 22rpx;
  color: #999;
}

.player-controls {
  margin-left: 20rpx;
}

.control-btn {
  font-size: 40rpx;
}
</style>
