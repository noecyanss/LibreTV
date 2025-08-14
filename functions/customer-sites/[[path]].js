// functions/customer-sites/[[path]].js
// 客户站点API端点

// CloudFlare Workers环境中的默认配置
const DEFAULT_CLUSTER_NAME = 'Cluster0';
const DEFAULT_DB_NAME = 'libretv';
const DEFAULT_COLLECTION_NAME = 'customer_sites';

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

// MongoDB Atlas Data API 请求函数
async function mongoRequest(action, data = {}, env) {
    const apiUrl = env.MONGODB_DATA_API_URL;
    const apiKey = env.MONGODB_API_KEY;
    const clusterName = env.MONGODB_CLUSTER_NAME || DEFAULT_CLUSTER_NAME;
    const dbName = env.MONGODB_DB_NAME || DEFAULT_DB_NAME;
    const collectionName = env.MONGODB_COLLECTION_NAME || DEFAULT_COLLECTION_NAME;
    
    if (!apiUrl || !apiKey) {
        throw new Error('MongoDB Data API配置缺失，请设置MONGODB_DATA_API_URL和MONGODB_API_KEY环境变量');
    }
    
    const url = `${apiUrl}/action/${action}`;
    const requestBody = {
        dataSource: clusterName,
        database: dbName,
        collection: collectionName,
        ...data
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MongoDB API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
}

// 处理GET请求 - 获取所有客户站点或单个站点
async function handleGet(request, env) {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const siteId = pathSegments[1]; // customer-sites/[siteId]
    
    try {
        if (siteId) {
            // 获取单个站点
            const result = await mongoRequest('findOne', {
                filter: { _id: siteId }
            }, env);
            
            if (!result.document) {
                return createResponse({ success: false, error: '站点不存在' }, 404);
            }
            return createResponse({ success: true, data: result.document });
        } else {
            // 获取所有站点
            const result = await mongoRequest('find', {
                filter: {}
            }, env);
            
            return createResponse({ success: true, data: result.documents || [] });
        }
    } catch (error) {
        console.error('处理GET请求错误:', error);
        return createResponse({ success: false, error: error.message }, 500);
    }
}

// 处理POST请求 - 添加新站点
async function handlePost(request, env) {
    try {
        const data = await request.json();
        
        if (!data.id || !data.api || !data.name) {
            return createResponse({ success: false, error: '缺少必要字段 (id, api, name)' }, 400);
        }
        
        // 检查ID是否已存在
        const existingResult = await mongoRequest('findOne', {
            filter: { _id: data.id }
        }, env);
        
        if (existingResult.document) {
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
        
        await mongoRequest('insertOne', {
            document: siteData
        }, env);
        
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
        
        // 检查站点是否存在
        const existingResult = await mongoRequest('findOne', {
            filter: { _id: siteId }
        }, env);
        
        if (!existingResult.document) {
            return createResponse({ success: false, error: '站点不存在' }, 404);
        }
        
        // 更新站点
        const siteData = {
            api: data.api,
            name: data.name,
            adult: data.adult || false,
            updatedAt: new Date().toISOString()
        };
        
        await mongoRequest('updateOne', {
            filter: { _id: siteId },
            update: { $set: siteData }
        }, env);
        
        return createResponse({ success: true, data: { _id: siteId, ...siteData } });
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
        // 检查站点是否存在
        const existingResult = await mongoRequest('findOne', {
            filter: { _id: siteId }
        }, env);
        
        if (!existingResult.document) {
            return createResponse({ success: false, error: '站点不存在' }, 404);
        }
        
        // 删除站点
        await mongoRequest('deleteOne', {
            filter: { _id: siteId }
        }, env);
        
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