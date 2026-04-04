/**
 * Skill 执行引擎
 * Phase 2: 本地执行模式核心
 * 
 * 功能：
 * 1. 解析 Skill 定义
 * 2. 执行操作序列
 * 3. 错误恢复
 * 4. 状态上报
 */

class SkillExecutor {
  constructor() {
    this.currentSkill = null;
    this.executionQueue = [];
    this.isExecuting = false;
    this.accessibilityService = null;
    this.state = {
      status: 'idle', // idle, executing, paused, error
      currentAction: null,
      progress: 0,
      error: null
    };
    this.listeners = new Map();
  }

  /**
   * 设置无障碍服务（由原生模块注入）
   */
  setAccessibilityService(service) {
    this.accessibilityService = service;
  }

  /**
   * 执行 Skill
   */
  async execute(skill, params = {}) {
    if (this.isExecuting) {
      return { success: false, error: '已有任务在执行中' };
    }

    this.isExecuting = true;
    this.currentSkill = skill;
    this.state = {
      status: 'executing',
      currentAction: null,
      progress: 0,
      error: null
    };

    const results = [];
    const totalActions = skill.actions?.length || 0;

    try {
      this.emit('start', { skill, totalActions });

      for (let i = 0; i < skill.actions.length; i++) {
        const action = skill.actions[i];
        this.state.currentAction = action;
        this.state.progress = ((i + 1) / totalActions) * 100;

        this.emit('progress', {
          current: i + 1,
          total: totalActions,
          action,
          progress: this.state.progress
        });

        // 执行单个 Action
        const result = await this.executeAction(action, params);
        results.push(result);

        if (!result.success) {
          // 尝试错误恢复
          const recovered = await this.recover(action, result.error, params);
          if (!recovered) {
            this.state.status = 'error';
            this.state.error = result.error;
            this.emit('error', { action, error: result.error, results });
            
            // 上报失败
            await this.reportResult(skill.id, { success: false, error: result.error, results });
            
            this.isExecuting = false;
            return { success: false, error: result.error, results };
          }
        }

        // 动态等待
        if (action.wait || action.delay) {
          await this.delay(action.wait || action.delay);
        }
      }

      this.state.status = 'completed';
      this.emit('complete', { skill, results });

      // 上报成功
      await this.reportResult(skill.id, { success: true, results });

      this.isExecuting = false;
      return { success: true, results };

    } catch (error) {
      this.state.status = 'error';
      this.state.error = error.message;
      this.emit('error', { error: error.message, results });
      
      await this.reportResult(skill.id, { success: false, error: error.message, results });
      
      this.isExecuting = false;
      return { success: false, error: error.message, results };
    }
  }

  /**
   * 执行单个 Action
   */
  async executeAction(action, params = {}) {
    if (!this.accessibilityService) {
      return { success: false, error: '无障碍服务未初始化' };
    }

    console.log(`[SkillExecutor] 执行: ${action.type}`, action);

    switch (action.type) {
      case 'launch':
        return this.accessibilityService.launchApp(action.app || action.package);

      case 'click':
        return this.accessibilityService.clickByText(action.target || action.text);

      case 'clickById':
        return this.accessibilityService.clickById(action.id);

      case 'clickAt':
        return this.accessibilityService.clickAt(action.x, action.y);

      case 'scroll':
        return this.accessibilityService.scroll(action.direction, action.distance);

      case 'input':
        return this.accessibilityService.inputText(action.text || params.text);

      case 'inputById':
        return this.accessibilityService.inputById(action.id, action.text);

      case 'wait':
        return this.delay(action.duration || 1000);

      case 'waitFor':
        return this.waitForElement(action.selector, action.timeout || 10000);

      case 'swipe':
        return this.accessibilityService.swipe(
          action.startX, action.startY,
          action.endX, action.endY,
          action.duration || 300
        );

      case 'back':
        return this.accessibilityService.pressBack();

      case 'home':
        return this.accessibilityService.pressHome();

      case 'screenshot':
        return this.accessibilityService.takeScreenshot();

      case 'condition':
        return this.evaluateCondition(action.condition, params);

      default:
        return { success: false, error: `未知操作类型: ${action.type}` };
    }
  }

  /**
   * 错误恢复
   */
  async recover(action, error, params) {
    console.log(`[SkillExecutor] 尝试恢复: ${action.type}, 错误: ${error}`);

    // 根据错误类型尝试恢复策略
    const recoveryStrategies = {
      'element_not_found': async () => {
        // 元素未找到，尝试滚动查找
        if (action.scrollable) {
          await this.accessibilityService.scroll('down', 0.5);
          await this.delay(500);
          return this.executeAction(action, params);
        }
        return false;
      },
      'app_not_running': async () => {
        // App 未运行，重新启动
        if (action.app) {
          await this.accessibilityService.launchApp(action.app);
          await this.delay(2000);
          return this.executeAction(action, params);
        }
        return false;
      },
      'timeout': async () => {
        // 超时，延长等待时间重试
        if (action.retryable !== false) {
          await this.delay(1000);
          return this.executeAction(action, params);
        }
        return false;
      }
    };

    const strategy = recoveryStrategies[this.getErrorType(error)];
    if (strategy) {
      const result = await strategy();
      return result && result.success;
    }

    return false;
  }

  /**
   * 获取错误类型
   */
  getErrorType(error) {
    if (error.includes('not found') || error.includes('未找到')) {
      return 'element_not_found';
    }
    if (error.includes('not running') || error.includes('未运行')) {
      return 'app_not_running';
    }
    if (error.includes('timeout') || error.includes('超时')) {
      return 'timeout';
    }
    return 'unknown';
  }

  /**
   * 等待元素出现
   */
  async waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const found = await this.accessibilityService.findElement(selector);
      if (found) {
        return { success: true };
      }
      await this.delay(200);
    }
    
    return { success: false, error: `等待元素超时: ${selector}` };
  }

  /**
   * 评估条件
   */
  async evaluateCondition(condition, params) {
    // 简单的条件判断
    try {
      const result = eval(condition);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: `条件评估失败: ${error.message}` };
    }
  }

  /**
   * 延迟
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 上报结果
   */
  async reportResult(skillId, result) {
    // 通过 StarClawService 上报
    try {
      const starClawService = require('./StarClawService').default;
      await starClawService.reportSkillResult(skillId, result);
    } catch (error) {
      console.error('[SkillExecutor] 上报结果失败:', error);
    }
  }

  /**
   * 停止执行
   */
  stop() {
    if (this.isExecuting) {
      this.isExecuting = false;
      this.state.status = 'stopped';
      this.emit('stop', { skill: this.currentSkill });
    }
  }

  /**
   * 暂停执行
   */
  pause() {
    if (this.isExecuting && this.state.status === 'executing') {
      this.state.status = 'paused';
      this.emit('pause', { skill: this.currentSkill });
    }
  }

  /**
   * 恢复执行
   */
  resume() {
    if (this.state.status === 'paused') {
      this.state.status = 'executing';
      this.emit('resume', { skill: this.currentSkill });
    }
  }

  /**
   * 获取状态
   */
  getState() {
    return { ...this.state };
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

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

// 导出单例
const skillExecutor = new SkillExecutor();
export default skillExecutor;
export { SkillExecutor };
