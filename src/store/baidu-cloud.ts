/**
 * 百度网盘状态管理
 */
import { reactive } from 'vue'
import { type BaiduFileInfo } from '../utils/baidu-pan'

interface BaiduCloudState {
  accessToken: string
  isLoggedIn: boolean
  currentPath: string
  fileList: BaiduFileInfo[]
  loading: boolean
  // 播放状态
  playingFile: BaiduFileInfo | null
  playProgress: number // 播放进度(秒)
  playDuration: number // 总时长(秒)
  playRate: number // 播放速率
  isPlaying: boolean
}

const state = reactive<BaiduCloudState>({
  accessToken: uni.getStorageSync('baiduAccessToken') || '',
  isLoggedIn: !!uni.getStorageSync('baiduAccessToken'),
  currentPath: '/糖果学英语',
  fileList: [],
  loading: false,
  playingFile: null,
  playProgress: 0,
  playDuration: 0,
  playRate: 1.0,
  isPlaying: false,
})

export function useBaiduCloudStore() {
  const setAccessToken = (token: string) => {
    state.accessToken = token
    state.isLoggedIn = true
    uni.setStorageSync('baiduAccessToken', token)
  }

  const logoutBaidu = () => {
    state.accessToken = ''
    state.isLoggedIn = false
    state.currentPath = '/糖果学英语'
    state.fileList = []
    uni.removeStorageSync('baiduAccessToken')
  }

  const setCurrentPath = (path: string) => {
    state.currentPath = path
  }

  const setFileList = (list: BaiduFileInfo[]) => {
    state.fileList = list
  }

  const setLoading = (loading: boolean) => {
    state.loading = loading
  }

  const setPlayingFile = (file: BaiduFileInfo | null) => {
    state.playingFile = file
    state.playProgress = 0
    state.isPlaying = !!file
  }

  const updatePlayProgress = (progress: number) => {
    state.playProgress = progress
  }

  const updatePlayDuration = (duration: number) => {
    state.playDuration = duration
  }

  const setPlayRate = (rate: number) => {
    state.playRate = rate
  }

  const setIsPlaying = (playing: boolean) => {
    state.isPlaying = playing
  }

  return {
    state,
    setAccessToken,
    logoutBaidu,
    setCurrentPath,
    setFileList,
    setLoading,
    setPlayingFile,
    updatePlayProgress,
    updatePlayDuration,
    setPlayRate,
    setIsPlaying,
  }
}
