/**
 * 无障碍服务接口
 * Phase 2: 安卓原生模块桥接
 * 
 * 实际实现在 android/app/src/main/java/.../AccessibilityModule.java
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { AccessibilityModule } = NativeModules;

class AccessibilityService {
  constructor() {
    this.eventEmitter = new NativeEventEmitter(AccessibilityModule);
    this.listeners = new Map();
    this.enabled = false;
    
    // 监听原生事件
    if (Platform.OS === 'android') {
      this.eventEmitter.addListener('AccessibilityEvent', this.handleEvent.bind(this));
    }
  }

  /**
   * 检查无障碍服务是否启用
   */
  async isEnabled() {
    if (Platform.OS !== 'android') {
      return false;
    }
    
    try {
      this.enabled = await AccessibilityModule.isEnabled();
      return this.enabled;
    } catch (error) {
      console.error('[AccessibilityService] 检查状态失败:', error);
      return false;
    }
  }

  /**
   * 打开无障碍设置页面
   */
  async openSettings() {
    if (Platform.OS !== 'android') {
      return { success: false, error: '仅支持 Android' };
    }
    
    try {
      await AccessibilityModule.openAccessibilitySettings();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 启动 App
   */
  async launchApp(packageName) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.launchApp(packageName);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 通过文本点击
   */
  async clickByText(text) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.clickByText(text);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 通过 ID 点击
   */
  async clickById(id) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.clickById(id);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 点击坐标
   */
  async clickAt(x, y) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.clickAt(x, y);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 滚动
   */
  async scroll(direction, distance = 0.5) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.scroll(direction, distance);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 滑动
   */
  async swipe(startX, startY, endX, endY, duration = 300) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.swipe(startX, startY, endX, endY, duration);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 输入文本
   */
  async inputText(text) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.inputText(text);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 通过 ID 输入
   */
  async inputById(id, text) {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.inputById(id, text);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 按返回键
   */
  async pressBack() {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.pressBack();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 按 Home 键
   */
  async pressHome() {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.pressHome();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 截图
   */
  async takeScreenshot() {
    if (!this.enabled) {
      return { success: false, error: '无障碍服务未启用' };
    }
    
    try {
      const result = await AccessibilityModule.takeScreenshot();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 查找元素
   */
  async findElement(selector) {
    if (!this.enabled) {
      return null;
    }
    
    try {
      const result = await AccessibilityModule.findElement(selector);
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取当前包名
   */
  async getCurrentPackage() {
    if (!this.enabled) {
      return null;
    }
    
    try {
      const packageName = await AccessibilityModule.getCurrentPackage();
      return packageName;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取屏幕节点树
   */
  async getScreenNodes() {
    if (!this.enabled) {
      return null;
    }
    
    try {
      const nodes = await AccessibilityModule.getScreenNodes();
      return JSON.parse(nodes);
    } catch (error) {
      return null;
    }
  }

  /**
   * 处理原生事件
   */
  handleEvent(event) {
    console.log('[AccessibilityService] 原生事件:', event);
    
    // 广播事件
    this.listeners.forEach((callbacks, type) => {
      if (event.type === type) {
        callbacks.forEach(callback => callback(event));
      }
    });
  }

  /**
   * 事件监听
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

// 导出单例
const accessibilityService = new AccessibilityService();
export default accessibilityService;
export { AccessibilityService };
