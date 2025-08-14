// MongoDB连接和操作工具
import { MongoClient } from 'mongodb';

// 从环境变量获取MongoDB连接字符串
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'libretv';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME || 'customer_sites';

let client = null;
let db = null;
let collection = null;

/**
 * 连接到MongoDB数据库
 * @returns {Promise<Object>} 包含client, db和collection的对象
 */
export async function connectToMongoDB() {
    if (client && client.topology && client.topology.isConnected()) {
        return { client, db, collection };
    }

    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        collection = db.collection(COLLECTION_NAME);
        console.log('成功连接到MongoDB数据库');
        return { client, db, collection };
    } catch (error) {
        console.error('MongoDB连接错误:', error);
        throw error;
    }
}

/**
 * 获取所有客户站点
 * @returns {Promise<Array>} 客户站点数组
 */
export async function getAllCustomerSites() {
    try {
        const { collection } = await connectToMongoDB();
        const sites = await collection.find({}).toArray();
        return sites;
    } catch (error) {
        console.error('获取客户站点失败:', error);
        return [];
    }
}

/**
 * 获取单个客户站点
 * @param {string} siteId 站点ID
 * @returns {Promise<Object|null>} 客户站点对象或null
 */
export async function getCustomerSite(siteId) {
    try {
        const { collection } = await connectToMongoDB();
        return await collection.findOne({ _id: siteId });
    } catch (error) {
        console.error(`获取客户站点 ${siteId} 失败:`, error);
        return null;
    }
}

/**
 * 添加或更新客户站点
 * @param {string} siteId 站点ID
 * @param {Object} siteData 站点数据
 * @returns {Promise<boolean>} 操作是否成功
 */
export async function upsertCustomerSite(siteId, siteData) {
    try {
        const { collection } = await connectToMongoDB();
        const result = await collection.updateOne(
            { _id: siteId },
            { $set: { ...siteData, _id: siteId } },
            { upsert: true }
        );
        return result.acknowledged;
    } catch (error) {
        console.error(`添加/更新客户站点 ${siteId} 失败:`, error);
        return false;
    }
}

/**
 * 删除客户站点
 * @param {string} siteId 站点ID
 * @returns {Promise<boolean>} 操作是否成功
 */
export async function deleteCustomerSite(siteId) {
    try {
        const { collection } = await connectToMongoDB();
        const result = await collection.deleteOne({ _id: siteId });
        return result.deletedCount > 0;
    } catch (error) {
        console.error(`删除客户站点 ${siteId} 失败:`, error);
        return false;
    }
}

/**
 * 关闭MongoDB连接
 */
export async function closeMongoDB() {
    if (client) {
        await client.close();
        console.log('MongoDB连接已关闭');
    }
}