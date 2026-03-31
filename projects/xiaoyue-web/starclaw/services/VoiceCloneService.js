/**
 * VoiceCloneService - 音色克隆服务
 * 
 * 支持多种音色克隆方案：
 * 1. GPT-SoVITS (本地部署) - 5秒样本即可克隆
 * 2. 飞影数字人 API (flyworks.ai)
 * 3. OpenClaw 数字人技能集成
 * 
 * 使用方式：
 * - 上传音频样本 -> 训练/克隆 -> 使用克隆音色合成语音
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ==================== 配置 ====================

const DEFAULT_CONFIG = {
    // GPT-SoVITS 配置
    gptSoVITS: {
        enabled: true,
        baseUrl: 'http://127.0.0.1:9880',
        defaultModel: null,
        modelsPath: path.join(__dirname, '..', 'data', 'voice-models')
    },
    
    // 飞影数字人 API
    flyworks: {
        enabled: false,
        apiKey: process.env.FLYWORKS_API_KEY || '',
        baseUrl: 'https://api.flyworks.ai'
    },
    
    // 音频存储路径
    audioStoragePath: path.join(__dirname, '..', 'data', 'voice-samples'),
    
    // 克隆音色数据库
    voicesDbPath: path.join(__dirname, '..', 'data', 'cloned-voices.json')
};

// ==================== GPT-SoVITS API 客户端 ====================

class GPTSoVITSClient {
    constructor(config) {
        this.baseUrl = config.baseUrl || 'http://127.0.0.1:9880';
        this.timeout = 60000;
    }
    
    /**
     * 检查服务是否可用
     */
    async checkHealth() {
        try {
            const res = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
            return { available: true, status: res.data };
        } catch (e) {
            return { available: false, error: e.message };
        }
    }
    
    /**
     * 合成语音
     * @param {string} text - 要合成的文本
     * @param {string} referenceAudio - 参考音频路径或URL
     * @param {string} referenceText - 参考音频对应的文本
     * @param {object} options - 其他选项
     */
    async synthesize(text, referenceAudio, referenceText, options = {}) {
        const payload = {
            text: text,
            text_lang: options.lang || 'zh',
            ref_audio_path: referenceAudio,
            prompt_text: referenceText,
            prompt_lang: options.lang || 'zh',
            text_split_method: options.splitMethod || 'cut5',
            batch_size: options.batchSize || 1,
            speed_factor: options.speed || 1.0,
            top_k: options.topK || 5,
            top_p: options.topP || 1.0,
            temperature: options.temperature || 1.0,
            ...options.extra
        };
        
        try {
            const res = await axios.post(`${this.baseUrl}/tts`, payload, {
                timeout: this.timeout,
                responseType: 'arraybuffer'
            });
            
            // 返回音频数据
            return {
                success: true,
                audioData: res.data,
                format: 'wav'
            };
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }
    
    /**
     * 设置默认参考音频（零样本克隆）
     */
    async setDefaultReference(audioPath, text, lang = 'zh') {
        // 这个方法用于启动时设置默认参考音频
        // GPT-SoVITS API 支持在启动时指定默认参考音频
        console.log(`[GPT-SoVITS] 设置默认参考音频: ${audioPath}`);
    }
    
    /**
     * 切换模型
     */
    async switchModel(gptModel, sovitsModel) {
        try {
            const res = await axios.post(`${this.baseUrl}/set_model`, {
                gpt_model: gptModel,
                sovits_model: sovitsModel
            }, { timeout: 10000 });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    
    /**
     * 获取可用模型列表
     */
    async getModels() {
        try {
            const res = await axios.get(`${this.baseUrl}/models`, { timeout: 5000 });
            return { success: true, models: res.data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

// ==================== 飞影数字人 API 客户端 ====================

class FlyworksClient {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://api.flyworks.ai';
        this.timeout = 120000;
    }
    
    /**
     * 检查服务是否可用
     */
    async checkHealth() {
        if (!this.apiKey) {
            return { available: false, error: '未配置 Flyworks API Key' };
        }
        return { available: true };
    }
    
    /**
     * 克隆声音
     * @param {string} audioUrl - 音频文件URL
     * @param {string} name - 音色名称
     */
    async cloneVoice(audioUrl, name) {
        try {
            const res = await axios.post(`${this.baseUrl}/v1/voice/clone`, {
                audio_url: audioUrl,
                name: name
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout
            });
            
            return {
                success: true,
                voiceId: res.data.voice_id
            };
        } catch (e) {
            return {
                success: false,
                error: e.response?.data?.message || e.message
            };
        }
    }
    
    /**
     * 使用克隆的声音合成语音
     */
    async synthesize(text, voiceId) {
        try {
            const res = await axios.post(`${this.baseUrl}/v1/tts`, {
                text: text,
                voice_id: voiceId
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: this.timeout,
                responseType: 'arraybuffer'
            });
            
            return {
                success: true,
                audioData: res.data,
                format: 'mp3'
            };
        } catch (e) {
            return {
                success: false,
                error: e.response?.data?.message || e.message
            };
        }
    }
    
    /**
     * 生成数字人视频
     * @param {string} text - 文本内容
     * @param {string} avatarId - 数字人形象ID
     * @param {string} voiceId - 声音ID
     */
    async generateDigitalHumanVideo(text, avatarId, voiceId) {
        try {
            const res = await axios.post(`${this.baseUrl}/v1/digital-human/generate`, {
                text: text,
                avatar_id: avatarId,
                voice_id: voiceId
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 180000
            });
            
            return {
                success: true,
                videoUrl: res.data.video_url,
                taskId: res.data.task_id
            };
        } catch (e) {
            return {
                success: false,
                error: e.response?.data?.message || e.message
            };
        }
    }
}

// ==================== 音色克隆服务主类 ====================

class VoiceCloneService {
    constructor(config = {}) {
        // 合并配置，确保有默认值
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            gptSoVITS: {
                ...DEFAULT_CONFIG.gptSoVITS,
                ...(config.gptSoVITS || {})
            },
            flyworks: {
                ...DEFAULT_CONFIG.flyworks,
                ...(config.flyworks || {})
            }
        };
        
        // 初始化客户端
        this.gptSoVITS = new GPTSoVITSClient(this.config.gptSoVITS);
        this.flyworks = new FlyworksClient(this.config.flyworks);
        
        // 克隆音色存储
        this.clonedVoices = new Map();
        
        // 确保目录存在
        this._ensureDirectories();
        
        // 加载已有音色
        this._loadClonedVoices();
    }
    
    /**
     * 确保必要的目录存在
     */
    _ensureDirectories() {
        const dirs = [
            this.config.audioStoragePath,
            this.config.gptSoVITS.modelsPath
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[VoiceClone] 创建目录: ${dir}`);
            }
        });
    }
    
    /**
     * 加载已克隆的音色
     */
    _loadClonedVoices() {
        if (fs.existsSync(this.config.voicesDbPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.config.voicesDbPath, 'utf8'));
                data.forEach(voice => {
                    this.clonedVoices.set(voice.id, voice);
                });
                console.log(`[VoiceClone] 已加载 ${this.clonedVoices.size} 个克隆音色`);
            } catch (e) {
                console.log('[VoiceClone] 加载音色数据失败:', e.message);
            }
        }
    }
    
    /**
     * 保存音色数据
     */
    _saveClonedVoices() {
        const data = Array.from(this.clonedVoices.values());
        fs.writeFileSync(this.config.voicesDbPath, JSON.stringify(data, null, 2));
    }
    
    /**
     * 检查服务状态
     */
    async checkServices() {
        const status = {
            gptSoVITS: await this.gptSoVITS.checkHealth(),
            flyworks: await this.flyworks.checkHealth()
        };
        
        return {
            available: status.gptSoVITS.available || status.flyworks.available,
            services: status,
            clonedVoicesCount: this.clonedVoices.size
        };
    }
    
    /**
     * 上传音频样本
     * @param {Buffer|string} audio - 音频数据或Base64字符串
     * @param {string} name - 音色名称
     * @param {string} transcript - 音频对应的文本（可选）
     */
    async uploadSample(audio, name, transcript = '') {
        const id = `voice_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const audioPath = path.join(this.config.audioStoragePath, `${id}.wav`);
        
        // 处理音频数据
        let audioBuffer;
        if (typeof audio === 'string') {
            // Base64 编码
            audioBuffer = Buffer.from(audio, 'base64');
        } else {
            audioBuffer = audio;
        }
        
        // 保存音频文件
        fs.writeFileSync(audioPath, audioBuffer);
        
        // 如果没有提供文本，尝试使用 ASR 识别
        let text = transcript;
        if (!text) {
            // 可以集成 Whisper 或其他 ASR 服务
            text = '[待标注]';
        }
        
        // 创建音色记录
        const voiceInfo = {
            id,
            name,
            audioPath,
            transcript: text,
            createdAt: new Date().toISOString(),
            status: 'pending' // pending -> ready -> error
        };
        
        this.clonedVoices.set(id, voiceInfo);
        this._saveClonedVoices();
        
        console.log(`[VoiceClone] 上传样本成功: ${name} (${id})`);
        
        return {
            success: true,
            voiceId: id,
            message: '音频样本上传成功，可以使用此样本进行语音合成'
        };
    }
    
    /**
     * 使用克隆音色合成语音
     * @param {string} text - 要合成的文本
     * @param {string} voiceId - 音色ID
     */
    async synthesize(text, voiceId) {
        const voiceInfo = this.clonedVoices.get(voiceId);
        
        if (!voiceInfo) {
            return { success: false, error: '音色不存在' };
        }
        
        // 优先使用 GPT-SoVITS
        if (this.config.gptSoVITS.enabled) {
            const health = await this.gptSoVITS.checkHealth();
            if (health.available) {
                const result = await this.gptSoVITS.synthesize(
                    text,
                    voiceInfo.audioPath,
                    voiceInfo.transcript
                );
                
                if (result.success) {
                    // 保存合成结果
                    const outputPath = path.join(
                        this.config.audioStoragePath,
                        `synthesis_${Date.now()}.wav`
                    );
                    fs.writeFileSync(outputPath, result.audioData);
                    
                    return {
                        success: true,
                        audioPath: outputPath,
                        audioUrl: `/api/voice-clone/audio/${path.basename(outputPath)}`,
                        format: 'wav',
                        engine: 'gpt-sovits'
                    };
                }
            }
        }
        
        // 降级到飞影数字人
        if (this.config.flyworks.enabled && this.config.flyworks.apiKey) {
            // 需要先在飞影平台克隆音色
            // 这里简化处理，实际需要先调用 cloneVoice API
            return {
                success: false,
                error: 'GPT-SoVITS 不可用，请配置飞影数字人 API Key'
            };
        }
        
        return {
            success: false,
            error: '没有可用的音色克隆服务',
            fallback: 'browser'
        };
    }
    
    /**
     * 获取所有克隆音色
     */
    getClonedVoices() {
        return Array.from(this.clonedVoices.values());
    }
    
    /**
     * 获取单个音色信息
     */
    getVoiceInfo(voiceId) {
        return this.clonedVoices.get(voiceId);
    }
    
    /**
     * 删除音色
     */
    deleteVoice(voiceId) {
        const voiceInfo = this.clonedVoices.get(voiceId);
        if (!voiceInfo) {
            return { success: false, error: '音色不存在' };
        }
        
        // 删除音频文件
        if (fs.existsSync(voiceInfo.audioPath)) {
            fs.unlinkSync(voiceInfo.audioPath);
        }
        
        // 从记录中移除
        this.clonedVoices.delete(voiceId);
        this._saveClonedVoices();
        
        return { success: true };
    }
    
    /**
     * 更新音色信息
     */
    updateVoice(voiceId, updates) {
        const voiceInfo = this.clonedVoices.get(voiceId);
        if (!voiceInfo) {
            return { success: false, error: '音色不存在' };
        }
        
        Object.assign(voiceInfo, updates);
        voiceInfo.updatedAt = new Date().toISOString();
        
        this.clonedVoices.set(voiceId, voiceInfo);
        this._saveClonedVoices();
        
        return { success: true, voice: voiceInfo };
    }
    
    /**
     * 从 URL 下载音频样本
     */
    async downloadSample(url, name, transcript = '') {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            return await this.uploadSample(res.data, name, transcript);
        } catch (e) {
            return { success: false, error: `下载失败: ${e.message}` };
        }
    }
    
    /**
     * 从视频中提取音频
     * 需要安装 ffmpeg
     */
    async extractAudioFromVideo(videoPath, name) {
        const audioPath = path.join(
            this.config.audioStoragePath,
            `extracted_${Date.now()}.wav`
        );
        
        try {
            await execPromise(
                `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}" -y`,
                { timeout: 60000 }
            );
            
            const id = `voice_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            const voiceInfo = {
                id,
                name,
                audioPath,
                transcript: '[从视频提取]',
                createdAt: new Date().toISOString(),
                source: 'video',
                sourcePath: videoPath
            };
            
            this.clonedVoices.set(id, voiceInfo);
            this._saveClonedVoices();
            
            return { success: true, voiceId: id };
        } catch (e) {
            return { success: false, error: `音频提取失败: ${e.message}` };
        }
    }
    
    /**
     * 启动 GPT-SoVITS 服务（本地部署）
     */
    async startGPTSoVITS(modelsPath = null) {
        // 这需要用户预先安装 GPT-SoVITS
        // 可以提供启动命令的辅助
        const startCommand = modelsPath
            ? `python api_v2.py -dr "${modelsPath}" -dt "参考文本" -dl "zh"`
            : `python api_v2.py`;
        
        console.log(`[VoiceClone] 启动 GPT-SoVITS 服务: ${startCommand}`);
        
        return {
            success: false,
            message: '请手动启动 GPT-SoVITS 服务',
            command: startCommand,
            downloadUrl: 'https://github.com/RVC-Boss/GPT-SoVITS'
        };
    }
}

// ==================== 导出 ====================

module.exports = {
    VoiceCloneService,
    GPTSoVITSClient,
    FlyworksClient,
    DEFAULT_CONFIG
};
