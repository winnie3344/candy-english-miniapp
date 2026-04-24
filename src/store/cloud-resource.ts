/**
 * 云资源状态管理（腾讯云COS）
 */
import { reactive } from 'vue'
import { type CosFileInfo, getFileMediaType } from '../utils/cos-client'

interface CloudResourceState {
  isConfigured: boolean
  currentPath: string
  fileList: CosFileInfo[]
  loading: boolean
  // 播放状态
  playingFile: CosFileInfo | null
  playProgress: number
  playDuration: number
  playRate: number
  isPlaying: boolean
}

const state = reactive<CloudResourceState>({
  isConfigured: false,
  currentPath: '',
  fileList: [],
  loading: false,
  playingFile: null,
  playProgress: 0,
  playDuration: 0,
  playRate: 1.0,
  isPlaying: false,
})

export function useCloudResourceStore() {
  const setCurrentPath = (path: string) => {
    state.currentPath = path
  }

  const setFileList = (list: CosFileInfo[]) => {
    state.fileList = list
  }

  const setLoading = (loading: boolean) => {
    state.loading = loading
  }

  const setConfigured = (configured: boolean) => {
    state.isConfigured = configured
  }

  const setPlayingFile = (file: CosFileInfo | null) => {
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
    setCurrentPath,
    setFileList,
    setLoading,
    setConfigured,
    setPlayingFile,
    updatePlayProgress,
    updatePlayDuration,
    setPlayRate,
    setIsPlaying,
  }
}
