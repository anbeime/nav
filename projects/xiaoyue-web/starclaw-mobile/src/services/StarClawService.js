/**
 * StarClaw API 服务
 * 连接 StarClaw Server，复用现有 API
 */

import axios from 'axios';
import io from 'socket.io-client';

class StarClawService {
  constructor() {
    this.baseUrl = 'http://192.168.1.100:3000'; // 默认地址，可配置
    this.socket = null;
    this.api = null;
    this.deviceId = null;
    this.connected = false;
    this.listeners = new Map();
  }

  /**
   * 初始化服务
   */
  async initialize(config = {}) {
    this.baseUrl = config.baseUrl || this.baseUrl;
    this.deviceId = config.deviceId || this.generateDeviceId();
    
    // 初始化 HTTP API
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': this.deviceId
      }
    });
    
    // 初始化 WebSocket
    await this.connectWebSocket();
    
    console.log('[StarClawService] 初始化完成:', this.baseUrl);
    return { success: true, deviceId: this.deviceId };
  }

  /**
   * 连接 WebSocket
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.baseUrl, {
          transports: ['websocket'],
          query: { deviceId: this.deviceId, type: 'mobile' }
        });
        
        this.socket.on('connect', () => {
          console.log('[StarClawService] WebSocket 已连接');
          this.connected = true;
          resolve(true);
        });
        
        this.socket.on('disconnect', () => {
          console.log('[StarClawService] WebSocket 断开');
          this.connected = false;
        });
        
        // 注册事件监听
        this.socket.on('task:execute', (data) => {
          this.emit('task', data);
        });
        
        this.socket.on('skill:execute', (data) => {
          this.emit('skill', data);
        });
        
        this.socket.on('message:push', (data) => {
          this.emit('message', data);
        });
        
      } catch (error) {
        console.error('[StarClawService] WebSocket 连接失败:', error);
        resolve(false);
      }
    });
  }

  /**
   * ==================== 核心聊天 API ====================
   */
  
  /**
   * 发送消息并获取回复
   */
  async chat(message, sessionId = 'default') {
    try {
      const response = await this.api.post('/api/chat', {
        message,
        sessionId,
        deviceId: this.deviceId
      });
      return response.data;
    } catch (error) {
      console.error('[StarClawService] Chat error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取可用 Agent 列表
   */
  async getAgents() {
    try {
      const response = await this.api.get('/api/agents');
      return response.data;
    } catch (error) {
      console.error('[StarClawService] Get agents error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 与特定 Agent 对话
   */
  async chatWithAgent(agentId, message, sessionId = 'default') {
    try {
      const response = await this.api.post('/api/starclaw/chat', {
        agentId,
        message,
        sessionId,
        deviceId: this.deviceId
      });
      return response.data;
    } catch (error) {
      console.error('[StarClawService] Agent chat error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ==================== 任务执行 API ====================
   */

  /**
   * 执行代码
   */
  async executeCode(code, language = 'javascript') {
    try {
      const response = await this.api.post('/api/execute/code', {
        code,
        language
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行命令
   */
  async executeCommand(command) {
    try {
      const response = await this.api.post('/api/execute/command', {
        command
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 文件操作
   */
  async fileOperation(operation, path, content) {
    try {
      const response = await this.api.post('/api/execute/file', {
        operation,
        path,
        content
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ==================== 记忆系统 API ====================
   */

  /**
   * 搜索记忆
   */
  async searchMemory(query, limit = 5) {
    try {
      const response = await this.api.get('/api/memory/search', {
        params: { query, limit }
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 添加记忆
   */
  async remember(content, metadata = {}) {
    try {
      const response = await this.api.post('/api/memory/remember', {
        content,
        metadata
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ==================== 技能系统 API ====================
   */

  /**
   * 获取技能列表
   */
  async getSkills() {
    try {
      const response = await this.api.get('/api/skills');
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行技能
   */
  async executeSkill(skillId, params = {}) {
    try {
      const response = await this.api.post(`/api/skills/${skillId}/execute`, {
        ...params,
        deviceId: this.deviceId
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ==================== 语音 API ====================
   */

  /**
   * 语音合成
   */
  async synthesizeSpeech(text, voice = '晓晓') {
    try {
      const response = await this.api.post('/api/tts', {
        text,
        voice
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ==================== 移动端专用 API ====================
   */

  /**
   * 注册设备
   */
  async registerDevice(deviceInfo) {
    try {
      const response = await this.api.post('/api/mobile/register', {
        deviceId: this.deviceId,
        deviceInfo: {
          platform: 'android',
          model: deviceInfo.model || 'Unknown',
          osVersion: deviceInfo.osVersion || 'Unknown',
          appVersion: '1.0.0'
        },
        capabilities: deviceInfo.capabilities || []
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送心跳
   */
  async heartbeat(status = {}) {
    try {
      const response = await this.api.post('/api/mobile/heartbeat', {
        deviceId: this.deviceId,
        status: {
          online: true,
          battery: status.battery || 100,
          network: status.network || 'wifi',
          ...status
        }
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 上报 Skill 执行结果
   */
  async reportSkillResult(skillId, result) {
    try {
      const response = await this.api.post('/api/mobile/skill/result', {
        deviceId: this.deviceId,
        skillId,
        result
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * ==================== 工具方法 ====================
   */

  /**
   * 生成设备 ID
   */
  generateDeviceId() {
    return 'mobile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

  /**
   * 移除监听
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * 获取连接状态
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }
}

// 导出单例
const starClawService = new StarClawService();
export default starClawService;
export { StarClawService };
