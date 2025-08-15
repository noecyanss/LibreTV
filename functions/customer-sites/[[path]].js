// functions/customer-sites/[[path]].js
// 客户站点API端点 - 使用CloudFlare D1数据库

// 验证请求的鉴权
async function validateAuth(request, env) {
    console.log('开始验证请求鉴权');
    
    const url = new URL(request.url);
    const authHash = url.searchParams.get('auth');
    const timestamp = url.searchParams.get('t');
    
    console.log('请求参数:', { authHash: authHash?.substring(0, 10) + '...', timestamp });
    
    // 获取服务器端密码
    const serverPassword = env.PASSWORD;
    console.log('服务器密码状态:', { hasPassword: !!serverPassword, passwordLength: serverPassword?.length });
    
    if (!serverPassword) {
        console.error('服务器未设置 PASSWORD 环境变量，API访问被拒绝');
        return false;
    }
    
    // 使用 SHA-256 哈希算法
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(serverPassword);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const serverPasswordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log('服务器密码哈希:', serverPasswordHash.substring(0, 10) + '...');
        
        if (!authHash || authHash !== serverPasswordHash) {
            console.warn('API请求鉴权失败：密码哈希不匹配', { 
                authHashPrefix: authHash?.substring(0, 10),
                serverHashPrefix: serverPasswordHash.substring(0, 10)
            });
            return false;
        }
        
        console.log('密码验证成功');
    } catch (error) {
        console.error('计算密码哈希失败:', error);
        return false;
    }
    
    // 验证时间戳（10分钟有效期）
    if (timestamp) {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10分钟
        if (now - parseInt(timestamp) > maxAge) {
            console.warn('API请求鉴权失败：时间戳过期');
            return false;
        }
    }
    
    console.log('鉴权验证完成');
    return true;
}

// 创建标准化的响应
function createResponse(body, status = 200) {
    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Content-Type", "application/json");

    return new Response(JSON.stringify(body), { 
        status, 
        headers: responseHeaders 
    });
}

// 初始化数据库表
async function initDatabase(db) {
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS customer_sites (
                id TEXT PRIMARY KEY,
                api TEXT NOT NULL,
                name TEXT NOT NULL,
                adult INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();
        
        console.log('数据库表初始化成功');
    } catch (error) {
        console.error('数据库表初始化失败:', error);
        throw error;
    }
}

// 处理GET请求 - 获取所有客户站点或单个站点
async function handleGet(request, env) {
    console.log('开始处理GET请求');
    
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const siteId = pathSegments[1]; // customer-sites/[siteId]
    
    console.log('请求路径:', { pathname: url.pathname, pathSegments, siteId });
    
    try {
        const db = env.DB; // CloudFlare D1 数据库绑定
        console.log('D1数据库状态:', { hasDB: !!db, dbType: typeof db });
        
        if (!db) {
            console.error('D1数据库未绑定');
            throw new Error('D1数据库未绑定，请在CloudFlare Pages设置中绑定DB变量');
        }
        
        console.log('开始初始化数据库表');
        // 确保表存在
        await initDatabase(db);
        console.log('数据库表初始化完成');
        
        if (siteId) {
            console.log('获取单个站点:', siteId);
            // 获取单个站点
            const result = await db.prepare('SELECT * FROM customer_sites WHERE id = ?').bind(siteId).first();
            
            if (!result) {
                console.log('站点不存在:', siteId);
                return createResponse({ success: false, error: '站点不存在' }, 404);
            }
            
            // 转换数据格式
            const site = {
                _id: result.id,
                api: result.api,
                name: result.name,
                adult: result.adult === 1,
                createdAt: result.created_at,
                updatedAt: result.updated_at
            };
            
            console.log('返回单个站点数据:', site);
            return createResponse({ success: true, data: site });
        } else {
            console.log('获取所有站点');
            // 获取所有站点
            const result = await db.prepare('SELECT * FROM customer_sites ORDER BY created_at DESC').all();
            console.log('查询结果:', { success: result.success, count: result.results?.length });
            
            // 转换数据格式
            const sites = result.results.map(row => ({
                _id: row.id,
                api: row.api,
                name: row.name,
                adult: row.adult === 1,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
            
            console.log('返回所有站点数据:', { count: sites.length });
            return createResponse({ success: true, data: sites });
        }
    } catch (error) {
        console.error('处理GET请求错误:', error);
        console.error('错误详情:', { 
            message: error.message, 
            stack: error.stack,
            name: error.name
        });
        return createResponse({ success: false, error: error.message }, 500);
    }
}

// 处理POST请求 - 添加新站点
async function handlePost(request, env) {
    try {
        console.log('开始处理POST请求');
        
        const data = await request.json();
        console.log('接收到的数据:', data);
        
        if (!data.id || !data.api || !data.name) {
            console.error('缺少必要字段:', { id: data.id, api: data.api, name: data.name });
            return createResponse({ success: false, error: '缺少必要字段 (id, api, name)' }, 400);
        }
        
        const db = env.DB;
        if (!db) {
            console.error('D1数据库未绑定');
            throw new Error('D1数据库未绑定，请在CloudFlare Pages设置中绑定DB变量');
        }
        
        console.log('开始初始化数据库表');
        // 确保表存在
        await initDatabase(db);
        
        console.log('检查站点ID是否已存在:', data.id);
        // 检查ID是否已存在
        const existing = await db.prepare('SELECT id FROM customer_sites WHERE id = ?').bind(data.id).first();
        if (existing) {
            console.error('站点ID已存在:', data.id);
            return createResponse({ success: false, error: '站点ID已存在' }, 409);
        }
        
        // 插入新站点
        const now = new Date().toISOString();
        console.log('开始插入新站点:', { id: data.id, api: data.api, name: data.name, adult: data.adult });
        
        const result = await db.prepare(`
            INSERT INTO customer_sites (id, api, name, adult, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            data.id,
            data.api,
            data.name,
            data.adult ? 1 : 0,
            now,
            now
        ).run();
        
        console.log('插入结果:', result);
        
        const siteData = {
            _id: data.id,
            api: data.api,
            name: data.name,
            adult: data.adult || false,
            createdAt: now,
            updatedAt: now
        };
        
        console.log('站点添加成功:', siteData);
        return createResponse({ success: true, data: siteData });
    } catch (error) {
        console.error('处理POST请求错误:', error);
        return createResponse({ success: false, error: error.message }, 500);
    }
}

// 处理PUT请求 - 更新站点
async function handlePut(request, env) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const siteId = pathSegments[1]; // customer-sites/[siteId]
    
    if (!siteId) {
        return createResponse({ success: false, error: '缺少站点ID' }, 400);
    }
    
    try {
        const data = await request.json();
        
        if (!data.api || !data.name) {
            return createResponse({ success: false, error: '缺少必要字段 (api, name)' }, 400);
        }
        
        const db = env.DB;
        if (!db) {
            throw new Error('D1数据库未绑定，请在CloudFlare Pages设置中绑定DB变量');
        }
        
        // 确保表存在
        await initDatabase(db);
        
        // 检查站点是否存在
        const existing = await db.prepare('SELECT id FROM customer_sites WHERE id = ?').bind(siteId).first();
        if (!existing) {
            return createResponse({ success: false, error: '站点不存在' }, 404);
        }
        
        // 更新站点
        const now = new Date().toISOString();
        await db.prepare(`
            UPDATE customer_sites 
            SET api = ?, name = ?, adult = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            data.api,
            data.name,
            data.adult ? 1 : 0,
            now,
            siteId
        ).run();
        
        const siteData = {
            _id: siteId,
            api: data.api,
            name: data.name,
            adult: data.adult || false,
            updatedAt: now
        };
        
        return createResponse({ success: true, data: siteData });
    } catch (error) {
        console.error('处理PUT请求错误:', error);
        return createResponse({ success: false, error: error.message }, 500);
    }
}

// 处理DELETE请求 - 删除站点
async function handleDelete(request, env) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const siteId = pathSegments[1]; // customer-sites/[siteId]
    
    if (!siteId) {
        return createResponse({ success: false, error: '缺少站点ID' }, 400);
    }
    
    try {
        const db = env.DB;
        if (!db) {
            throw new Error('D1数据库未绑定，请在CloudFlare Pages设置中绑定DB变量');
        }
        
        // 确保表存在
        await initDatabase(db);
        
        // 检查站点是否存在
        const existing = await db.prepare('SELECT id FROM customer_sites WHERE id = ?').bind(siteId).first();
        if (!existing) {
            return createResponse({ success: false, error: '站点不存在' }, 404);
        }
        
        // 删除站点
        await db.prepare('DELETE FROM customer_sites WHERE id = ?').bind(siteId).run();
        
        return createResponse({ success: true, message: '站点已删除' });
    } catch (error) {
        console.error('处理DELETE请求错误:', error);
        return createResponse({ success: false, error: error.message }, 500);
    }
}

// 处理OPTIONS请求 - CORS预检
function handleOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400"
        }
    });
}

// 主处理函数
export async function onRequest(context) {
    const { request, env } = context;
    
    // 处理OPTIONS请求
    if (request.method === "OPTIONS") {
        return handleOptions();
    }
    
    // 验证鉴权
    const isValidAuth = await validateAuth(request, env);
    if (!isValidAuth) {
        return createResponse({
            success: false,
            error: 'API访问未授权：请检查密码配置或鉴权参数'
        }, 401);
    }
    
    // 根据请求方法分发处理
    switch (request.method) {
        case "GET":
            return handleGet(request, env);
        case "POST":
            return handlePost(request, env);
        case "PUT":
            return handlePut(request, env);
        case "DELETE":
            return handleDelete(request, env);
        default:
            return createResponse({ success: false, error: '不支持的请求方法' }, 405);
    }
}