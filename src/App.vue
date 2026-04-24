<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useUserStore } from './store/user'

onLaunch(() => {
  console.log("App Launch");
  
  // 检查登录状态
  const userStore = useUserStore()
  if (!userStore.state.isLoggedIn) {
    // 未登录，跳转登录页
    uni.reLaunch({ url: '/pages/login/index' })
  }

  // 微信小程序后台播放配置
  // #ifdef MP-WEIXIN
  // 注册后台音频播放
  // #endif
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>

<style>
/* 全局样式 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* iPad PWA 适配 */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  /* 禁止长按弹出菜单 */
  -webkit-text-size-adjust: 100%;
  /* 安全区域适配 */
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

/* 禁止页面弹性滚动（iOS PWA） */
body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}

/* 允许内容区域滚动 */
page {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 0;
  height: 0;
}

/* iPad 适配：限制最大宽度，居中显示 */
@media (min-width: 768px) {
  page {
    max-width: 820px;
    margin: 0 auto;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.08);
  }
}

/* 禁止 input 被缩放（iOS Safari） */
input, textarea {
  font-size: 16px !important;
}
</style>
