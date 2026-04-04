/**
 * 测试网页爬取技能
 */
const http = require('http');

// 测试 HTTP 执行器
function testHttpExecutor(url) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ url, method: 'GET' });
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/execute/http',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 简单的 HTML 解析
function parseHtml(html) {
    // 提取标题
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // 提取描述
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // 提取关键词
    const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
    const keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [];
    
    // 移除脚本和样式
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // 限制文本长度
    if (text.length > 2000) {
        text = text.substring(0, 2000) + '...';
    }
    
    return { title, description, keywords, text };
}

// 主测试函数
async function main() {
    console.log('========================================');
    console.log('网页爬取技能测试');
    console.log('========================================\n');
    
    const testUrls = [
        'https://www.baidu.com',
        'https://www.zhihu.com',
        'https://github.com'
    ];
    
    for (const url of testUrls) {
        console.log(`\n测试 URL: ${url}`);
        console.log('-'.repeat(40));
        
        try {
            const startTime = Date.now();
            const result = await testHttpExecutor(url);
            const duration = Date.now() - startTime;
            
            if (result.success) {
                console.log(`状态: ${result.status}`);
                console.log(`耗时: ${duration}ms`);
                
                // 解析 HTML
                const parsed = parseHtml(result.data);
                console.log(`标题: ${parsed.title}`);
                console.log(`描述: ${parsed.description.substring(0, 100)}${parsed.description.length > 100 ? '...' : ''}`);
                console.log(`关键词: ${parsed.keywords.slice(0, 5).join(', ')}`);
                console.log(`文本长度: ${parsed.text.length} 字符`);
                console.log(`文本预览: ${parsed.text.substring(0, 200)}...`);
            } else {
                console.log(`失败: ${result.error}`);
            }
        } catch (error) {
            console.log(`错误: ${error.message}`);
        }
    }
    
    console.log('\n========================================');
    console.log('测试完成！');
    console.log('========================================');
}

main().catch(console.error);
