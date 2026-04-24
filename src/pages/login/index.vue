<template>
  <view class="login-container">
    <view class="login-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="app-name">🍬 糖果学英语</text>
      <text class="app-desc">趣味学习，快乐成长</text>
    </view>

    <view class="login-form">
      <view class="input-group">
        <text class="icon">👤</text>
        <input
          v-model="username"
          class="input"
          type="text"
          placeholder="请输入用户名"
          placeholder-class="placeholder"
        />
      </view>
      <view class="input-group">
        <text class="icon">🔒</text>
        <input
          v-model="password"
          class="input"
          type="password"
          placeholder="请输入密码"
          placeholder-class="placeholder"
        />
      </view>

      <button class="login-btn" @tap="handleLogin" :loading="loading">
        登 录
      </button>

      <view class="register-link">
        <text>还没有账号？</text>
        <text class="link" @tap="goRegister">立即注册</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../../store/user'

const username = ref('')
const password = ref('')
const loading = ref(false)
const userStore = useUserStore()

const handleLogin = async () => {
  if (!username.value.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (!password.value.trim()) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // TODO: 替换为实际API调用
    // 模拟登录
    await new Promise(resolve => setTimeout(resolve, 1000))
    const mockToken = 'mock_token_' + Date.now()
    const mockUser = {
      id: '1',
      username: username.value,
      nickname: username.value,
      avatar: '',
    }
    userStore.login(mockToken, mockUser)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/home/index' })
    }, 500)
  } catch (e) {
    uni.showToast({ title: '登录失败，请检查用户名和密码', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const goRegister = () => {
  uni.navigateTo({ url: '/pages/register/index' })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 60rpx;
  padding-top: 160rpx;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 30rpx;
  border-radius: 30rpx;
}

.app-name {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16rpx;
}

.app-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.login-form {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
}

.input-group {
  display: flex;
  align-items: center;
  border-bottom: 2rpx solid #f0f0f0;
  padding: 24rpx 0;
  margin-bottom: 20rpx;
}

.icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.input {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.placeholder {
  color: #ccc;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 44rpx;
  margin-top: 40rpx;
  border: none;
}

.login-btn::after {
  border: none;
}

.register-link {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
  font-size: 26rpx;
  color: #999;
}

.link {
  color: #667eea;
  margin-left: 10rpx;
}
</style>
