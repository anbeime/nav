/**
 * ContextEngine - StarClaw 记忆系统核心模块
 * 
 * 功能：
 * 1. 多级记忆管理（工作记忆、会话记忆、长期记忆）
 * 2. SQLite 结构化存储（使用 sql.js 纯 JavaScript 实现）
 * 3. 向量语义搜索（支持本地嵌入模型）
 * 4. 知识库集成
 * 5. 记忆压缩与遗忘机制
 * 
 * 架构：
 * ┌─────────────────────────────────────────────────────┐
 * │                   ContextEngine                     │
 * ├──────────────┬──────────────┬──────────────────────┤
 * │ WorkingMemory│SessionMemory│  LongTermMemory      │
 * │   (临时)      │  (会话级)    │   (持久化)           │
 * └──────────────┴──────────────┴──────────────────────┘
 *                           │
 *              ┌────────────┼────────────┐
 *              ▼            ▼            ▼
 *         SQLite DB    VectorStore   KnowledgeBase
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ==================== 配置 ====================

const DEFAULT_CONFIG = {
    // 数据库路径
    dbPath: './data/context.db',
    
    // 记忆限制
    workingMemoryLimit: 10,      // 工作记忆条数
    sessionMemoryLimit: 50,      // 会话记忆条数
    longTermMemoryLimit: 1000,   // 长期记忆条数
    
    // 向量配置
    embeddingDimension: 384,     // 使用小型嵌入模型
    similarityThreshold: 0.7,    // 相似度阈值
    
    // 遗忘机制
    forgetThreshold: 30,         // 30天未访问自动归档
    compressionInterval: 3600000, // 1小时压缩一次
    
    // 知识库路径
    knowledgePath: './knowledge'
};

// ==================== 向量存储（轻量级实现）====================

class SimpleVectorStore {
    /**
     * 简单的向量存储实现
     * 使用内存 + 文件持久化，支持余弦相似度搜索
     */
    constructor(storePath) {
        this.storePath = storePath;
        this.vectors = new Map(); // id -> { vector, metadata }
        this.index = [];          // 快速搜索索引
        this.load();
    }
    
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
    
    save() {
        try {
            const dir = path.dirname(this.storePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = {
                vectors: Array.from(this.vectors.entries()),
                index: this.index
            };
            fs.writeFileSync(this.storePath, JSON.stringify(data), 'utf-8');
        } catch (e) {
            console.error('[VectorStore] 保存失败:', e.message);
        }
    }
    
    /**
     * 简单文本嵌入（基于特征哈希）
     * 注意：生产环境建议使用专门的嵌入模型
     */
    embed(text) {
        const dimension = DEFAULT_CONFIG.embeddingDimension;
        const vector = new Float32Array(dimension);
        
        // 简单的词频特征 + 位置编码
        const words = text.toLowerCase().split(/\s+/);
        words.forEach((word, i) => {
            const hash = this.hashWord(word);
            const pos = i % dimension;
            vector[pos] += hash;
        });
        
        // 归一化
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] /= norm;
            }
        }
        
        return vector;
    }
    
    hashWord(word) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash) % 100 / 100 - 0.5; // 归一化到 [-0.5, 0.5]
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
     * 添加向量
     */
    add(id, text, metadata = {}) {
        const vector = this.embed(text);
        this.vectors.set(id, { vector, text, metadata, timestamp: Date.now() });
        this.index.push(id);
        this.save();
        return id;
    }
    
    /**
     * 搜索相似内容
     */
    search(query, topK = 5) {
        const queryVector = this.embed(query);
        const results = [];
        
        for (const [id, data] of this.vectors) {
            const similarity = this.cosineSimilarity(queryVector, data.vector);
            if (similarity >= DEFAULT_CONFIG.similarityThreshold) {
                results.push({
                    id,
                    text: data.text,
                    metadata: data.metadata,
                    similarity
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
        this.vectors.delete(id);
        this.index = this.index.filter(i => i !== id);
        this.save();
    }
    
    /**
     * 清空所有向量
     */
    clear() {
        this.vectors.clear();
        this.index = [];
        this.save();
    }
    
    getStats() {
        return {
            totalVectors: this.vectors.size,
            indexSize: this.index.length
        };
    }
}

// ==================== 工作记忆 ====================

class WorkingMemory {
    /**
     * 工作记忆 - 当前对话的临时记忆
     * 容量有限，快速访问，自动淘汰
     */
    constructor(limit = 10) {
        this.limit = limit;
        this.memory = [];
    }
    
    add(item) {
        this.memory.push({
            ...item,
            timestamp: Date.now()
        });
        
        // 超出限制时移除最旧的
        while (this.memory.length > this.limit) {
            this.memory.shift();
        }
    }
    
    getRecent(n = 5) {
        return this.memory.slice(-n);
    }
    
    getAll() {
        return [...this.memory];
    }
    
    clear() {
        this.memory = [];
    }
    
    search(query) {
        const queryLower = query.toLowerCase();
        return this.memory.filter(item => 
            (item.content && item.content.toLowerCase().includes(queryLower)) ||
            (item.role && item.role.toLowerCase().includes(queryLower))
        );
    }
}

// ==================== 数据库帮助函数（sql.js）====================

/**
 * 执行 SQL 并返回结果
 */
function runSQL(db, sql, params = []) {
    try {
        db.run(sql, params);
        return { success: true };
    } catch (e) {
        console.error('[SQL] 执行失败:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 查询 SQL 并返回所有结果
 */
function queryAll(db, sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(row);
        }
        stmt.free();
        return results;
    } catch (e) {
        console.error('[SQL] 查询失败:', e.message);
        return [];
    }
}

/**
 * 查询 SQL 并返回单个结果
 */
function queryOne(db, sql, params = []) {
    const results = queryAll(db, sql, params);
    return results.length > 0 ? results[0] : null;
}

// ==================== 会话记忆 ====================

class SessionMemory {
    /**
     * 会话记忆 - 当前会话的完整上下文
     * 持久化到 SQLite（sql.js）
     */
    constructor(db) {
        this.db = db;
        this.cache = new Map(); // sessionId -> messages
    }
    
    async addMessage(sessionId, message) {
        // 更新缓存
        if (!this.cache.has(sessionId)) {
            this.cache.set(sessionId, []);
        }
        this.cache.get(sessionId).push(message);
        
        // 持久化到数据库
        const sql = `INSERT INTO session_messages (session_id, role, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?)`;
        runSQL(this.db, sql, [
            sessionId, 
            message.role, 
            message.content, 
            JSON.stringify(message.metadata || {}), 
            Date.now()
        ]);
        
        return true;
    }
    
    async getMessages(sessionId, limit = 50) {
        // 先查缓存
        if (this.cache.has(sessionId)) {
            const cached = this.cache.get(sessionId);
            return cached.slice(-limit);
        }
        
        // 从数据库加载
        const sql = `SELECT * FROM session_messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?`;
        const rows = queryAll(this.db, sql, [sessionId, limit]);
        
        const messages = rows.reverse().map(row => ({
            role: row.role,
            content: row.content,
            metadata: JSON.parse(row.metadata || '{}'),
            timestamp: row.timestamp
        }));
        this.cache.set(sessionId, messages);
        return messages;
    }
    
    async clearSession(sessionId) {
        this.cache.delete(sessionId);
        runSQL(this.db, 'DELETE FROM session_messages WHERE session_id = ?', [sessionId]);
        return true;
    }
    
    async getAllSessions() {
        const sql = `
            SELECT session_id, COUNT(*) as message_count, 
                   MIN(timestamp) as first_message, 
                   MAX(timestamp) as last_message
            FROM session_messages 
            GROUP BY session_id 
            ORDER BY last_message DESC
        `;
        return queryAll(this.db, sql, []);
    }
}

// ==================== 长期记忆 ====================

class LongTermMemory {
    /**
     * 长期记忆 - 跨会话的持久化记忆
     * 支持重要信息提取、向量化存储、语义检索
     */
    constructor(db, vectorStore, saveDbCallback) {
        this.db = db;
        this.vectorStore = vectorStore;
        this.saveDb = saveDbCallback;
    }
    
    /**
     * 存储记忆
     */
    async remember(content, metadata = {}) {
        const memoryId = `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        
        // 存入向量库
        this.vectorStore.add(memoryId, content, {
            ...metadata,
            type: metadata.type || 'general'
        });
        
        // 存入数据库
        const sql = `INSERT INTO long_term_memory (id, content, metadata, importance, created_at, last_accessed) VALUES (?, ?, ?, ?, ?, ?)`;
        runSQL(this.db, sql, [
            memoryId, 
            content, 
            JSON.stringify(metadata), 
            metadata.importance || 0.5, 
            Date.now(), 
            Date.now()
        ]);
        
        // 保存数据库文件
        if (this.saveDb) this.saveDb();
        
        return memoryId;
    }
    
    /**
     * 语义搜索记忆
     */
    async recall(query, limit = 5) {
        // 向量搜索
        const vectorResults = this.vectorStore.search(query, limit * 2);
        
        if (vectorResults.length === 0) {
            return [];
        }
        
        // 获取详细信息
        const ids = vectorResults.map(r => r.id);
        const placeholders = ids.map(() => '?').join(',');
        const sql = `SELECT * FROM long_term_memory WHERE id IN (${placeholders})`;
        const rows = queryAll(this.db, sql, ids);
        
        // 更新访问时间
        runSQL(this.db, `UPDATE long_term_memory SET last_accessed = ? WHERE id IN (${placeholders})`, [Date.now(), ...ids]);
        if (this.saveDb) this.saveDb();
        
        // 合并向量相似度和数据库记录
        const results = rows.map(row => {
            const vectorResult = vectorResults.find(v => v.id === row.id);
            return {
                id: row.id,
                content: row.content,
                metadata: JSON.parse(row.metadata || '{}'),
                importance: row.importance,
                similarity: vectorResult?.similarity || 0,
                createdAt: row.created_at,
                lastAccessed: row.last_accessed
            };
        });
        
        // 按相似度排序
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, limit);
    }
    
    /**
     * 获取重要记忆
     */
    async getImportant(limit = 10) {
        const sql = `SELECT * FROM long_term_memory WHERE importance >= 0.7 ORDER BY importance DESC, last_accessed DESC LIMIT ?`;
        const rows = queryAll(this.db, sql, [limit]);
        
        return rows.map(row => ({
            id: row.id,
            content: row.content,
            metadata: JSON.parse(row.metadata || '{}'),
            importance: row.importance
        }));
    }
    
    /**
     * 遗忘机制 - 归档过期记忆
     */
    async archiveOldMemories(daysThreshold = 30) {
        const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
        const sql = `UPDATE long_term_memory SET archived = 1 WHERE last_accessed < ? AND archived = 0 AND importance < 0.5`;
        runSQL(this.db, sql, [threshold]);
        if (this.saveDb) this.saveDb();
        
        // 返回影响的行数（简化版）
        return 0;
    }
    
    /**
     * 手动遗忘
     */
    async forget(memoryId) {
        this.vectorStore.delete(memoryId);
        runSQL(this.db, 'DELETE FROM long_term_memory WHERE id = ?', [memoryId]);
        if (this.saveDb) this.saveDb();
        return true;
    }
}

// ==================== 知识库集成 ====================

class KnowledgeBase {
    /**
     * 知识库管理 - 加载和管理外部知识
     */
    constructor(db, vectorStore, knowledgePath, saveDbCallback) {
        this.db = db;
        this.vectorStore = vectorStore;
        this.knowledgePath = knowledgePath;
        this.saveDb = saveDbCallback;
        this.loadedFiles = new Set();
    }
    
    /**
     * 加载知识库文件
     */
    async loadKnowledge() {
        if (!fs.existsSync(this.knowledgePath)) {
            console.log('[KnowledgeBase] 知识库目录不存在');
            return;
        }
        
        const files = fs.readdirSync(this.knowledgePath).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
            if (this.loadedFiles.has(file)) continue;
            
            try {
                const filePath = path.join(this.knowledgePath, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                
                // 分割成段落
                const chunks = this.chunkContent(content, file);
                
                for (const chunk of chunks) {
                    const knowledgeId = `kb_${file}_${chunk.index}`;
                    await this.addKnowledge(knowledgeId, chunk.content, {
                        source: file,
                        type: 'knowledge',
                        chunkIndex: chunk.index
                    });
                }
                
                this.loadedFiles.add(file);
                console.log(`[KnowledgeBase] 已加载: ${file} (${chunks.length} 段)`);
            } catch (e) {
                console.error(`[KnowledgeBase] 加载失败 ${file}:`, e.message);
            }
        }
    }
    
    /**
     * 内容分块
     */
    chunkContent(content, filename) {
        const chunks = [];
        const lines = content.split('\n');
        let currentChunk = [];
        let chunkIndex = 0;
        
        for (const line of lines) {
            currentChunk.push(line);
            
            // 按段落或标题分割
            if (line.trim() === '' || line.startsWith('#')) {
                if (currentChunk.length > 3) {
                    chunks.push({
                        content: currentChunk.join('\n').trim(),
                        index: chunkIndex++
                    });
                    currentChunk = [];
                }
            }
        }
        
        // 最后一块
        if (currentChunk.length > 0) {
            chunks.push({
                content: currentChunk.join('\n').trim(),
                index: chunkIndex
            });
        }
        
        return chunks;
    }
    
    /**
     * 添加知识条目
     */
    async addKnowledge(id, content, metadata = {}) {
        // 向量化
        this.vectorStore.add(id, content, metadata);
        
        // 存入数据库
        const sql = `INSERT OR REPLACE INTO knowledge_base (id, content, source, metadata, updated_at) VALUES (?, ?, ?, ?, ?)`;
        runSQL(this.db, sql, [
            id, 
            content, 
            metadata.source || 'unknown', 
            JSON.stringify(metadata), 
            Date.now()
        ]);
        
        if (this.saveDb) this.saveDb();
        return id;
    }
    
    /**
     * 搜索知识
     */
    async search(query, limit = 5) {
        return this.vectorStore.search(query, limit);
    }
}

// ==================== ContextEngine 主类 ====================

class ContextEngine {
    /**
     * StarClaw 记忆系统核心引擎
     * 整合所有记忆模块，提供统一接口
     */
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // 初始化组件
        this.db = null;
        this.vectorStore = null;
        this.workingMemory = null;
        this.sessionMemory = null;
        this.longTermMemory = null;
        this.knowledgeBase = null;
        this.dbPath = null;
        
        this.initialized = false;
    }
    
    /**
     * 初始化引擎
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('[ContextEngine] 初始化记忆系统...');
        
        // 初始化 sql.js
        const SQL = await initSqlJs();
        
        // 确保数据目录存在
        this.dbPath = this.config.dbPath;
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // 尝试加载现有数据库
        if (fs.existsSync(this.dbPath)) {
            const buffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
            console.log('[ContextEngine] 已加载现有数据库');
        } else {
            this.db = new SQL.Database();
            console.log('[ContextEngine] 创建新数据库');
        }
        
        // 创建表
        this.initDatabase();
        
        // 初始化向量存储
        const vectorStorePath = path.join(dbDir, 'vectors.json');
        this.vectorStore = new SimpleVectorStore(vectorStorePath);
        
        // 保存数据库的回调函数
        const saveDbCallback = () => this.saveDatabase();
        
        // 初始化记忆模块
        this.workingMemory = new WorkingMemory(this.config.workingMemoryLimit);
        this.sessionMemory = new SessionMemory(this.db);
        this.longTermMemory = new LongTermMemory(this.db, this.vectorStore, saveDbCallback);
        this.knowledgeBase = new KnowledgeBase(this.db, this.vectorStore, this.config.knowledgePath, saveDbCallback);
        
        // 加载知识库
        await this.knowledgeBase.loadKnowledge();
        
        // 启动压缩任务
        this.startCompressionTask();
        
        this.initialized = true;
        console.log('[ContextEngine] 初始化完成');
    }
    
    /**
     * 保存数据库到文件
     */
    saveDatabase() {
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (e) {
            console.error('[ContextEngine] 保存数据库失败:', e.message);
        }
    }
    
    /**
     * 初始化数据库表
     */
    initDatabase() {
        // 创建表
        this.db.run(`
            CREATE TABLE IF NOT EXISTS session_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                timestamp INTEGER
            )
        `);
        
        this.db.run(`
            CREATE TABLE IF NOT EXISTS long_term_memory (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                metadata TEXT,
                importance REAL DEFAULT 0.5,
                archived INTEGER DEFAULT 0,
                created_at INTEGER,
                last_accessed INTEGER
            )
        `);
        
        this.db.run(`
            CREATE TABLE IF NOT EXISTS knowledge_base (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                source TEXT,
                metadata TEXT,
                updated_at INTEGER
            )
        `);
        
        this.db.run(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id TEXT PRIMARY KEY,
                preferences TEXT,
                updated_at INTEGER
            )
        `);
        
        // 创建索引
        try {
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id, timestamp)`);
        } catch (e) {
            // 索引可能已存在
        }
        
        // 保存初始数据库
        this.saveDatabase();
        console.log('[ContextEngine] 数据库表创建完成');
    }
    
    /**
     * 启动记忆压缩任务
     */
    startCompressionTask() {
        // 定期归档旧记忆
        this.compressionTimer = setInterval(async () => {
            try {
                const archived = await this.longTermMemory.archiveOldMemories(this.config.forgetThreshold);
                if (archived > 0) {
                    console.log(`[ContextEngine] 归档了 ${archived} 条旧记忆`);
                }
            } catch (e) {
                console.error('[ContextEngine] 归档任务失败:', e.message);
            }
        }, this.config.compressionInterval);
    }
    
    // ==================== 公共 API ====================
    
    /**
     * 记住消息（工作记忆 + 会话记忆）
     */
    async rememberMessage(sessionId, message) {
        // 工作记忆
        this.workingMemory.add({
            sessionId,
            role: message.role,
            content: message.content
        });
        
        // 会话记忆
        await this.sessionMemory.addMessage(sessionId, message);
        
        // 如果是重要信息，存入长期记忆
        if (this.isImportant(message)) {
            await this.longTermMemory.remember(message.content, {
                sessionId,
                role: message.role,
                type: 'conversation',
                importance: this.calculateImportance(message)
            });
        }
    }
    
    /**
     * 判断是否重要信息
     */
    isImportant(message) {
        const importantKeywords = [
            '记住', '记住我', '我喜欢', '我讨厌', '我的名字', '我的生日',
            '重要', '关键', '一定要', '别忘了', '记得',
            '偏好', '习惯', '设置', '配置'
        ];
        
        return importantKeywords.some(keyword => 
            message.content.includes(keyword)
        );
    }
    
    /**
     * 计算重要性分数
     */
    calculateImportance(message) {
        let score = 0.5;
        
        // 包含用户偏好
        if (message.content.includes('我喜欢') || message.content.includes('我讨厌')) {
            score += 0.2;
        }
        
        // 用户明确要求记住
        if (message.content.includes('记住') || message.content.includes('别忘了')) {
            score += 0.3;
        }
        
        // 较长的消息
        if (message.content.length > 100) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    }
    
    /**
     * 获取上下文（用于 AI 对话）
     */
    async getContext(sessionId, query, options = {}) {
        const {
            includeWorking = true,
            includeSession = true,
            includeLongTerm = true,
            includeKnowledge = true,
            maxContextSize = 4000
        } = options;
        
        const context = {
            working: [],
            session: [],
            longTerm: [],
            knowledge: []
        };
        
        let totalSize = 0;
        
        // 工作记忆
        if (includeWorking) {
            context.working = this.workingMemory.getRecent(5);
            totalSize += JSON.stringify(context.working).length;
        }
        
        // 会话记忆
        if (includeSession && sessionId) {
            context.session = await this.sessionMemory.getMessages(sessionId, 10);
            totalSize += JSON.stringify(context.session).length;
        }
        
        // 长期记忆（语义搜索）
        if (includeLongTerm && query && totalSize < maxContextSize * 0.5) {
            context.longTerm = await this.longTermMemory.recall(query, 3);
            totalSize += JSON.stringify(context.longTerm).length;
        }
        
        // 知识库搜索
        if (includeKnowledge && query && totalSize < maxContextSize * 0.7) {
            context.knowledge = await this.knowledgeBase.search(query, 2);
            totalSize += JSON.stringify(context.knowledge).length;
        }
        
        return context;
    }
    
    /**
     * 格式化上下文为提示词
     */
    formatContextForPrompt(context) {
        const parts = [];
        
        // 长期记忆（用户偏好、重要信息）
        if (context.longTerm && context.longTerm.length > 0) {
            parts.push('【关于用户的重要信息】');
            context.longTerm.forEach(mem => {
                parts.push(`- ${mem.content}`);
            });
        }
        
        // 会话历史
        if (context.session && context.session.length > 0) {
            parts.push('\n【对话历史】');
            context.session.forEach(msg => {
                const role = msg.role === 'user' ? '用户' : '助手';
                parts.push(`${role}: ${msg.content}`);
            });
        }
        
        // 知识库参考
        if (context.knowledge && context.knowledge.length > 0) {
            parts.push('\n【相关知识】');
            context.knowledge.forEach(kb => {
                parts.push(`[${kb.metadata?.source || '知识库'}] ${kb.text?.substring(0, 200)}...`);
            });
        }
        
        return parts.join('\n');
    }
    
    /**
     * 手动添加长期记忆
     */
    async remember(content, metadata = {}) {
        return this.longTermMemory.remember(content, metadata);
    }
    
    /**
     * 搜索记忆
     */
    async recall(query, limit = 5) {
        return this.longTermMemory.recall(query, limit);
    }
    
    /**
     * 遗忘
     */
    async forget(memoryId) {
        return this.longTermMemory.forget(memoryId);
    }
    
    /**
     * 清除会话
     */
    async clearSession(sessionId) {
        this.workingMemory.clear();
        return this.sessionMemory.clearSession(sessionId);
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            working: {
                count: this.workingMemory.memory.length,
                limit: this.workingMemory.limit
            },
            vector: this.vectorStore.getStats(),
            knowledge: {
                loadedFiles: this.knowledgeBase.loadedFiles.size
            }
        };
    }
    
    /**
     * 关闭引擎
     */
    close() {
        if (this.compressionTimer) {
            clearInterval(this.compressionTimer);
        }
        if (this.db) {
            this.saveDatabase();
            this.db.close();
        }
    }
}

// ==================== 导出 ====================

module.exports = {
    ContextEngine,
    WorkingMemory,
    SessionMemory,
    LongTermMemory,
    KnowledgeBase,
    SimpleVectorStore
};
