// 客户站点管理功能

// 显示客户站点列表
async function displayCustomerSites() {
    const customerSitesList = document.getElementById('customerSitesList');
    if (!customerSitesList) return;

    // 清空列表
    customerSitesList.innerHTML = '';

    try {
        // 检查是否有客户站点数据
        if (!window.CUSTOMER_SITES || Object.keys(window.CUSTOMER_SITES).length === 0) {
            customerSitesList.innerHTML = '<div class="text-gray-500 text-center py-2">暂无客户站点</div>';
            return;
        }

        // 遍历客户站点并显示
        for (const [id, site] of Object.entries(window.CUSTOMER_SITES)) {
            const siteElement = document.createElement('div');
            siteElement.className = 'flex justify-between items-center p-2 hover:bg-[#222] rounded mb-1';
            
            const nameElement = document.createElement('div');
            nameElement.className = 'flex-1';
            nameElement.textContent = site.name || id;
            
            // 添加成人内容标记
            if (site.adult) {
                const adultBadge = document.createElement('span');
                adultBadge.className = 'text-xs bg-pink-600 text-white px-1 rounded ml-2';
                adultBadge.textContent = '18+';
                nameElement.appendChild(adultBadge);
            }
            
            const actionsElement = document.createElement('div');
            actionsElement.className = 'flex space-x-2';
            
            // 编辑按钮
            const editButton = document.createElement('button');
            editButton.className = 'text-blue-400 hover:text-blue-300';
            editButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
            editButton.onclick = () => editCustomerSite(id, site);
            
            // 删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.className = 'text-red-400 hover:text-red-300';
            deleteButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
            deleteButton.onclick = () => confirmDeleteCustomerSite(id);
            
            actionsElement.appendChild(editButton);
            actionsElement.appendChild(deleteButton);
            
            siteElement.appendChild(nameElement);
            siteElement.appendChild(actionsElement);
            
            customerSitesList.appendChild(siteElement);
        }
    } catch (error) {
        console.error('显示客户站点列表失败:', error);
        customerSitesList.innerHTML = '<div class="text-red-500 text-center py-2">加载客户站点失败</div>';
    }
}

// 显示添加客户站点表单
function showAddCustomerSiteForm() {
    const form = document.getElementById('addCustomerSiteForm');
    if (form) {
        // 重置表单
        document.getElementById('customerSiteId').value = '';
        document.getElementById('customerSiteName').value = '';
        document.getElementById('customerSiteApi').value = '';
        document.getElementById('customerSiteIsAdult').checked = false;
        
        // 显示表单
        form.classList.remove('hidden');
    }
}

// 隐藏添加客户站点表单
function cancelAddCustomerSite() {
    const form = document.getElementById('addCustomerSiteForm');
    if (form) {
        form.classList.add('hidden');
    }
}

// 添加客户站点（UI处理函数）
async function handleAddCustomerSite() {
    const idInput = document.getElementById('customerSiteId');
    const nameInput = document.getElementById('customerSiteName');
    const apiInput = document.getElementById('customerSiteApi');
    const adultInput = document.getElementById('customerSiteIsAdult');
    
    const id = idInput.value.trim();
    const name = nameInput.value.trim();
    const api = apiInput.value.trim();
    const adult = adultInput.checked;
    
    // 验证输入
    if (!id) {
        showToast('请输入站点ID');
        return;
    }
    
    if (!name) {
        showToast('请输入站点名称');
        return;
    }
    
    if (!api) {
        showToast('请输入API地址');
        return;
    }
    
    // 验证API格式
    if (!api.startsWith('http://') && !api.startsWith('https://')) {
        showToast('API地址必须以http://或https://开头');
        return;
    }
    
    try {
        // 显示加载中
        showLoading();
        
        // 调用添加客户站点函数（来自customer_site.js）
        const success = await window.addCustomerSite(id, api, name, adult);
        
        if (success) {
            // 隐藏表单
            cancelAddCustomerSite();
            
            // 重新从数据库加载客户站点数据
            await window.loadCustomerSitesFromDB();
            
            // 刷新客户站点列表
            await displayCustomerSites();
            
            showToast('客户站点添加成功', 'success');
        } else {
            showToast('客户站点添加失败');
        }
    } catch (error) {
        console.error('添加客户站点失败:', error);
        showToast('添加客户站点时发生错误: ' + error.message);
    } finally {
        // 隐藏加载中
        hideLoading();
    }
}

// 编辑客户站点
function editCustomerSite(id, site) {
    // 显示添加表单并填充数据
    showAddCustomerSiteForm();
    
    // 填充数据
    document.getElementById('customerSiteId').value = id;
    document.getElementById('customerSiteId').disabled = true; // ID不可修改
    document.getElementById('customerSiteName').value = site.name || '';
    document.getElementById('customerSiteApi').value = site.api || '';
    document.getElementById('customerSiteIsAdult').checked = site.adult || false;
    
    // 修改按钮文本
    const addButton = document.querySelector('#addCustomerSiteForm button:first-of-type');
    if (addButton) {
        addButton.textContent = '更新';
        addButton.onclick = () => updateCustomerSite(id);
    }
}

// 更新客户站点
async function updateCustomerSite(id) {
    const nameInput = document.getElementById('customerSiteName');
    const apiInput = document.getElementById('customerSiteApi');
    const adultInput = document.getElementById('customerSiteIsAdult');
    
    const name = nameInput.value.trim();
    const api = apiInput.value.trim();
    const adult = adultInput.checked;
    
    // 验证输入
    if (!name) {
        showToast('请输入站点名称');
        return;
    }
    
    if (!api) {
        showToast('请输入API地址');
        return;
    }
    
    // 验证API格式
    if (!api.startsWith('http://') && !api.startsWith('https://')) {
        showToast('API地址必须以http://或https://开头');
        return;
    }
    
    try {
        // 显示加载中
        showLoading();
        
        // 调用更新客户站点函数
        const success = await window.updateCustomerSite(id, api, name, adult);
        
        if (success) {
            // 恢复按钮文本和事件
            const addButton = document.querySelector('#addCustomerSiteForm button:first-of-type');
            if (addButton) {
                addButton.textContent = '添加';
                addButton.onclick = handleAddCustomerSite;
            }
            
            // 恢复ID输入框
            document.getElementById('customerSiteId').disabled = false;
            
            // 隐藏表单
            cancelAddCustomerSite();
            
            // 重新从数据库加载客户站点数据
            await window.loadCustomerSitesFromDB();
            
            // 刷新客户站点列表
            await displayCustomerSites();
            
            showToast('客户站点更新成功', 'success');
        } else {
            showToast('客户站点更新失败');
        }
    } catch (error) {
        console.error('更新客户站点失败:', error);
        showToast('更新客户站点时发生错误: ' + error.message);
    } finally {
        // 隐藏加载中
        hideLoading();
    }
}

// 确认删除客户站点
function confirmDeleteCustomerSite(id) {
    if (confirm(`确定要删除客户站点 "${id}" 吗？`)) {
        deleteCustomerSite(id);
    }
}

// 删除客户站点
async function deleteCustomerSite(id) {
    try {
        // 显示加载中
        showLoading();
        
        // 调用删除客户站点函数
        const success = await window.deleteCustomerSite(id);
        
        if (success) {
            // 重新从数据库加载客户站点数据
            await window.loadCustomerSitesFromDB();
            
            // 刷新客户站点列表
            await displayCustomerSites();
            
            showToast('客户站点删除成功', 'success');
        } else {
            showToast('客户站点删除失败');
        }
    } catch (error) {
        console.error('删除客户站点失败:', error);
        showToast('删除客户站点时发生错误: ' + error.message);
    } finally {
        // 隐藏加载中
        hideLoading();
    }
}

// 显示提示信息
function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        
        // 设置提示类型
        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50';
        
        if (type === 'error') {
            toast.classList.add('bg-red-500', 'text-white');
        } else if (type === 'success') {
            toast.classList.add('bg-green-500', 'text-white');
        } else if (type === 'warning') {
            toast.classList.add('bg-yellow-500', 'text-white');
        } else {
            toast.classList.add('bg-blue-500', 'text-white');
        }
        
        // 显示提示
        toast.classList.remove('opacity-0', '-translate-y-full');
        toast.classList.add('opacity-100', 'translate-y-0');
        
        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-y-0');
            toast.classList.add('opacity-0', '-translate-y-full');
        }, 3000);
    }
}

// 显示加载中
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('hidden');
        loading.classList.add('flex');
    }
}

// 隐藏加载中
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('flex');
        loading.classList.add('hidden');
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 确保密码验证完成后再加载数据
    if (localStorage.getItem('passwordVerified') === 'true') {
        // 显示客户站点列表
        displayCustomerSites();
    } else {
        // 监听密码验证事件
        document.addEventListener('passwordVerified', () => {
            // 显示客户站点列表
            displayCustomerSites();
        });
    }
    
    // 监听设置面板打开事件
    document.addEventListener('settingsPanelOpened', () => {
        // 显示客户站点列表
        displayCustomerSites();
    });
});

// 导出函数
window.showAddCustomerSiteForm = showAddCustomerSiteForm;
window.cancelAddCustomerSite = cancelAddCustomerSite;
window.handleAddCustomerSite = handleAddCustomerSite;
window.displayCustomerSites = displayCustomerSites;
