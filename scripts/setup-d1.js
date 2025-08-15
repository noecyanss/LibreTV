#!/usr/bin/env node
// scripts/setup-d1.js
// CloudFlare D1 数据库设置脚本

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 LibreTV CloudFlare D1 数据库设置脚本');
console.log('=====================================\n');

// 检查是否安装了 wrangler
function checkWrangler() {
    try {
        execSync('npx wrangler --version', { stdio: 'pipe' });
        console.log('✅ Wrangler CLI 已安装');
        return true;
    } catch (error) {
        console.log('❌ 未找到 Wrangler CLI');
        console.log('请先安装 Wrangler CLI：npm install -g wrangler');
        return false;
    }
}

// 创建 D1 数据库
function createD1Database() {
    console.log('\n📦 创建 D1 数据库...');
    
    try {
        const output = execSync('npx wrangler d1 create libretv-db', { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        
        console.log('✅ D1 数据库创建成功！');
        console.log(output);
        
        // 尝试从输出中提取数据库 ID
        const dbIdMatch = output.match(/database_id = "([^"]+)"/);
        if (dbIdMatch) {
            const databaseId = dbIdMatch[1];
            updateWranglerToml(databaseId);
        } else {
            console.log('⚠️  请手动更新 wrangler.toml 文件中的 database_id');
        }
        
    } catch (error) {
        console.error('❌ 创建 D1 数据库失败：', error.message);
        console.log('\n请确保：');
        console.log('1. 已登录 CloudFlare：npx wrangler login');
        console.log('2. 有权限创建 D1 数据库');
    }
}

// 更新 wrangler.toml 文件
function updateWranglerToml(databaseId) {
    const wranglerPath = path.join(path.dirname(__dirname), 'wrangler.toml');
    
    try {
        let content = fs.readFileSync(wranglerPath, 'utf8');
        content = content.replace(
            'database_id = "your-database-id-here"',
            `database_id = "${databaseId}"`
        );
        
        fs.writeFileSync(wranglerPath, content);
        console.log('✅ wrangler.toml 文件已更新');
        
    } catch (error) {
        console.error('❌ 更新 wrangler.toml 失败：', error.message);
        console.log(`请手动将数据库 ID "${databaseId}" 添加到 wrangler.toml 文件中`);
    }
}

// 显示后续步骤
function showNextSteps() {
    console.log('\n🎉 设置完成！');
    console.log('\n📋 后续步骤：');
    console.log('1. 在 CloudFlare Pages 项目中绑定 D1 数据库：');
    console.log('   - 进入项目设置 > 函数 > D1 数据库绑定');
    console.log('   - 添加变量名：DB');
    console.log('   - 选择数据库：libretv-db');
    console.log('');
    console.log('2. 设置 PASSWORD 环境变量：');
    console.log('   - 进入项目设置 > 环境变量');
    console.log('   - 添加 PASSWORD 变量');
    console.log('');
    console.log('3. 重新部署项目');
    console.log('');
    console.log('📚 详细说明请参考 README.md 文件');
}

// 主函数
function main() {
    if (!checkWrangler()) {
        return;
    }
    
    createD1Database();
    showNextSteps();
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    checkWrangler,
    createD1Database,
    updateWranglerToml,
    showNextSteps
};
