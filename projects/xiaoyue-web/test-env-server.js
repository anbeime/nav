require('dotenv').config();
console.log('=== 当前环境变量 ===');
console.log('ARK_API_KEY:', process.env.ARK_API_KEY ? process.env.ARK_API_KEY.substring(0, 8) + '...' : '未设置');
console.log('完整 ARK_API_KEY:', process.env.ARK_API_KEY);
