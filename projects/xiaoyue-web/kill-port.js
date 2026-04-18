// 杀掉占用 3000 端口的进程
const { execSync } = require('child_process');
try {
    const result = execSync('netstat -ano | findstr :3000 | findstr LISTENING', { encoding: 'utf-8' });
    console.log('占用端口的进程:', result);
    const pidMatch = result.match(/(\d+)\s*$/);
    if (pidMatch) {
        const pid = pidMatch[1];
        console.log('杀掉 PID:', pid);
        execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf-8' });
        console.log('已杀掉');
    }
} catch (e) {
    console.log('没有找到占用3000端口的进程');
}
