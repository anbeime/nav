/**
 * StarClaw 龙虾团队控制台 - 前端交互逻辑
 * 与后端 /api/lobster/* API 对接
 */

// ==================== 页面导航 ====================
function sp(page) {
    // 隐藏所有页面
    document.querySelectorAll('.ps').forEach(s => s.classList.remove('on'));
    // 显示目标页面
    const target = document.getElementById('p-' + page);
    if (target) target.classList.add('on');
    
    // 更新导航状态
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const navItem = document.querySelector(`.ni[data-p="${page}"]`);
    if (navItem) navItem.classList.add('on');
    
    // 更新标题
    const titles = {
        dash: ['GEO龙虾 - 团队驾驶舱', '生成式引擎优化 | 7x24小时首席AI流量官'],
        arch: ['五层生存驱动架构', '感知 → 决策 → 执行 → 监控 → 进化'],
        agents: ['智能体成员管理', 'GEO龙虾团队核心成员'],
        chat: ['GEO工作台', '与龙虾团队对话协作'],
        build: ['创建新团队', '通过自然语言构建专业团队'],
        reg: ['全部注册表', '智能体、团队、技能一览'],
        orch: ['资源编排中心', '任务调度与资源匹配']
    };
    
    if (titles[page]) {
        document.getElementById('pt').textContent = titles[page][0];
        document.getElementById('pst').textContent = titles[page][1];
    }
    
    // 页面特定初始化
    if (page === 'dash') loadDashboard();
    if (page === 'agents') loadAgents();
    if (page === 'arch') loadArchitecture();
    if (page === 'reg') loadReg();
    if (page === 'orch') loadOrchestrator();
}

// 导航点击事件
document.querySelectorAll('.ni[data-p]').forEach(item => {
    item.addEventListener('click', () => sp(item.dataset.p));
});

// ==================== 仪表板 ====================
async function loadDashboard() {
    try {
        const res = await fetch('/api/lobster/dashboard');
        const data = await res.json();
        
        if (data.success) {
            const d = data.dashboard;
            // 更新统计卡片（如果需要动态更新）
            console.log('[Dashboard] 团队数据加载成功:', d.geoLobster);
            
            // 加载团队成员预览
            loadAgentPreview(d.geoLobster.members);
        }
    } catch (e) {
        console.error('[Dashboard] 加载失败:', e);
    }
}

function loadAgentPreview(members) {
    const container = document.getElementById('dag');
    if (!container || !members || members.length === 0) return;
    
    // 智能体颜色映射
    const colors = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5'];
    const icons = ['🔍', '🧠', '✏️', '📦', '📊', '🛡️'];
    const names = {
        geo_scout: '龙探探',
        geo_strategist: '龙策策',
        content_engineer: '龙工工',
        source_deployer: '龙部部',
        geo_analyst: '龙分分',
        compliance_officer: '龙规规'
    };
    const roles = {
        geo_scout: 'GEO感知雷达',
        geo_strategist: '策略架构师',
        content_engineer: '内容重构工程师',
        source_deployer: '信源部署专员',
        geo_analyst: '效果监测分析师',
        compliance_officer: '合规风控官'
    };
    
    container.innerHTML = members.map((m, i) => `
        <div class="ac" onclick="sp('agents')">
            <div class="ach">
                <div class="aa ${colors[i % colors.length]}">${icons[i] || '🤖'}</div>
                <div class="ai">
                    <div class="an">${names[m] || m}</div>
                    <div class="ar">${roles[m] || 'GEO专家'}</div>
                </div>
                <div class="sd"></div>
            </div>
            <div class="acb">
                <div class="ad">负责 ${roles[m] || 'GEO优化'} 相关工作</div>
                <div class="ask"><span class="sk">GEO</span><span class="sk">AI优化</span></div>
            </div>
            <div class="acf">
                <span class="asig">geo_lobster 团队</span>
                <button class="smb" onclick="event.stopPropagation();summonAgent('${m}')">召唤</button>
            </div>
        </div>
    `).join('');
}

// ==================== 智能体列表 ====================
async function loadAgents() {
    try {
        const res = await fetch('/api/lobster/agents');
        const data = await res.json();
        
        if (data.success) {
            renderAgentList(data.agents);
        }
    } catch (e) {
        console.error('[Agents] 加载失败:', e);
    }
}

function renderAgentList(agents) {
    const container = document.getElementById('fag');
    if (!container) return;
    
    const colors = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
    const icons = {
        meta_architect: '🏗️',
        xiaoyi: '😊',
        geo_scout: '🔍',
        geo_strategist: '🧠',
        content_engineer: '✏️',
        source_deployer: '📦',
        geo_analyst: '📊',
        compliance_officer: '🛡️'
    };
    
    container.innerHTML = agents.map((a, i) => `
        <div class="ac">
            <div class="ach">
                <div class="aa ${colors[i % colors.length]}">${icons[a.id] || '🤖'}</div>
                <div class="ai">
                    <div class="an">${a.name}</div>
                    <div class="ar">${a.role} | ${a.team}</div>
                </div>
                <div class="sd"></div>
            </div>
            <div class="acb">
                <div class="ad">${a.description || '暂无描述'}</div>
                ${a.skills && a.skills.length ? `<div class="ask">${a.skills.map(s => `<span class="sk">${s}</span>`).join('')}</div>` : ''}
            </div>
            <div class="acf">
                <span class="asig">${a.status === 'active' ? '● 在线' : '○ 离线'}</span>
                <button class="smb" onclick="summonAgent('${a.id}')">召唤</button>
            </div>
        </div>
    `).join('');
}

function summonAgent(agentId) {
    const names = {
        geo_scout: '龙探探',
        geo_strategist: '龙策策',
        content_engineer: '龙工工',
        source_deployer: '龙部部',
        geo_analyst: '龙分分',
        compliance_officer: '龙规规',
        meta_architect: '架构师'
    };
    qc(`[召唤:${names[agentId] || agentId}]`);
    sp('chat');
}

// ==================== 架构视图 ====================
async function loadArchitecture() {
    try {
        const res = await fetch('/api/lobster/architecture');
        const data = await res.json();
        
        if (data.success) {
            // 显示架构文档摘要
            const archText = document.getElementById('archText');
            if (archText) {
                archText.textContent = data.architecture.document 
                    ? data.architecture.document.substring(0, 1500) + (data.architecture.document.length > 1500 ? '\n\n... (文档较长，已截断)' : '')
                    : '架构文档正在准备中...\n\n基于 SeaClaw 出海龙虾的五层生存驱动架构：\n\nL1 感知层 (Perception)\n   - 龙探探：GEO感知雷达\n\nL2 决策层 (Cognition)\n   - 龙策策：策略架构师\n   - 龙工工：内容重构工程师\n\nL3 执行层 (Execution)\n   - 龙部部：信源部署专员\n\nL4 监控层 (Monitoring)\n   - 龙分分：效果监测分析师\n\n风控层 (Compliance)\n   - 龙规规：合规风控官\n\nL5 进化层 (Evolution)\n   - meta_architect：自我进化引擎';
            }
            
            console.log('[Architecture] 数据加载成功');
        }
    } catch (e) {
        console.error('[Architecture] 加载失败:', e);
    }
}

// ==================== 注册表 ====================
async function loadReg() {
    try {
        const res = await fetch('/api/lobster/registry');
        const data = await res.json();
        
        if (data.success) {
            const { agents, teams, skills } = data.registry;
            
            // 渲染智能体表格
            const rb = document.getElementById('rb');
            if (rb) {
                rb.innerHTML = Object.entries(agents || {}).map(([id, info]) => `
                    <tr>
                        <td><code>${id}</code></td>
                        <td>${info.name || id}</td>
                        <td>${info.role || '-'}</td>
                        <td>${info.team || 'core'}</td>
                        <td>${info.voice || '-'}</td>
                        <td>${(info.skills || []).length}</td>
                        <td><span class="bg bg2">${info.status || 'active'}</span></td>
                    </tr>
                `).join('');
            }
            
            // 渲染团队表格
            const tb = document.getElementById('tb');
            if (tb) {
                tb.innerHTML = Object.entries(teams || {}).map(([id, team]) => `
                    <tr>
                        <td><code>${id}</code></td>
                        <td>${team.name || id}</td>
                        <td>${team.description || '-'}</td>
                        <td>${(team.members || []).length} 个成员</td>
                    </tr>
                `).join('');
            }
        }
    } catch (e) {
        console.error('[Registry] 加载失败:', e);
    }
}

// ==================== 编排中心 ====================
async function loadOrchestrator() {
    try {
        const res = await fetch('/api/lobster/orchestrator');
        const data = await res.json();
        
        if (data.success) {
            const o = data.orchestrator;
            
            const osEl = document.getElementById('os');
            const osdEl = document.getElementById('osd');
            const rcEl = document.getElementById('rc');
            
            if (osEl) osEl.textContent = o.status === 'loaded' ? '运行中' : '未启动';
            if (osdEl) osdEl.textContent = o.status === 'loaded' ? `${o.resources} 个资源可用` : '请检查服务状态';
            if (rcEl) rcEl.textContent = o.resources || '-';
        }
    } catch (e) {
        console.error('[Orchestrator] 加载失败:', e);
    }
}

async function sot() {
    const taskInput = document.getElementById('ot');
    const resultDiv = document.getElementById('ore');
    
    if (!taskInput || !taskInput.value.trim()) {
        alert('请输入任务描述');
        return;
    }
    
    try {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div class="alert alw"><i class="fas fa-spinner fa-spin"></i><div>正在提交任务...</div>';
        
        const res = await fetch('/api/lobster/orchestrator/task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: taskInput.value })
        });
        
        const data = await res.json();
        
        if (data.success) {
            resultDiv.innerHTML = `<div class="alert als"><i class="fas fa-check-circle"></i><div><strong>任务已提交！</strong><br>Task ID: ${data.taskId}<br>状态: ${data.status}</div></div>`;
            taskInput.value = '';
        } else {
            resultDiv.innerHTML = `<div class="alert ald"><i class="fas fa-exclamation-circle"></i><div>提交失败: ${data.error}</div></div>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<div class="alert ald"><i class="fas fa-exclamation-circle"></i><div>请求失败: ${e.message}</div></div>`;
    }
}

// ==================== 创建团队 ====================
async function bt() {
    const reqInput = document.getElementById('brq');
    const nameInput = document.getElementById('btn');
    const resultDiv = document.getElementById('bres');
    const btn = document.getElementById('bb');
    
    if (!reqInput || !reqInput.value.trim()) {
        alert('请描述您需要的团队需求');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在构建...';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="alert alw"><i class="fas fa-magic"></i><div><strong>StarClaw 架构师</strong> 正在分析您的需求并设计团队架构...</div></div>';
    
    try {
        const res = await fetch('/api/lobster/build-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requirement: reqInput.value,
                teamName: nameInput?.value?.trim() || undefined
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            let html = `<div class="alert als"><i class="fas fa-check-circle"></i><div><strong>🎉 团队构建成功！</strong><br><br>${data.message}`;
            
            if (data.team) {
                html += `<br><br><strong>团队信息：</strong>`;
                html += `<br>- 名称: ${data.team.name || '未命名'}`;
                html += `<br>- ID: ${data.team.id || 'N/A'}`;
                if (data.team.members) {
                    html += `<br>- 成员: ${data.team.members.join(', ')}`;
                }
            }
            
            if (data.filesCreated && data.filesCreated.length > 0) {
                html += `<br><br><strong>已创建文件：</strong><ul>`;
                data.filesCreated.forEach(f => {
                    html += `<li>${f}</li>`;
                });
                html += `</ul>`;
            }
            
            html += '</div></div>';
            resultDiv.innerHTML = html;
        } else {
            resultDiv.innerHTML = `<div class="alert ald"><i class="fas fa-exclamation-circle"></i><div><strong>构建失败</strong><br>${data.error}<br><br>提示：${data.hint || '请检查需求描述是否清晰'}</div></div>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<div class="alert ald"><i class="fas fa-exclamation-circle"></i><div>请求失败: ${e.message}</div></div>`;
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> 开始构建团队';
}

// ==================== GEO 工作台（聊天） ====================
async function sc() {
    const input = document.getElementById('ci');
    const msgContainer = document.getElementById('cms');
    
    if (!input || !input.value.trim()) return;
    
    const message = input.value.trim();
    input.value = '';
    
    // 添加用户消息
    addMessage(message, true);
    
    // 显示思考中
    const thinkingId = addMessage('正在思考中...', false, true);
    
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                sessionId: 'lobster-workbench',
                teamContext: 'geo_lobster'
            })
        });
        
        const data = await res.json();
        
        // 移除思考中消息
        document.getElementById(thinkingId)?.remove();
        
        if (data.success) {
            addMessage(data.reply || data.response || data.message || '(无回复)', false);
        } else {
            addMessage(`错误: ${data.error}`, false);
        }
    } catch (e) {
        document.getElementById(thinkingId)?.remove();
        addMessage(`请求失败: ${e.message}`, false);
    }
}

function addMessage(content, isUser, isThinking = false) {
    const container = document.getElementById('cms');
    if (!container) return null;
    
    const id = 'msg-' + Date.now();
    const avatar = isUser ? 'U' : 'G';
    
    const html = `
        <div class="mg ${isUser ? 'ur' : 'ai'}" id="${id}">
            <div class="ma">${avatar}</div>
            <div class="mb">${isThinking ? '<i class="fas fa-spinner fa-spin"></i> ' : ''}${content}</div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
    
    return id;
}

function qc(text) {
    const input = document.getElementById('ci');
    if (input) {
        input.value = text;
        sc();
    }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 显示时钟
    function updateClock() {
        const el = document.getElementById('clk');
        if (el) el.textContent = new Date().toLocaleString('zh-CN');
    }
    updateClock();
    setInterval(updateClock, 1000);
    
    // 加载仪表板数据
    loadDashboard();
    
    console.log('[LobsterDashboard] ✅ 控制台已初始化');
});
