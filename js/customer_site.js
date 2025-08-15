// 初始化一个空对象，稍后会从D1数据库加载数据
let CUSTOMER_SITES = {};

// 从API获取客户站点数据
async function loadCustomerSitesFromDB() {
    try {
        // 获取当前时间戳和密码哈希，用于API鉴权
        const timestamp = Date.now();
        const passwordHash = window.__ENV__?.PASSWORD;
        
        if (!passwordHash) {
            console.warn("警告：未找到密码哈希，使用默认客户站点配置");
            useDefaultSites();
            return;
        }
        
        // 构建API请求URL
        const apiUrl = `/customer-sites?auth=${passwordHash}&t=${timestamp}`;
        
        // 发送请求获取所有客户站点
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(`API返回错误: ${result.error}`);
        }
        
        // 将API返回的数据转换为CUSTOMER_SITES格式
        CUSTOMER_SITES = {};
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach(site => {
                CUSTOMER_SITES[site._id] = {
                    api: site.api,
                    name: site.name,
                    adult: site.adult || false
                };
            });
            console.log(`已从数据库加载 ${result.data.length} 个客户站点`);
        } else {
            console.warn("数据库中暂无客户站点数据");
        }
        
        // 调用全局方法合并
        if (window.extendAPISites) {
            window.extendAPISites(CUSTOMER_SITES);
            
            // 重新初始化API复选框以显示新加载的客户站点
            if (window.initAPICheckboxes) {
                window.initAPICheckboxes();
            }
        } else {
            console.error("错误：请先加载 config.js！");
        }
    } catch (error) {
        console.error("加载客户站点数据失败:", error);
        useDefaultSites();
    }
}

// 使用默认站点配置
function useDefaultSites() {
    CUSTOMER_SITES = {
        qiqi: {
            api: 'https://www.qiqidys.com/api.php/provide/vod',
            name: '七七资源',
        }
    };
    
    // 调用全局方法合并
    if (window.extendAPISites) {
        window.extendAPISites(CUSTOMER_SITES);
        
        // 重新初始化API复选框以显示默认站点
        if (window.initAPICheckboxes) {
            window.initAPICheckboxes();
        }
    } else {
        console.error("错误：请先加载 config.js！");
    }
}

// 添加新的客户站点
async function addCustomerSite(id, api, name, adult = false) {
    try {
        // 获取当前时间戳和密码哈希，用于API鉴权
        const timestamp = Date.now();
        const passwordHash = window.__ENV__?.PASSWORD;
        
        if (!passwordHash) {
            throw new Error("未找到密码哈希，无法添加客户站点");
        }
        
        // 构建API请求URL
        const apiUrl = `/customer-sites?auth=${passwordHash}&t=${timestamp}`;
        
        // 发送POST请求添加新站点
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id,
                api,
                name,
                adult
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(`API返回错误: ${result.error}`);
        }
        
        // 更新本地CUSTOMER_SITES对象
        CUSTOMER_SITES[id] = {
            api,
            name,
            adult
        };
        
        // 调用全局方法合并
        if (window.extendAPISites) {
            window.extendAPISites({ [id]: { api, name, adult } });
            
            // 重新初始化API复选框以显示新添加的客户站点
            if (window.initAPICheckboxes) {
                window.initAPICheckboxes();
            }
        }
        
        return true;
    } catch (error) {
        console.error("添加客户站点失败:", error);
        return false;
    }
}

// 更新客户站点
async function updateCustomerSite(id, api, name, adult = false) {
    try {
        // 获取当前时间戳和密码哈希，用于API鉴权
        const timestamp = Date.now();
        const passwordHash = window.__ENV__?.PASSWORD;
        
        if (!passwordHash) {
            throw new Error("未找到密码哈希，无法更新客户站点");
        }
        
        // 构建API请求URL
        const apiUrl = `/customer-sites/${id}?auth=${passwordHash}&t=${timestamp}`;
        
        // 发送PUT请求更新站点
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api,
                name,
                adult
            })
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(`API返回错误: ${result.error}`);
        }
        
        // 更新本地CUSTOMER_SITES对象
        CUSTOMER_SITES[id] = {
            api,
            name,
            adult
        };
        
        // 调用全局方法合并
        if (window.extendAPISites) {
            window.extendAPISites({ [id]: { api, name, adult } });
            
            // 重新初始化API复选框以显示更新的客户站点
            if (window.initAPICheckboxes) {
                window.initAPICheckboxes();
            }
        }
        
        return true;
    } catch (error) {
        console.error("更新客户站点失败:", error);
        return false;
    }
}

// 删除客户站点
async function deleteCustomerSite(id) {
    try {
        // 获取当前时间戳和密码哈希，用于API鉴权
        const timestamp = Date.now();
        const passwordHash = window.__ENV__?.PASSWORD;
        
        if (!passwordHash) {
            throw new Error("未找到密码哈希，无法删除客户站点");
        }
        
        // 构建API请求URL
        const apiUrl = `/customer-sites/${id}?auth=${passwordHash}&t=${timestamp}`;
        
        // 发送DELETE请求删除站点
        const response = await fetch(apiUrl, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(`API返回错误: ${result.error}`);
        }
        
        // 从本地CUSTOMER_SITES对象中删除
        delete CUSTOMER_SITES[id];
        
        // 重新调用全局方法合并（因为无法直接从API_SITES中删除）
        if (window.extendAPISites && window.API_SITES) {
            // 创建一个新的API_SITES副本，不包含被删除的站点
            const newAPISites = {};
            for (const [key, value] of Object.entries(window.API_SITES)) {
                if (key !== id) {
                    newAPISites[key] = value;
                }
            }
            // 重置全局API_SITES
            window.API_SITES = newAPISites;
            // 重新合并所有客户站点
            window.extendAPISites(CUSTOMER_SITES);
            
            // 重新初始化API复选框以反映删除操作
            if (window.initAPICheckboxes) {
                window.initAPICheckboxes();
            }
        }
        
        return true;
    } catch (error) {
        console.error("删除客户站点失败:", error);
        return false;
    }
}

// 导出函数和对象
window.CUSTOMER_SITES = CUSTOMER_SITES;
window.loadCustomerSitesFromDB = loadCustomerSitesFromDB;
window.addCustomerSite = addCustomerSite;
window.updateCustomerSite = updateCustomerSite;
window.deleteCustomerSite = deleteCustomerSite;

// 页面加载完成后自动加载客户站点数据
document.addEventListener('DOMContentLoaded', () => {
    // 确保密码验证完成后再加载数据
    if (localStorage.getItem('passwordVerified') === 'true') {
        loadCustomerSitesFromDB();
    } else {
        // 如果没有密码验证，先使用默认配置
        useDefaultSites();
        
        // 监听密码验证事件
        document.addEventListener('passwordVerified', () => {
            loadCustomerSitesFromDB();
        });
    }
});
