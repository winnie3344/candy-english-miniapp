<template>
  <view class="cloud-container">
    <!-- 未登录百度网盘 -->
    <view class="login-section" v-if="!cloudStore.state.isLoggedIn">
      <text class="cloud-icon">☁️</text>
      <text class="cloud-title">百度网盘</text>
      <text class="cloud-desc">登录百度网盘，访问"糖果学英语"文件夹</text>
      <button class="login-baidu-btn" @tap="loginBaidu">
        授权登录百度网盘
      </button>
    </view>

    <!-- 文件浏览 -->
    <view class="file-section" v-if="cloudStore.state.isLoggedIn">
      <!-- 路径导航 -->
      <view class="path-nav">
        <text
          class="path-item"
          v-for="(segment, idx) in pathSegments"
          :key="idx"
          @tap="navigateToPath(idx)"
        >
          {{ segment }} <text class="path-sep" v-if="idx < pathSegments.length - 1"> / </text>
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
          :key="file.fs_id"
          @tap="handleFileClick(file)"
        >
          <view class="file-icon">
            <text v-if="file.isdir === 1">📁</text>
            <text v-else-if="getFileExt(file.server_filename) === 'mp3'">🎵</text>
            <text v-else-if="getFileExt(file.server_filename) === 'mp4'">🎬</text>
            <text v-else-if="getFileExt(file.server_filename) === 'pdf'">📄</text>
            <text v-else>📎</text>
          </view>
          <view class="file-info">
            <text class="file-name">{{ file.server_filename }}</text>
            <text class="file-size" v-if="file.isdir === 0">{{ formatSize(file.size) }}</text>
          </view>
          <text class="file-arrow" v-if="file.isdir === 1">›</text>
        </view>

        <view class="empty-files" v-if="cloudStore.state.fileList.length === 0">
          <text class="empty-text">该文件夹为空</text>
        </view>
      </view>
    </view>

    <!-- 底部播放控制条 -->
    <view class="player-bar" v-if="cloudStore.state.playingFile" @tap="openPlayer">
      <view class="player-info">
        <text class="player-icon">{{ getFileTypeIcon(cloudStore.state.playingFile.server_filename) }}</text>
        <view class="player-text">
          <text class="player-name">{{ cloudStore.state.playingFile.server_filename }}</text>
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
import { useBaiduCloudStore } from '../../store/baidu-cloud'
import { getFileList, type BaiduFileInfo } from '../../utils/baidu-pan'

const cloudStore = useBaiduCloudStore()

const pathSegments = computed(() => {
  const path = cloudStore.state.currentPath
  return path.split('/').filter(s => s)
})

const loginBaidu = () => {
  // #ifdef H5
  // H5环境：跳转到百度OAuth授权页
  const authUrl = `https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=your_app_key&redirect_uri=${encodeURIComponent(window.location.href)}&scope=basic,netdisk`
  window.open(authUrl, '_blank')
  // #endif

  // #ifdef MP-WEIXIN
  // 小程序环境：使用webview打开授权页
  uni.navigateTo({
    url: `/pages/cloud-player/webview?url=${encodeURIComponent('https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=your_app_key&redirect_uri=https://your-server.com/callback&scope=basic,netdisk')}`
  })
  // #endif

  // 模拟登录（开发调试用）
  uni.showModal({
    title: '开发模式',
    content: '是否使用模拟数据登录百度网盘？',
    success: (res) => {
      if (res.confirm) {
        cloudStore.setAccessToken('mock_baidu_token')
        loadFiles('/糖果学英语')
      }
    },
  })
}

const loadFiles = async (dirPath: string) => {
  cloudStore.setLoading(true)
  cloudStore.setCurrentPath(dirPath)
  
  try {
    // TODO: 替换为实际API调用
    // const result = await getFileList(cloudStore.state.accessToken, dirPath)
    // cloudStore.setFileList(result.list)
    
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    const mockFiles: BaiduFileInfo[] = getMockFiles(dirPath)
    cloudStore.setFileList(mockFiles)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    cloudStore.setLoading(false)
  }
}

const getMockFiles = (dirPath: string): BaiduFileInfo[] => {
  if (dirPath === '/糖果学英语') {
    return [
      { fs_id: 1, path: '/糖果学英语/儿歌', server_filename: '儿歌', size: 0, isdir: 1, md5: '', category: 0, server_ctime: 0, server_mtime: 0 },
      { fs_id: 2, path: '/糖果学英语/故事', server_filename: '故事', size: 0, isdir: 1, md5: '', category: 0, server_ctime: 0, server_mtime: 0 },
      { fs_id: 3, path: '/糖果学英语/abc-song.mp3', server_filename: 'abc-song.mp3', size: 5242880, isdir: 0, md5: '', category: 1, server_ctime: 0, server_mtime: 0 },
      { fs_id: 4, path: '/糖果学英语/colors.pdf', server_filename: 'colors.pdf', size: 10485760, isdir: 0, md5: '', category: 3, server_ctime: 0, server_mtime: 0 },
    ]
  } else if (dirPath === '/糖果学英语/儿歌') {
    return [
      { fs_id: 5, path: '/糖果学英语/儿歌/twinkle.mp3', server_filename: 'twinkle.mp3', size: 3145728, isdir: 0, md5: '', category: 1, server_ctime: 0, server_mtime: 0 },
      { fs_id: 6, path: '/糖果学英语/儿歌/old-macdonald.mp4', server_filename: 'old-macdonald.mp4', size: 52428800, isdir: 0, md5: '', category: 2, server_ctime: 0, server_mtime: 0 },
      { fs_id: 7, path: '/糖果学英语/儿歌/london-bridge.mp3', server_filename: 'london-bridge.mp3', size: 4194304, isdir: 0, md5: '', category: 1, server_ctime: 0, server_mtime: 0 },
    ]
  } else if (dirPath === '/糖果学英语/故事') {
    return [
      { fs_id: 8, path: '/糖果学英语/故事/three-pigs.mp4', server_filename: 'three-pigs.mp4', size: 104857600, isdir: 0, md5: '', category: 2, server_ctime: 0, server_mtime: 0 },
      { fs_id: 9, path: '/糖果学英语/故事/snow-white.pdf', server_filename: 'snow-white.pdf', size: 8388608, isdir: 0, md5: '', category: 3, server_ctime: 0, server_mtime: 0 },
    ]
  }
  return []
}

const handleFileClick = (file: BaiduFileInfo) => {
  if (file.isdir === 1) {
    loadFiles(file.path)
  } else {
    const ext = getFileExt(file.server_filename)
    if (['mp3', 'mp4', 'pdf'].includes(ext)) {
      cloudStore.setPlayingFile(file)
      uni.navigateTo({
        url: `/pages/cloud-player/index?path=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.server_filename)}&type=${ext}`,
      })
    } else {
      uni.showToast({ title: '暂不支持此文件类型', icon: 'none' })
    }
  }
}

const navigateToPath = (idx: number) => {
  const segments = pathSegments.value.slice(0, idx + 1)
  const path = '/' + segments.join('/')
  loadFiles(path)
}

const getFileExt = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || ''
}

const getFileTypeIcon = (filename: string): string => {
  const ext = getFileExt(filename)
  if (ext === 'mp3') return '🎵'
  if (ext === 'mp4') return '🎬'
  if (ext === 'pdf') return '📄'
  return '📎'
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB'
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
    const ext = getFileExt(file.server_filename)
    uni.navigateTo({
      url: `/pages/cloud-player/index?path=${encodeURIComponent(file.path)}&name=${encodeURIComponent(file.server_filename)}&type=${ext}`,
    })
  }
}

onMounted(() => {
  if (cloudStore.state.isLoggedIn) {
    loadFiles('/糖果学英语')
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
  padding-top: 200rpx;
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
  padding: 0 60rpx;
}

.login-baidu-btn {
  width: 500rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: bold;
  border-radius: 44rpx;
  border: none;
}

.login-baidu-btn::after {
  border: none;
}

.path-nav {
  background: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 2rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  overflow-x: auto;
}

.path-item {
  font-size: 26rpx;
  color: #667eea;
  white-space: nowrap;
}

.path-sep {
  color: #ccc;
  margin: 0 8rpx;
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
}

.file-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
  margin-bottom: 6rpx;
}

.file-size {
  font-size: 22rpx;
  color: #999;
}

.file-arrow {
  font-size: 36rpx;
  color: #ccc;
  margin-left: 16rpx;
}

.empty-files {
  text-align: center;
  padding: 100rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #ccc;
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
}

.player-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.player-text {
  flex: 1;
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
