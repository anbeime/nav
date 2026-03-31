/**
 * StarClaw 向量嵌入服务 v1.0
 * 
 * 支持多种嵌入提供商：
 * 1. Ollama（本地，推荐）- nomic-embed-text, bge-m3
 * 2. 智谱 AI（云端）- embedding-2
 * 3. 简化实现（降级）- 特征哈希
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// ==================== 嵌入提供商基类 ====================

class EmbeddingProvider {
    constructor(config) {
        this.config = config;
        this.dimension = 384; // 默认维度
    }
    
    async embed(text) {
        throw new Error('embed() 必须由子类实现');
    }
    
    async embedBatch(texts) {
        return Promise.all(texts.map(t => this.embed(t)));
    }
    
    getDimension() {
        return this.dimension;
    }
}

// ==================== Ollama 嵌入（推荐）====================

class OllamaEmbedding extends EmbeddingProvider {
    constructor(config) {
        super(config);
        this.baseUrl = config.baseUrl || 'http://127.0.0.1:11434';
        this.model = config.model || 'nomic-embed-text';
        this.dimension = 768; // nomic-embed-text 维度
        this.timeout = config.timeout || 30000;
    }
    
    async embed(text) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/embeddings`,
                {
                    model: this.model,
                    prompt: text
                },
                { timeout: this.timeout }
            );
            
            return Float32Array.from(response.data.embedding);
        } catch (error) {
            console.error('[OllamaEmbedding] 嵌入失败:', error.message);
            throw error;
        }
    }
    
    async isAvailable() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}

// ==================== 智谱 AI 嵌入 ====================

class ZhipuEmbedding extends EmbeddingProvider {
    constructor(config) {
        super(config);
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
        this.model = config.model || 'embedding-2';
        this.dimension = 1024; // embedding-2 维度
        this.timeout = config.timeout || 30000;
    }
    
    async embed(text) {
        if (!this.apiKey) {
            throw new Error('ZHIPU_API_KEY 未配置');
        }
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/embeddings`,
                {
                    model: this.model,
                    input: text
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout
                }
            );
            
            return Float32Array.from(response.data.data[0].embedding);
        } catch (error) {
            console.error('[ZhipuEmbedding] 嵌入失败:', error.message);
            throw error;
        }
    }
}

// ==================== 简化嵌入（降级方案）====================

class SimpleEmbedding extends EmbeddingProvider {
    constructor(config) {
        super(config);
        this.dimension = config.dimension || 384;
    }
    
    /**
     * 基于特征哈希的简单嵌入
     * 注意：效果有限，仅作为降级方案
     */
    embed(text) {
        const vector = new Float32Array(this.dimension);
        
        // 中文分词（简单实现）
        const words = this.tokenize(text);
        
        words.forEach((word, i) => {
            // 多位置哈希
            const hash1 = this.hashWord(word);
            const hash2 = this.hashWord(word + '_pos_' + i);
            
            const pos1 = Math.abs(hash1) % this.dimension;
            const pos2 = Math.abs(hash2) % this.dimension;
            
            vector[pos1] += hash1 > 0 ? 1 : -1;
            vector[pos2] += hash2 > 0 ? 0.5 : -0.5;
        });
        
        // 归一化
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] /= norm;
            }
        }
        
        return Promise.resolve(vector);
    }
    
    /**
     * 简单分词（支持中英文）
     */
    tokenize(text) {
        const tokens = [];
        
        // 提取英文单词
        const englishWords = text.toLowerCase().match(/[a-z]+/g) || [];
        tokens.push(...englishWords);
        
        // 提取中文词组（2-4字）
        const chineseChars = text.match(/[\u4e00-\u9fa5]+/g) || [];
        chineseChars.forEach(segment => {
            // 单字
            for (let i = 0; i < segment.length; i++) {
                tokens.push(segment[i]);
            }
            // 双字词
            for (let i = 0; i < segment.length - 1; i++) {
                tokens.push(segment.substring(i, i + 2));
            }
            // 三字词
            for (let i = 0; i < segment.length - 2; i++) {
                tokens.push(segment.substring(i, i + 3));
            }
        });
        
        return tokens;
    }
    
    /**
     * 词哈希函数
     */
    hashWord(word) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}

// ==================== 智能嵌入服务 ====================

class EmbeddingService {
    constructor(config = {}) {
        this.config = config;
        this.provider = null;
        this.providerName = 'none';
        
        this.initProvider();
    }
    
    /**
     * 初始化嵌入提供商（自动选择最优）
     */
    async initProvider() {
        // 优先级：Ollama > 智谱 AI > 简化实现
        
        // 尝试 Ollama
        if (this.config.ollama?.enabled !== false) {
            const ollama = new OllamaEmbedding(this.config.ollama || {});
            if (await ollama.isAvailable()) {
                this.provider = ollama;
                this.providerName = 'ollama';
                console.log(`[Embedding] 使用 Ollama (${ollama.model})`);
                return;
            }
        }
        
        // 尝试智谱 AI
        if (this.config.zhipu?.apiKey) {
            this.provider = new ZhipuEmbedding(this.config.zhipu);
            this.providerName = 'zhipu';
            console.log('[Embedding] 使用智谱 AI');
            return;
        }
        
        // 降级到简化实现
        this.provider = new SimpleEmbedding(this.config.simple || {});
        this.providerName = 'simple';
        console.log('[Embedding] 使用简化嵌入（降级模式）');
    }
    
    /**
     * 获取文本嵌入
     */
    async embed(text) {
        if (!this.provider) {
            await this.initProvider();
        }
        return this.provider.embed(text);
    }
    
    /**
     * 批量嵌入
     */
    async embedBatch(texts) {
        if (!this.provider) {
            await this.initProvider();
        }
        return this.provider.embedBatch(texts);
    }
    
    /**
     * 计算余弦相似度
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    /**
     * 获取当前提供商信息
     */
    getProviderInfo() {
        return {
            name: this.providerName,
            dimension: this.provider?.getDimension() || 0,
            available: this.provider !== null
        };
    }
}

// ==================== 向量存储（改进版）====================

class VectorStore {
    constructor(config = {}) {
        this.storePath = config.storePath || path.join(__dirname, '../data/vectors.json');
        this.embeddingService = new EmbeddingService(config.embedding || {});
        
        this.vectors = new Map(); // id -> { vector, metadata, text }
        this.index = [];          // 快速搜索索引
        
        this.load();
    }
    
    /**
     * 从文件加载
     */
    load() {
        try {
            if (fs.existsSync(this.storePath)) {
                const data = JSON.parse(fs.readFileSync(this.storePath, 'utf-8'));
                this.vectors = new Map(data.vectors || []);
                this.index = data.index || [];
                console.log(`[VectorStore] 已加载 ${this.vectors.size} 个向量`);
            }
        } catch (e) {
            console.log('[VectorStore] 创建新的向量存储');
        }
    }
    
    /**
     * 保存到文件
     */
    save() {
        try {
            const dir = path.dirname(this.storePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const data = {
                vectors: Array.from(this.vectors.entries()),
                index: this.index,
                metadata: {
                    savedAt: new Date().toISOString(),
                    count: this.vectors.size,
                    dimension: this.embeddingService.getProviderInfo().dimension
                }
            };
            
            fs.writeFileSync(this.storePath, JSON.stringify(data), 'utf-8');
        } catch (e) {
            console.error('[VectorStore] 保存失败:', e.message);
        }
    }
    
    /**
     * 添加向量
     */
    async add(id, text, metadata = {}) {
        const vector = await this.embeddingService.embed(text);
        
        this.vectors.set(id, {
            vector: Array.from(vector),
            metadata,
            text,
            createdAt: new Date().toISOString()
        });
        
        this.index.push(id);
        this.save();
        
        return { id, dimension: vector.length };
    }
    
    /**
     * 批量添加
     */
    async addBatch(items) {
        const results = [];
        for (const item of items) {
            const result = await this.add(item.id, item.text, item.metadata);
            results.push(result);
        }
        return results;
    }
    
    /**
     * 搜索相似向量
     */
    async search(query, topK = 5, threshold = 0.7) {
        const queryVector = await this.embeddingService.embed(query);
        const results = [];
        
        for (const [id, data] of this.vectors) {
            const similarity = this.embeddingService.cosineSimilarity(
                queryVector,
                Float32Array.from(data.vector)
            );
            
            if (similarity >= threshold) {
                results.push({
                    id,
                    similarity,
                    text: data.text,
                    metadata: data.metadata
                });
            }
        }
        
        // 按相似度排序
        results.sort((a, b) => b.similarity - a.similarity);
        
        return results.slice(0, topK);
    }
    
    /**
     * 删除向量
     */
    delete(id) {
        if (this.vectors.has(id)) {
            this.vectors.delete(id);
            this.index = this.index.filter(i => i !== id);
            this.save();
            return true;
        }
        return false;
    }
    
    /**
     * 清空存储
     */
    clear() {
        this.vectors.clear();
        this.index = [];
        this.save();
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            count: this.vectors.size,
            dimension: this.embeddingService.getProviderInfo().dimension,
            provider: this.embeddingService.getProviderInfo(),
            storePath: this.storePath
        };
    }
}

// 导出
module.exports = {
    EmbeddingService,
    VectorStore,
    OllamaEmbedding,
    ZhipuEmbedding,
    SimpleEmbedding
};
