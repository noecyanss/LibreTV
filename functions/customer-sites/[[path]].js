// functions/customer-sites/[[path]].js
// 客户站点API端点

import { MongoClient } from 'mongodb';

// 从环境变量获取MongoDB连接信息
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'libretv';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME || 'customer_sites';

// 验证请求的鉴权
async function validateAuth(request, env) {
    const url = new URL(request.url);
    const authHash = url.searchParams.get('auth');
    const timestamp = url.searchParams.get('t');
    
    // 获取服务器端密码
    const serverPassword = env.PASSWORD;
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
        
        if (!authHash || authHash !== serverPasswordHash) {
            console.warn('API请求鉴权失败：密码哈希不匹配');
            return false;
        }
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

// 连接到MongoDB
async function connectToMongoDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        return { client, collection };
    } catch (error) {
        console.error('MongoDB连接错误:', error);
        throw error;
    }
}

// 处理GET请求 - 获取所有客户站点或单个站点
async function handleGet(request, env) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const siteId = pathSegments[1]; // customer-sites/[siteId]
    
    try {
        const { client, collection } = await connectToMongoDB();
        
        try {
            if (siteId) {
                // 获取单个站点
                const site = await collection.findOne({ _id: siteId });
                if (!site) {
                    return createResponse({ success: false, error: '站点不存在' }, 404);
                }
                return createResponse({ success: true, data: site });
            } else {
                // 获取所有站点
                const sites = await collection.find({}).toArray();
                return createResponse({ success: true, data: sites });
            }
        } finally {
            await client.close();
        }
    } catch (error) {
        console.error('处理GET请求错误:', error);
        return createResponse({ success: false, error: '数据库操作失败' }, 500);
    }
}

// 处理POST请求 - 添加新站点
async function handlePost(request, env) {
    try {
        const data = await request.json();
        
        if (!data.id || !data.api || !data.name) {
            return createResponse({ success: false, error: '缺少必要字段 (id, api, name)' }, 400);
        }
        
        const { client, collection } = await connectToMongoDB();
        
        try {
            // 检查ID是否已存在
            const existing = await collection.findOne({ _id: data.id });
            if (existing) {
                return createResponse({ success: false, error: '站点ID已存在' }, 409);
            }
            
            // 插入新站点
            const siteData = {
                _id: data.id,
                api: data.api,
                name: data.name,
                adult: data.adult || false,
                createdAt: new Date().toISOString()
            };
            
            await collection.insertOne(siteData);
            return createResponse({ success: true, data: siteData });
        } finally {
            await client.close();
        }
    } catch (error) {
        console.error('处理POST请求错误:', error);
        return createResponse({ success: false, error: '数据库操作失败' }, 500);
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
        
        const { client, collection } = await connectToMongoDB();
        
        try {
            // 检查站点是否存在
            const existing = await collection.findOne({ _id: siteId });
            if (!existing) {
                return createResponse({ success: false, error: '站点不存在' }, 404);
            }
            
            // 更新站点
            const siteData = {
                api: data.api,
                name: data.name,
                adult: data.adult || false,
                updatedAt: new Date().toISOString()
            };
            
            await collection.updateOne({ _id: siteId }, { $set: siteData });
            return createResponse({ success: true, data: { _id: siteId, ...siteData } });
        } finally {
            await client.close();
        }
    } catch (error) {
        console.error('处理PUT请求错误:', error);
        return createResponse({ success: false, error: '数据库操作失败' }, 500);
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
        const { client, collection } = await connectToMongoDB();
        
        try {
            // 检查站点是否存在
            const existing = await collection.findOne({ _id: siteId });
            if (!existing) {
                return createResponse({ success: false, error: '站点不存在' }, 404);
            }
            
            // 删除站点
            await collection.deleteOne({ _id: siteId });
            return createResponse({ success: true, message: '站点已删除' });
        } finally {
            await client.close();
        }
    } catch (error) {
        console.error('处理DELETE请求错误:', error);
        return createResponse({ success: false, error: '数据库操作失败' }, 500);
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