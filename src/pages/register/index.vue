<template>
  <view class="register-container">
    <view class="register-header">
      <text class="title">📝 注册账号</text>
      <text class="desc">加入糖果学英语，开启学习之旅</text>
    </view>

    <view class="register-form">
      <view class="input-group">
        <text class="label">用户名</text>
        <input v-model="username" class="input" type="text" placeholder="请输入用户名" />
      </view>
      <view class="input-group">
        <text class="label">密码</text>
        <input v-model="password" class="input" type="password" placeholder="请输入密码（至少6位）" />
      </view>
      <view class="input-group">
        <text class="label">确认密码</text>
        <input v-model="confirmPassword" class="input" type="password" placeholder="请再次输入密码" />
      </view>
      <view class="input-group">
        <text class="label">昵称</text>
        <input v-model="nickname" class="input" type="text" placeholder="请输入昵称（选填）" />
      </view>

      <button class="register-btn" @tap="handleRegister" :loading="loading">
        注 册
      </button>

      <view class="login-link">
        <text>已有账号？</text>
        <text class="link" @tap="goLogin">返回登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '../../store/user'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const nickname = ref('')
const loading = ref(false)
const userStore = useUserStore()

const handleRegister = async () => {
  if (!username.value.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (password.value.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' })
    return
  }
  if (password.value !== confirmPassword.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  loading.value = true
  try {
    // TODO: 替换为实际API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    const mockToken = 'mock_token_' + Date.now()
    const mockUser = {
      id: '2',
      username: username.value,
      nickname: nickname.value || username.value,
      avatar: '',
    }
    userStore.login(mockToken, mockUser)
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/home/index' })
    }, 500)
  } catch (e) {
    uni.showToast({ title: '注册失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const goLogin = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 60rpx;
  padding-top: 120rpx;
}

.register-header {
  margin-bottom: 60rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 16rpx;
}

.desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.register-form {
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
}

.input-group {
  margin-bottom: 30rpx;
}

.label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e8e8e8;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.register-btn {
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

.register-btn::after {
  border: none;
}

.login-link {
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
