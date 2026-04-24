/**
 * 用户状态管理（轻量级，无Pinia依赖）
 */
import { reactive } from 'vue'

interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar: string
}

interface UserState {
  token: string
  userInfo: UserInfo | null
  isLoggedIn: boolean
}

const state = reactive<UserState>({
  token: uni.getStorageSync('token') || '',
  userInfo: uni.getStorageSync('userInfo') || null,
  isLoggedIn: !!uni.getStorageSync('token'),
})

export function useUserStore() {
  const login = (token: string, userInfo: UserInfo) => {
    state.token = token
    state.userInfo = userInfo
    state.isLoggedIn = true
    uni.setStorageSync('token', token)
    uni.setStorageSync('userInfo', userInfo)
  }

  const logout = () => {
    state.token = ''
    state.userInfo = null
    state.isLoggedIn = false
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
    uni.reLaunch({ url: '/pages/login/index' })
  }

  const updateUserInfo = (info: Partial<UserInfo>) => {
    if (state.userInfo) {
      Object.assign(state.userInfo, info)
      uni.setStorageSync('userInfo', state.userInfo)
    }
  }

  return {
    state,
    login,
    logout,
    updateUserInfo,
  }
}
