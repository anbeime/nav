/**
 * HeartbeatService - 心跳服务
 * 
 * 让 Agent 有"心跳"，能够：
 * 1. 主动思考 - 在用户不说话时自己思考
 * 2. 主动找用户 - 定期发起对话
 * 3. 后台干活 - 执行定时任务
 * 4. 关怀提醒 - 生日、日程、健康提醒
 */

const EventEmitter = require('events');

class HeartbeatService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            // 心跳间隔（毫秒）
            heartbeatInterval: config.heartbeatInterval || 60000, // 默认1分钟
            // 主动思考间隔
            thinkingInterval: config.thinkingInterval || 300000, // 默认5分钟
            // 主动关怀间隔
            careInterval: config.careInterval || 3600000, // 默认1小时
            // 工作时间范围（小时）
            workHours: config.workHours || { start: 9, end: 22 },
            // 是否启用主动消息
            proactiveEnabled: config.proactiveEnabled !== false,
            // 静默阈值（多久不说话触发关怀）
            silenceThreshold: config.silenceThreshold || 7200000, // 默认2小时
            ...config
        };
        
        // 状态
        this.isRunning = false;
        this.lastUserActivity = Date.now();
        this.lastThought = null;
        this.lastCare = null;
        this.timers = [];
        
        // 记忆和Agent引用
        this.contextEngine = config.contextEngine;
        this.agentConfig = config.agentConfig;
        
        // 任务队列
        this.taskQueue = [];
        this.completedTasks = [];
        
        // 绑定方法
        this.tick = this.tick.bind(this);
    }
    
    /**
     * 启动心跳服务
     */
    start() {
        if (this.isRunning) {
            console.log('[Heartbeat] 服务已在运行');
            return;
        }
        
        this.isRunning = true;
        console.log('[Heartbeat] 心跳服务启动');
        console.log(`[Heartbeat] 心跳间隔: ${this.config.heartbeatInterval / 1000}秒`);
        console.log(`[Heartbeat] 思考间隔: ${this.config.thinkingInterval / 1000}秒`);
        console.log(`[Heartbeat] 关怀间隔: ${this.config.careInterval / 1000}秒`);
        
        // 主心跳定时器
        const heartbeatTimer = setInterval(this.tick, this.config.heartbeatInterval);
        this.timers.push(heartbeatTimer);
        
        // 发出启动事件
        this.emit('start');
    }
    
    /**
     * 停止心跳服务
     */
    stop() {
        this.isRunning = false;
        this.timers.forEach(timer => clearInterval(timer));
        this.timers = [];
        console.log('[Heartbeat] 心跳服务停止');
        this.emit('stop');
    }
    
    /**
     * 心跳主循环
     */
    async tick() {
        if (!this.isRunning) return;
        
        const now = Date.now();
        const hour = new Date().getHours();
        const isWorkTime = hour >= this.config.workHours.start && 
                          hour < this.config.workHours.end;
        
        // 更新静默时间
        const silenceTime = now - this.lastUserActivity;
        
        // 发出心跳事件
        this.emit('heartbeat', {
            silenceTime,
            isWorkTime,
            hour,
            taskQueueLength: this.taskQueue.length
        });
        
        // 检查是否需要主动思考
        if (this.shouldThink(now)) {
            await this.think();
        }
        
        // 检查是否需要主动关怀
        if (this.shouldCare(now, silenceTime)) {
            await this.care();
        }
        
        // 处理任务队列
        await this.processTasks();
        
        // 记录日志
        console.log(`[Heartbeat] 嘀嗒 - 静默${Math.floor(silenceTime / 60000)}分钟, 工作时间:${isWorkTime}, 任务队列:${this.taskQueue.length}`);
    }
    
    /**
     * 判断是否需要思考
     */
    shouldThink(now) {
        if (!this.lastThought) return true;
        return (now - this.lastThought) >= this.config.thinkingInterval;
    }
    
    /**
     * 判断是否需要关怀
     */
    shouldCare(now, silenceTime) {
        if (!this.config.proactiveEnabled) return false;
        
        const hour = new Date().getHours();
        const isWorkTime = hour >= this.config.workHours.start && 
                          hour < this.config.workHours.end;
        
        // 只在工作时间关怀
        if (!isWorkTime) return false;
        
        // 静默超过阈值
        if (silenceTime < this.config.silenceThreshold) return false;
        
        // 距离上次关怀超过间隔
        if (this.lastCare && (now - this.lastCare) < this.config.careInterval) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 主动思考
     */
    async think() {
        this.lastThought = Date.now();
        console.log('[Heartbeat] 主动思考中...');
        
        try {
            // 思考内容
            const thoughts = [];
            
            // 1. 检查是否有待办事项
            if (this.contextEngine) {
                const todos = await this.contextEngine.recall('待办', 3);
                if (todos.length > 0) {
                    thoughts.push({
                        type: 'todo_reminder',
                        content: '你有未完成的待办事项',
                        items: todos
                    });
                }
            }
            
            // 2. 检查是否有重要日期
            const today = new Date();
            const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
            if (this.contextEngine) {
                const importantDates = await this.contextEngine.recall(dateStr, 2);
                if (importantDates.length > 0) {
                    thoughts.push({
                        type: 'date_reminder',
                        content: '今天有重要事件',
                        items: importantDates
                    });
                }
            }
            
            // 3. 生成思考结果
            if (thoughts.length > 0) {
                this.emit('thought', {
                    thoughts,
                    timestamp: this.lastThought
                });
                
                console.log('[Heartbeat] 思考结果:', thoughts);
            }
            
        } catch (error) {
            console.error('[Heartbeat] 思考出错:', error.message);
        }
    }
    
    /**
     * 主动关怀
     */
    async care() {
        this.lastCare = Date.now();
        console.log('[Heartbeat] 主动关怀...');
        
        const hour = new Date().getHours();
        let careMessage = '';
        
        // 根据时间段生成关怀消息
        if (hour >= 9 && hour < 12) {
            careMessage = '早上好！今天有什么计划吗？需要我帮你安排什么吗？';
        } else if (hour >= 12 && hour < 14) {
            careMessage = '中午了，记得休息一下，吃个午饭~';
        } else if (hour >= 14 && hour < 18) {
            careMessage = '下午好！工作累了吗？要不要聊聊天放松一下？';
        } else if (hour >= 18 && hour < 22) {
            careMessage = '晚上好！今天过得怎么样？有什么想分享的吗？';
        }
        
        // 发出关怀事件
        this.emit('care', {
            message: careMessage,
            timestamp: this.lastCare,
            silenceTime: Date.now() - this.lastUserActivity
        });
        
        console.log('[Heartbeat] 关怀消息:', careMessage);
    }
    
    /**
     * 用户活动记录
     */
    recordActivity() {
        this.lastUserActivity = Date.now();
        this.emit('activity', { timestamp: this.lastUserActivity });
    }
    
    /**
     * 添加后台任务
     */
    addTask(task) {
        this.taskQueue.push({
            ...task,
            id: `task_${Date.now()}`,
            createdAt: Date.now(),
            status: 'pending'
        });
        
        console.log(`[Heartbeat] 添加任务: ${task.name}`);
        this.emit('task_added', task);
    }
    
    /**
     * 处理任务队列
     */
    async processTasks() {
        if (this.taskQueue.length === 0) return;
        
        const task = this.taskQueue[0];
        if (task.status !== 'pending') return;
        
        console.log(`[Heartbeat] 处理任务: ${task.name}`);
        
        try {
            task.status = 'running';
            task.startedAt = Date.now();
            
            // 执行任务
            if (task.execute) {
                const result = await task.execute();
                task.result = result;
                task.status = 'completed';
            }
            
            // 移动到完成队列
            this.completedTasks.push(this.taskQueue.shift());
            this.emit('task_completed', task);
            
        } catch (error) {
            task.status = 'failed';
            task.error = error.message;
            this.emit('task_failed', task);
            console.error(`[Heartbeat] 任务失败: ${error.message}`);
        }
    }
    
    /**
     * 获取状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastUserActivity: this.lastUserActivity,
            lastThought: this.lastThought,
            lastCare: this.lastCare,
            silenceTime: Date.now() - this.lastUserActivity,
            pendingTasks: this.taskQueue.length,
            completedTasks: this.completedTasks.length,
            config: this.config
        };
    }
}

module.exports = HeartbeatService;
